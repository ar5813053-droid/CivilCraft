/**
 * Villager identity model and factory.
 *
 * Persistent identity is stored in the world data store, not on the entity.
 * The entity only holds a lightweight link (dynamic property + tag).
 */

import { generateId, clamp } from "../core/utils.js";
import { DEFAULT_JOB_ID } from "../core/constants.js";

/**
 * @typedef {Object} LocationRef
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string} [dimensionId]
 */

/**
 * @typedef {Object} VillagerRecord
 * @property {string} id
 * @property {string} name
 * @property {number} age            // years, approximate
 * @property {string} profession     // job id
 * @property {string|null} householdId
 * @property {LocationRef|null} home
 * @property {LocationRef|null} workplace
 * @property {number} money
 * @property {number} health         // 0–20 scale (mirrors entity roughly)
 * @property {number} hunger         // 0–20
 * @property {number} happiness      // 0–100
 * @property {string} currentActivity
 * @property {string} scheduleId     // which schedule template to use
 * @property {number} createdAt
 * @property {number} lastUpdated
 * @property {string|null} entityId  // last known runtime entity id (not durable)
 * @property {Record<string, number>} inventory  // economic goods (Phase 2)
 * @property {number} taxableIncome              // earned since last tax collection
 * @property {boolean} [_economySeeded]
 */

/**
 * Creates a new villager identity record.
 * @param {Partial<VillagerRecord>} [overrides]
 * @returns {VillagerRecord}
 */
export function createVillagerRecord(overrides = {}) {
  const now = Date.now();
  return {
    id: overrides.id ?? generateId("vil"),
    name: overrides.name ?? generateVillagerName(),
    age: overrides.age ?? 20 + Math.floor(Math.random() * 30),
    profession: overrides.profession ?? DEFAULT_JOB_ID,
    householdId: overrides.householdId ?? null,
    home: overrides.home ?? null,
    workplace: overrides.workplace ?? null,
    money: overrides.money ?? 0,
    health: clamp(overrides.health ?? 20, 0, 20),
    hunger: clamp(overrides.hunger ?? 20, 0, 20),
    happiness: clamp(overrides.happiness ?? 60, 0, 100),
    currentActivity: overrides.currentActivity ?? "idle",
    scheduleId: overrides.scheduleId ?? "default",
    createdAt: overrides.createdAt ?? now,
    lastUpdated: overrides.lastUpdated ?? now,
    entityId: overrides.entityId ?? null,
    inventory: overrides.inventory ?? {},
    taxableIncome: overrides.taxableIncome ?? 0,
    _economySeeded: overrides._economySeeded ?? false
  };
}

const FIRST_NAMES = [
  "Alec", "Bryn", "Cora", "Dane", "Elsa", "Finn", "Gwen", "Hale",
  "Iris", "Joss", "Kira", "Liam", "Mira", "Nils", "Oren", "Pia",
  "Quinn", "Rhea", "Seth", "Tessa", "Una", "Vale", "Wren", "Yara"
];

const SURNAMES = [
  "Ashford", "Brook", "Carver", "Dale", "Eastwood", "Field", "Grove",
  "Hill", "Ivy", "June", "Kettle", "Lane", "Meadow", "North", "Oak",
  "Pike", "Reed", "Stone", "Thorn", "Underhill", "Vale", "West"
];

/**
 * Generates a simple procedural name.
 * @returns {string}
 */
export function generateVillagerName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  return `${first} ${last}`;
}

/**
 * Applies a partial update to a villager record and bumps lastUpdated.
 * @param {VillagerRecord} record
 * @param {Partial<VillagerRecord>} patch
 * @returns {VillagerRecord}
 */
export function updateVillagerRecord(record, patch) {
  Object.assign(record, patch, { lastUpdated: Date.now() });
  if (typeof record.health === "number") {
    record.health = clamp(record.health, 0, 20);
  }
  if (typeof record.hunger === "number") {
    record.hunger = clamp(record.hunger, 0, 20);
  }
  if (typeof record.happiness === "number") {
    record.happiness = clamp(record.happiness, 0, 100);
  }
  return record;
}
