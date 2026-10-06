import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultCivilization, normalizeCivilization } from "./civilization-data.js";
import { computeCivilizationStats, computeCivilizationScore } from "./civilization-score.js";
import { detectWorldEvents } from "./world-events.js";

export const CIVILIZATION_INTERVAL_TICKS = 2400;
let initialized = false;

export function initializeCivilization() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.civilization = data.civilization
    ? normalizeCivilization(data.civilization)
    : createDefaultCivilization();
  system.runInterval(() => {
    try {
      tickCivilization(data);
    } catch (e) {
      Logger.error("Civilization tick failed", e);
    }
  }, CIVILIZATION_INTERVAL_TICKS);
  Logger.info("Civilization manager initialized.");
}

export function getCivilizationStore() {
  const data = getWorldData();
  if (!data.civilization) data.civilization = createDefaultCivilization();
  return data.civilization;
}

export function tickCivilization(data) {
  const store = data.civilization;
  if (!store) return;
  const day = Math.floor(Date.now() / 86400000);
  const stats = computeCivilizationStats(data);
  store.stats = stats;
  store.score = computeCivilizationScore(stats);
  detectWorldEvents(store, stats, data.social, day);
  store.lastComputedDay = day;
  markDirty();
}

export function formatCivilizationLines() {
  const store = getCivilizationStore();
  const s = store.stats;
  return [
    `§6Civilization§r score ${store.score}`,
    `pop ${s.population} emp ${s.employment}% unemp ${s.unemployment}%`,
    `food ${s.foodAvailability} util ${s.utilityQuality} approval ${s.governmentApproval}`,
    `events ${store.events.length}`
  ];
}
