/**
 * Registry of managed villager identities.
 * Owns the mapping between CivilCraft IDs and world-data records.
 */

import { getWorldData, markDirty } from "../core/data-store.js";
import { createVillagerRecord, updateVillagerRecord } from "./villager-identity.js";
import { Logger } from "../core/logger.js";

/**
 * @typedef {import("./villager-identity.js").VillagerRecord} VillagerRecord
 */

/**
 * Returns all registered villager records.
 * @returns {VillagerRecord[]}
 */
export function getAllVillagers() {
  const data = getWorldData();
  return Object.values(data.villagers);
}

/**
 * Looks up a villager by CivilCraft ID.
 * @param {string} id
 * @returns {VillagerRecord|undefined}
 */
export function getVillager(id) {
  return getWorldData().villagers[id];
}

/**
 * Registers a new villager identity.
 * @param {Partial<VillagerRecord>} [overrides]
 * @returns {VillagerRecord}
 */
export function registerVillager(overrides = {}) {
  const record = createVillagerRecord(overrides);
  const data = getWorldData();
  data.villagers[record.id] = record;
  markDirty();
  Logger.info(`Registered villager ${record.name} (${record.id})`);
  return record;
}

/**
 * Updates an existing villager record.
 * @param {string} id
 * @param {Partial<VillagerRecord>} patch
 * @returns {VillagerRecord|null}
 */
export function patchVillager(id, patch) {
  const data = getWorldData();
  const existing = data.villagers[id];
  if (!existing) {
    Logger.warn(`Attempted to patch unknown villager ${id}`);
    return null;
  }
  updateVillagerRecord(existing, patch);
  markDirty();
  return existing;
}

/**
 * Removes a villager identity from the registry.
 * Does not despawn the entity.
 * @param {string} id
 * @returns {boolean}
 */
export function unregisterVillager(id) {
  const data = getWorldData();
  if (!data.villagers[id]) return false;
  delete data.villagers[id];
  markDirty();
  Logger.info(`Unregistered villager ${id}`);
  return true;
}

/**
 * Finds a villager record by last-known entity id (runtime only).
 * @param {string} entityId
 * @returns {VillagerRecord|undefined}
 */
export function findByEntityId(entityId) {
  const data = getWorldData();
  return Object.values(data.villagers).find((v) => v.entityId === entityId);
}

/**
 * Returns population count.
 * @returns {number}
 */
export function getPopulation() {
  return Object.keys(getWorldData().villagers).length;
}
