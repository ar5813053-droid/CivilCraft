/**
 * Daily-life scheduler. Activity is simulation state, not movement.
 */

import { system, world } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { dayTimeToHour } from "../core/utils.js";
import { createDefaultDailyLife, normalizeDailyLife } from "./daily-life-data.js";
import { ensureState, applyDecision, canShop } from "./citizen-state.js";
import { tickNeeds, happinessScore, stressScore } from "./needs.js";
import { pushDailyEvent } from "./daily-life-events.js";
import { dailyStats } from "./daily-life-stats.js";

export const DAILY_INTERVAL_TICKS = 600;
const BATCH = 40;
let initialized = false;

export function initializeDailyLife() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.dailyLife = data.dailyLife ? normalizeDailyLife(data.dailyLife) : createDefaultDailyLife();
  system.runInterval(() => {
    try {
      evaluateBatch(data);
      markDirty();
    } catch (e) {
      Logger.error("Daily life tick failed", e);
    }
  }, DAILY_INTERVAL_TICKS);
  Logger.info("Daily life manager initialized.");
}

export function getDailyLife() {
  const data = getWorldData();
  if (!data.dailyLife) data.dailyLife = createDefaultDailyLife();
  return data.dailyLife;
}

export function currentHour() {
  try {
    return dayTimeToHour(world.getTimeOfDay());
  } catch {
    return 8;
  }
}

function evaluateBatch(data) {
  const ids = Object.keys(data.villagers || {});
  if (!ids.length) return;
  const store = data.dailyLife;
  const hour = currentHour();
  const day = Math.floor(Date.now() / 86400000);
  if (store.day !== day) {
    store.day = day;
    store.cooldowns = {};
    pushDailyEvent(store, "daily_reset", String(day));
  }
  const start = store.cursor % ids.length;
  for (let i = 0; i < Math.min(BATCH, ids.length); i++) {
    const villager = data.villagers[ids[(start + i) % ids.length]];
    if (!villager || villager.alive === false) continue;
    const state = ensureState(store, villager.id);
    state.needs = tickNeeds(state.needs, state.activity);
    const household = (data.population?.households || []).find((h) => h.memberIds?.includes(villager.id));
    applyDecision(state, {
      health: state.needs.health,
      hunger: state.needs.hunger,
      energy: state.needs.energy,
      social: state.needs.social,
      houseId: household?.houseId || null,
      workScheduled: hour >= 8 && hour < 17 && villager.profession && villager.profession !== "citizen",
      schoolScheduled: hour >= 8 && hour < 16 && (villager.lifeStage === "child" || villager.lifeStage === "teenager"),
      jobId: villager.profession,
      unemployed: !villager.profession || villager.profession === "citizen",
      workingAge: villager.lifeStage === "adult" || villager.lifeStage === "young_adult",
      hour,
      clinicId: "central_clinic",
      schoolId: "central_school"
    });
    if (state.activity === "shopping" && canShop(state, day)) state.shoppingDay = day;
    state.happiness = happinessScore(state.needs, state.happiness);
    state.stress = stressScore({
      unemployed: !villager.profession || villager.profession === "citizen",
      homeless: !household?.houseId,
      hunger: state.needs.hunger,
      health: state.needs.health
    }, state.stress);
  }
  store.cursor = (start + BATCH) % ids.length;
}

export function formatDailyLines(villagerId) {
  const store = getDailyLife();
  if (!villagerId) {
    const stats = dailyStats(store);
    return [`§6Daily life§r citizens ${stats.citizens}`, `Happiness ${stats.averageHappiness}`];
  }
  const state = store.states.find((s) => s.villagerId === villagerId);
  if (!state) return ["§cNo daily state"];
  return [`${state.activity}`, `hunger ${state.needs.hunger} energy ${state.needs.energy}`, `happy ${state.happiness} stress ${state.stress}`];
}
