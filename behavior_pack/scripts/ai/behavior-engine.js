import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { generatePersonality } from "./personality-data.js";

let initialized = false;
export const AI_INTERVAL = 2400;
const BATCH = 30;

export function createDefaultAi() {
  return { personalities: {}, goals: {}, cursor: 0, stats: { evaluated: 0 } };
}

export function normalizeAi(raw) {
  const base = createDefaultAi();
  if (!raw || typeof raw !== "object") return base;
  return {
    personalities: raw.personalities && typeof raw.personalities === "object" ? raw.personalities : {},
    goals: raw.goals && typeof raw.goals === "object" ? raw.goals : {},
    cursor: Math.max(0, Math.floor(raw.cursor || 0)),
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}

export function initializeAi() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.ai = data.ai ? normalizeAi(data.ai) : createDefaultAi();
  system.runInterval(() => {
    try {
      evaluateBatch(data);
    } catch (e) {
      Logger.error("AI tick failed", e);
    }
  }, AI_INTERVAL);
  Logger.info("Citizen AI behavior engine initialized.");
}

export function getAiStore() {
  const data = getWorldData();
  if (!data.ai) data.ai = createDefaultAi();
  return data.ai;
}

export function ensurePersonality(store, citizenId) {
  if (!store.personalities[citizenId]) {
    store.personalities[citizenId] = generatePersonality(citizenId);
  }
  return store.personalities[citizenId];
}

export function primaryGoal(personality, context = {}) {
  if ((context.hunger ?? 100) < 30) return "find_food";
  if ((context.health ?? 100) < 40) return "maintain_health";
  if (context.unemployed) return "find_job";
  if ((personality.ambition || 50) > 70 && (context.money ?? 0) < 30) return "earn_money";
  if ((personality.politicalEngagement || 0) > 75) return "political_activity";
  if ((personality.communityParticipation || 0) > 70) return "help_community";
  if ((personality.financialCaution || 50) > 70) return "save_money";
  return "maintain_routine";
}

function evaluateBatch(data) {
  const store = data.ai;
  const ids = Object.keys(data.villagers || {});
  if (!ids.length) return;
  const start = store.cursor % ids.length;
  for (let i = 0; i < Math.min(BATCH, ids.length); i++) {
    const id = ids[(start + i) % ids.length];
    const p = ensurePersonality(store, id);
    const v = data.villagers[id];
    const unemployed = !(data.employment?.records || []).find(
      (r) => r.villagerId === id && r.status === "employed"
    );
    store.goals[id] = primaryGoal(p, {
      unemployed,
      money: v?.money ?? 50,
      health: v?.health ?? 80,
      hunger: data.dailyLife?.states?.[id]?.needs?.hunger ?? 70
    });
    store.stats.evaluated = (store.stats.evaluated || 0) + 1;
  }
  store.cursor = (start + BATCH) % ids.length;
  markDirty();
}
