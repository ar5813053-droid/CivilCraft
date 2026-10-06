import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultCitizenAi, normalizeCitizenAi, emptyProfile } from "./citizen-ai-data.js";
import { generatePersonality } from "./personality.js";
import { derivePreferences, getPoliticalParticipationScore } from "./preferences.js";
import { generateGoals, advanceGoalProgress } from "./goals.js";
import { pickActivity, getBehaviorModifier } from "./decision-engine.js";
import { getCitizenMemories } from "../memory/citizen-memory.js";
import { publish } from "../events/event-bus.js";
import { getEmploymentStore } from "../employment/employment-manager.js";
import { getRecord } from "../employment/hiring.js";

let initialized = false;
export const CITIZEN_AI_INTERVAL = 2400;
const BATCH = 30;

export function initializeCitizenAi() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.citizenAi = data.citizenAi ? normalizeCitizenAi(data.citizenAi) : createDefaultCitizenAi();
  system.runInterval(() => {
    try {
      evaluateBatch(data);
    } catch (e) {
      Logger.error("Citizen AI tick failed", e);
    }
  }, CITIZEN_AI_INTERVAL);
  Logger.info("Citizen AI manager initialized.");
}

export function getCitizenAiStore() {
  const data = getWorldData();
  if (!data.citizenAi) data.citizenAi = createDefaultCitizenAi();
  return data.citizenAi;
}

export function ensureCitizenProfile(citizenId) {
  const store = getCitizenAiStore();
  if (!store.byId[citizenId]) {
    store.byId[citizenId] = emptyProfile();
    store.stats.personalities = (store.stats.personalities || 0) + 1;
  }
  const prof = store.byId[citizenId];
  if (!prof.personality) {
    prof.personality = generatePersonality(citizenId);
    prof.preferences = derivePreferences(prof.personality);
  }
  return prof;
}

export function getPersonality(citizenId) {
  return ensureCitizenProfile(citizenId).personality;
}

export function getGoals(citizenId) {
  return ensureCitizenProfile(citizenId).goals || [];
}

export function getPoliticalScore(citizenId) {
  return getPoliticalParticipationScore(getPersonality(citizenId));
}

/**
 * Daily Life integration: behaviour modifier for activity type.
 */
export function getBehaviorModifierFor(citizenId, activityType) {
  const prof = ensureCitizenProfile(citizenId);
  const mems = getCitizenMemories(citizenId).slice(-5);
  return getBehaviorModifier(prof.personality, prof.goals, activityType, mems);
}

/**
 * Enhanced activity choice for Daily Life (optional path).
 */
export function chooseActivityWithPersonality(citizenId, input) {
  const prof = ensureCitizenProfile(citizenId);
  const mems = getCitizenMemories(citizenId).slice(-5);
  const result = pickActivity(input, prof.personality, prof.goals, mems);
  prof.lastDecision = { activity: result.activity, day: Math.floor(Date.now() / 86400000) };
  return result.activity;
}

function evaluateBatch(data) {
  const store = data.citizenAi;
  const ids = Object.keys(data.villagers || {});
  if (!ids.length) return;
  const day = Math.floor(Date.now() / 86400000);
  const start = store.cursor % ids.length;
  const empStore = getEmploymentStore();

  for (let i = 0; i < Math.min(BATCH, ids.length); i++) {
    const id = ids[(start + i) % ids.length];
    const v = data.villagers[id];
    if (!v || v.alive === false) continue;
    const prof = ensureCitizenProfile(id);
    const emp = getRecord(empStore, id);
    const unemployed = !emp || emp.status !== "employed";
    const household = (data.population?.households || []).find((h) => h.memberIds?.includes(id));
    const context = {
      unemployed,
      employed: !unemployed,
      workingAge: (v.age ?? 30) >= 18 && (v.age ?? 30) < 70,
      health: v.health ?? 80,
      money: v.money ?? 50,
      age: v.age ?? 30,
      educationLevel: v.educationLevel || "none",
      homeless: !household?.houseId
    };
    // Refresh goals at most once per day
    if (prof.lastGoalDay !== day) {
      const prev = (prof.goals || []).map((g) => g.type).join(",");
      prof.goals = generateGoals(context, prof.personality);
      prof.lastGoalDay = day;
      store.stats.goalsGenerated = (store.stats.goalsGenerated || 0) + 1;
      const next = prof.goals.map((g) => g.type).join(",");
      if (next !== prev && prof.goals[0]) {
        publish("CITIZEN_GOAL_CREATED", {
          source: "citizenai",
          actorId: id,
          metadata: { goalType: prof.goals[0].type }
        });
      }
    }
  }
  store.cursor = (start + BATCH) % ids.length;
  markDirty();
}

export { generatePersonality, derivePreferences, generateGoals, pickActivity, getBehaviorModifier, advanceGoalProgress };
