/**
 * Simulation manager — coordinates active vs lightweight simulation.
 *
 * Phase 1 scope:
 * - Active simulation: villagers near any player (schedule evaluation)
 * - Lightweight: identity remains in world data, no per-tick work
 * - Background civilization simulation: reserved for later phases
 *
 * Performance rules:
 * - Never scan the whole world every tick
 * - Only operate on entities returned by bounded getEntities queries
 * - Persist world data on a slow cadence
 */

import { system, world } from "@minecraft/server";
import {
  SIMULATION_INTERVAL_TICKS,
  SCHEDULE_INTERVAL_TICKS,
  ACTIVE_SIMULATION_RADIUS
} from "../core/constants.js";
import { Logger } from "../core/logger.js";
import { saveWorldData, getWorldData, ensureVillage, markDirty } from "../core/data-store.js";
import { getManagedNear, tryAdoptEntity } from "../villagers/villager-manager.js";
import { evaluateMany } from "../schedules/schedule-manager.js";
import { getAllVillagers } from "../villagers/villager-registry.js";
import { refreshVillageStats } from "./village-data.js";

const DEFAULT_VILLAGE_ID = "main";

let initialized = false;
let tickCounter = 0;

/**
 * Starts the simulation loops. Safe to call once.
 */
export function startSimulation() {
  if (initialized) return;
  initialized = true;

  // Ensure a default village exists
  ensureVillage(DEFAULT_VILLAGE_ID, { name: "Home Village" });

  system.runInterval(() => {
    tickCounter++;
    onSimulationTick();
  }, SIMULATION_INTERVAL_TICKS);

  system.runInterval(() => {
    onScheduleTick();
  }, SCHEDULE_INTERVAL_TICKS);

  // Persist every ~30 seconds
  system.runInterval(() => {
    refreshDefaultVillageStats();
    saveWorldData();
  }, 600);

  Logger.info("Simulation manager started.");
}

/**
 * Periodic active-set maintenance.
 * Currently lightweight — reserved for future movement / need systems.
 */
function onSimulationTick() {
  // Intentionally minimal in Phase 1.
  // Future: path goals, needs decay, interaction queues.
}

/**
 * Evaluates schedules for villagers currently near players.
 */
function onScheduleTick() {
  const players = world.getAllPlayers();
  if (players.length === 0) return;

  /** @type {import("../villagers/villager-identity.js").VillagerRecord[]} */
  const activeRecords = [];
  const seen = new Set();

  for (const player of players) {
    const managed = getManagedNear(
      player.dimension,
      player.location,
      ACTIVE_SIMULATION_RADIUS
    );
    for (const { record } of managed) {
      if (!seen.has(record.id)) {
        seen.add(record.id);
        activeRecords.push(record);
      }
    }
  }

  if (activeRecords.length > 0) {
    evaluateMany(activeRecords);
  }
}

/**
 * Refreshes aggregate stats for the default village from all registered villagers.
 */
function refreshDefaultVillageStats() {
  const data = getWorldData();
  const village = data.villages[DEFAULT_VILLAGE_ID];
  if (!village) return;
  const villagers = getAllVillagers();
  refreshVillageStats(DEFAULT_VILLAGE_ID, villagers, village);
  markDirty();
}

/**
 * Entity load / spawn hook — keeps tags and links consistent.
 * @param {import("@minecraft/server").Entity} entity
 */
export function onEntityAvailable(entity) {
  tryAdoptEntity(entity);
}

/**
 * Returns a snapshot useful for debug commands.
 */
export function getSimulationSnapshot() {
  const data = getWorldData();
  return {
    population: Object.keys(data.villagers).length,
    households: Object.keys(data.households).length,
    villages: Object.keys(data.villages).length,
    defaultVillage: data.villages[DEFAULT_VILLAGE_ID] ?? null
  };
}
