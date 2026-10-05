/**
 * Persistent world-level data store for CivilCraft.
 *
 * Uses world dynamic properties to keep a single JSON blob.
 * Designed to stay small in Phase 1; later phases can shard data.
 *
 * Do not store per-entity heavy data here — only registries,
 * village summaries, and ID maps.
 */

import { world } from "@minecraft/server";
import { WORLD_DATA_KEY } from "./constants.js";
import { Logger } from "./logger.js";
import { safeJsonParse } from "./utils.js";

/** @typedef {import("../simulation/village-data.js").VillageData} VillageData */

/**
 * @typedef {Object} WorldData
 * @property {number} version
 * @property {Record<string, object>} villagers  // id -> VillagerRecord (lightweight)
 * @property {Record<string, object>} households // id -> HouseholdRecord
 * @property {Record<string, VillageData>} villages
 * @property {string[]} managedEntityIds       // optional cache of known entity ids
 * @property {object|null} economy               // Phase 2 economy blob
 * @property {object|null} government            // Phase 3 government store
 * @property {object|null} justice               // Phase 4 laws and justice
 * @property {object|null} police                // Phase 5 police
 * @property {object|null} emergency             // Phase 5 emergency
 * @property {object|null} healthcare            // Phase 6 healthcare
 * @property {object|null} education             // Phase 6 education
 * @property {object|null} settlements           // Phase 7 settlements
 * @property {object|null} infrastructure        // Phase 7 infrastructure
 * @property {object|null} housing               // Phase 8 housing
 * @property {object|null} population            // Phase 8 population
 */

const DEFAULT_WORLD_DATA = () => ({
  version: 8,
  villagers: {},
  households: {},
  villages: {},
  managedEntityIds: [],
  economy: null,
  government: null,
  justice: null,
  police: null,
  emergency: null,
  healthcare: null,
  education: null,
  settlements: null,
  infrastructure: null,
  housing: null,
  population: null
});

let cache = null;
let dirty = false;

/**
 * Loads world data from dynamic property (or creates default).
 * @returns {WorldData}
 */
export function loadWorldData() {
  if (cache) return cache;

  try {
    const raw = world.getDynamicProperty(WORLD_DATA_KEY);
    if (typeof raw === "string" && raw.length > 0) {
      const parsed = safeJsonParse(raw, null);
      if (parsed && typeof parsed === "object" && parsed.version) {
        cache = {
          version: parsed.version ?? 8,
          villagers: parsed.villagers ?? {},
          households: parsed.households ?? {},
          villages: parsed.villages ?? {},
          managedEntityIds: Array.isArray(parsed.managedEntityIds)
            ? parsed.managedEntityIds
            : [],
          economy: parsed.economy ?? null,
          government: parsed.government ?? null,
          justice: parsed.justice ?? null,
          police: parsed.police ?? null,
          emergency: parsed.emergency ?? null,
          healthcare: parsed.healthcare ?? null,
          education: parsed.education ?? null,
          settlements: parsed.settlements ?? null,
          infrastructure: parsed.infrastructure ?? null,
          housing: parsed.housing ?? null,
          population: parsed.population ?? null
        };
        Logger.debug("World data loaded from dynamic property.");
        return cache;
      }
    }
  } catch (e) {
    Logger.warn("Failed to load world data, using defaults.", e);
  }

  cache = DEFAULT_WORLD_DATA();
  dirty = true;
  return cache;
}

/**
 * Marks the in-memory cache as needing persistence.
 */
export function markDirty() {
  dirty = true;
}

/**
 * Writes the cache to the world dynamic property if dirty.
 * Call on sensible intervals or on important events.
 */
export function saveWorldData() {
  if (!dirty || !cache) return;

  try {
    const serialized = JSON.stringify(cache);
    // Dynamic property string limit is generous but not infinite;
    // Phase 1 keeps data deliberately small.
    world.setDynamicProperty(WORLD_DATA_KEY, serialized);
    dirty = false;
    Logger.debug("World data saved.");
  } catch (e) {
    Logger.error("Failed to save world data.", e);
  }
}

/**
 * Returns the live cache (loads if needed).
 * @returns {WorldData}
 */
export function getWorldData() {
  return loadWorldData();
}

/**
 * Convenience: get or create a village entry.
 * @param {string} villageId
 * @param {Partial<VillageData>} [seed]
 * @returns {VillageData}
 */
export function ensureVillage(villageId, seed = {}) {
  const data = getWorldData();
  if (!data.villages[villageId]) {
    data.villages[villageId] = {
      id: villageId,
      name: seed.name ?? "Unnamed Village",
      population: 0,
      jobCounts: {},
      houseCount: 0,
      workplaceCount: 0,
      averageHappiness: 50,
      createdAt: Date.now(),
      ...seed
    };
    markDirty();
  }
  return data.villages[villageId];
}
