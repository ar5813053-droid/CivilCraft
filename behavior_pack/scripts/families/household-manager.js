/**
 * Household / family foundation.
 *
 * Phase 1 only establishes the data model and basic membership.
 * Reproduction, marriage, and inheritance are intentionally out of scope.
 */

import { getWorldData, markDirty } from "../core/data-store.js";
import { generateId } from "../core/utils.js";
import { Logger } from "../core/logger.js";
import { patchVillager, getVillager } from "../villagers/villager-registry.js";

/**
 * @typedef {Object} HouseholdRecord
 * @property {string} id
 * @property {string} name
 * @property {string[]} memberIds
 * @property {import("../villagers/villager-identity.js").LocationRef|null} home
 * @property {number} createdAt
 */

/**
 * Creates a new household and optionally assigns members.
 * @param {object} [options]
 * @param {string} [options.name]
 * @param {string[]} [options.memberIds]
 * @param {import("../villagers/villager-identity.js").LocationRef|null} [options.home]
 * @returns {HouseholdRecord}
 */
export function createHousehold(options = {}) {
  const data = getWorldData();
  const id = generateId("hh");
  /** @type {HouseholdRecord} */
  const household = {
    id,
    name: options.name ?? `Household ${id.slice(-6)}`,
    memberIds: [],
    home: options.home ?? null,
    createdAt: Date.now()
  };

  data.households[id] = household;

  if (Array.isArray(options.memberIds)) {
    for (const memberId of options.memberIds) {
      addMember(id, memberId);
    }
  }

  markDirty();
  Logger.info(`Created household ${household.name} (${id})`);
  return household;
}

/**
 * @param {string} householdId
 * @returns {HouseholdRecord|undefined}
 */
export function getHousehold(householdId) {
  return getWorldData().households[householdId];
}

/**
 * Adds a villager to a household (updates both sides).
 * @param {string} householdId
 * @param {string} villagerId
 * @returns {boolean}
 */
export function addMember(householdId, villagerId) {
  const data = getWorldData();
  const household = data.households[householdId];
  const villager = data.villagers[villagerId];
  if (!household || !villager) return false;

  if (!household.memberIds.includes(villagerId)) {
    household.memberIds.push(villagerId);
  }

  // Leave previous household if any
  if (villager.householdId && villager.householdId !== householdId) {
    removeMember(villager.householdId, villagerId);
  }

  patchVillager(villagerId, {
    householdId,
    home: household.home ?? villager.home
  });

  markDirty();
  return true;
}

/**
 * Removes a villager from a household.
 * @param {string} householdId
 * @param {string} villagerId
 * @returns {boolean}
 */
export function removeMember(householdId, villagerId) {
  const data = getWorldData();
  const household = data.households[householdId];
  if (!household) return false;

  const idx = household.memberIds.indexOf(villagerId);
  if (idx >= 0) {
    household.memberIds.splice(idx, 1);
  }

  const villager = getVillager(villagerId);
  if (villager && villager.householdId === householdId) {
    patchVillager(villagerId, { householdId: null });
  }

  markDirty();
  return true;
}

/**
 * Returns member records for a household.
 * @param {string} householdId
 * @returns {import("../villagers/villager-identity.js").VillagerRecord[]}
 */
export function getMembers(householdId) {
  const household = getHousehold(householdId);
  if (!household) return [];
  return household.memberIds
    .map((id) => getVillager(id))
    .filter(Boolean);
}

/**
 * Sets the shared home location for a household and its members.
 * @param {string} householdId
 * @param {import("../villagers/villager-identity.js").LocationRef|null} home
 */
export function setHouseholdHome(householdId, home) {
  const household = getHousehold(householdId);
  if (!household) return;
  household.home = home;
  for (const memberId of household.memberIds) {
    patchVillager(memberId, { home });
  }
  markDirty();
}
