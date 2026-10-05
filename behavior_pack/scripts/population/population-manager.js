/**
 * Population orchestrator. Simulated citizens are records, not entities.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { generateId } from "../core/utils.js";
import { getAllVillagers } from "../villagers/villager-registry.js";
import { createDefaultPopulation, normalizePopulation, lifeStage, MAX_SIMULATED } from "./population-data.js";
import { ensureDemographics } from "./demographics.js";
import { pushPopulationEvent } from "./population-events.js";
import { populationStats } from "./population-stats.js";
import { capacityFromHousing } from "../housing/housing-capacity.js";

export const POPULATION_INTERVAL_TICKS = 3600;
const BATCH = 40;
let initialized = false;

export function initializePopulation() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.population = data.population ? normalizePopulation(data.population) : createDefaultPopulation();
  for (const villager of Object.values(data.villagers || {})) ensureDemographics(villager);
  system.runInterval(() => {
    try {
      tickDemographics(data);
      syncSettlementPopulation(data);
      markDirty();
    } catch (e) {
      Logger.error("Population tick failed", e);
    }
  }, POPULATION_INTERVAL_TICKS);
  Logger.info("Population manager initialized.");
}

export function getPopulationStore() {
  const data = getWorldData();
  if (!data.population) data.population = createDefaultPopulation();
  return data.population;
}

export function createVillagerProfile(input = {}) {
  const data = getWorldData();
  const ids = Object.keys(data.villagers || {});
  if (ids.length >= MAX_SIMULATED) return { ok: false, error: "population_cap" };
  const id = input.id || generateId("sim");
  if (data.villagers[id]) return { ok: false, error: "duplicate_id" };
  const age = Math.max(0, Math.floor(input.age ?? 0));
  data.villagers[id] = {
    id,
    name: input.name || "Citizen",
    age,
    lifeStage: lifeStage(age),
    profession: "citizen",
    money: 0,
    inventory: {},
    settlementId: input.settlementId || "settlement_main",
    alive: true,
    simulated: true,
    householdId: input.householdId || null
  };
  data.population.counters.births += 1;
  pushPopulationEvent(data.population, "birth", id);
  markDirty();
  return { ok: true, villager: data.villagers[id] };
}

export function recordDeath(villagerId, reason = "unknown") {
  const data = getWorldData();
  const villager = data.villagers?.[villagerId];
  if (!villager) return { ok: false, error: "missing_villager" };
  villager.alive = false;
  villager.deathReason = reason;
  data.population.deaths.push({ villagerId, reason, timestamp: Date.now() });
  data.population.counters.deaths += 1;
  pushPopulationEvent(data.population, "death", villagerId);
  markDirty();
  return { ok: true };
}

function tickDemographics(data) {
  const ids = Object.keys(data.villagers || {});
  if (ids.length === 0) return;
  const start = data.population.cursor % ids.length;
  for (let i = 0; i < Math.min(BATCH, ids.length); i++) {
    const villager = data.villagers[ids[(start + i) % ids.length]];
    if (!villager || villager.alive === false) continue;
    ensureDemographics(villager);
    villager.lifeStage = lifeStage(villager.age);
  }
  data.population.cursor = (start + BATCH) % ids.length;
}

function syncSettlementPopulation(data) {
  const settlement = data.settlements?.settlements?.find((s) => s.id === "settlement_main");
  if (!settlement) return;
  const alive = Object.values(data.villagers || {}).filter((v) => v.alive !== false).length;
  settlement.population = alive;
  const housingCapacity = (data.housing?.houses || []).reduce((s, h) => s + (h.capacity || 0), 0);
  settlement.capacity = capacityFromHousing(settlement.capacity, housingCapacity);
}

export function formatPopulationLines() {
  const data = getWorldData();
  const stats = populationStats(Object.values(data.villagers || {}), data.population);
  return [`§6Population§r ${stats.total}`, `Households ${stats.households} homeless ${stats.homeless}`, `Births ${stats.births} deaths ${stats.deaths}`];
}

export { getAllVillagers };
