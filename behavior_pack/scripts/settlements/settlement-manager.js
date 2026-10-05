/**
 * Settlement orchestrator. Interval stats only.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { getPopulation } from "../villagers/villager-registry.js";
import {
  createDefaultSettlements,
  normalizeSettlements,
  createSettlement,
  MAX_SETTLEMENTS
} from "./settlement-data.js";
import { typeForPopulation, baselineCapacity } from "./settlement-types.js";
import { prosperityScore, developmentScore } from "./settlement-growth.js";
import { buildStats, metricsFromStats } from "./settlement-stats.js";
import { pushSettlementEvent } from "./settlement-events.js";
import { coverageScore } from "../infrastructure/infrastructure-stats.js";

export const SETTLEMENT_INTERVAL_TICKS = 1200;
let initialized = false;

export function initializeSettlements() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.settlements = data.settlements ? normalizeSettlements(data.settlements) : createDefaultSettlements();
  migrateMainSettlement(data);
  system.runInterval(() => {
    try {
      evaluateGrowth(getSettlement("settlement_main"));
      markDirty();
    } catch (e) {
      Logger.error("Settlement tick failed", e);
    }
  }, SETTLEMENT_INTERVAL_TICKS);
  Logger.info("Settlement manager initialized.");
}

export function getSettlementStore() {
  const data = getWorldData();
  if (!data.settlements) data.settlements = createDefaultSettlements();
  return data.settlements;
}

export function getSettlement(id) {
  return getSettlementStore().settlements.find((s) => s.id === id);
}

export function migrateMainSettlement(data) {
  const store = data.settlements;
  if (store.settlements.some((s) => s.id === "settlement_main")) return store.settlements[0];
  const village = data.villages?.village_main || Object.values(data.villages || {})[0];
  const settlement = createSettlement({
    id: "settlement_main",
    name: village?.name || "Main Settlement",
    population: village?.population || 0,
    governmentId: data.government?.primaryId || "municipal_main",
    facilityIds: ["central_station", "central_clinic", "central_school"]
  });
  store.settlements.push(settlement);
  if (store.settlements.length > MAX_SETTLEMENTS) store.settlements = store.settlements.slice(-MAX_SETTLEMENTS);
  pushSettlementEvent(store, "settlement_created", settlement.id);
  markDirty();
  return settlement;
}

export function evaluateGrowth(settlement) {
  if (!settlement) return null;
  const data = getWorldData();
  const infra = data.infrastructure;
  const stats = buildStats({
    population: getPopulation() || settlement.population,
    employed: Math.floor((getPopulation() || 0) * 0.7),
    averageWealth: data.economy?.totals?.averageWealth || 20,
    economicActivity: data.economy?.totals?.transactionCount || 0,
    food: 10,
    averageHealth: data.healthcare?.stats?.quality || 50,
    educationQuality: data.education?.stats?.quality || 50,
    publicSafety: data.police ? 60 : 40,
    infrastructureCoverage: coverageScore(infra, settlement.id),
    approval: data.government?.governments?.[settlement.governmentId]?.approval || 50,
    prosperity: settlement.prosperity,
    developmentLevel: settlement.developmentLevel
  });
  const metrics = metricsFromStats(stats);
  const previousType = settlement.type;
  settlement.population = stats.population;
  settlement.type = typeForPopulation(stats.population, settlement.type);
  settlement.capacity = baselineCapacity(settlement.type) + (infra?.records?.length || 0) * 2;
  settlement.prosperity = prosperityScore(metrics, settlement.prosperity);
  settlement.developmentLevel = developmentScore(metrics, settlement.developmentLevel);
  settlement.updatedAt = Date.now();
  if (settlement.type !== previousType) {
    pushSettlementEvent(data.settlements, "settlement_upgraded", `${previousType}->${settlement.type}`);
  }
  return stats;
}

export function formatSettlementLines(id = "settlement_main") {
  const settlement = getSettlement(id);
  if (!settlement) return ["§cNo settlement"];
  return [
    `§6${settlement.name}§r ${settlement.type}`,
    `Pop ${settlement.population}/${settlement.capacity}`,
    `Prosperity ${settlement.prosperity}  Dev ${settlement.developmentLevel}`
  ];
}
