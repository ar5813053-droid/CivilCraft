import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultMemory, normalizeMemory, MAX_CITIZEN_MEMORIES, MAX_CIV_MEMORIES } from "./memory-data.js";
import { wireMemorySubscriber } from "./memory-subscriber.js";
export { addCitizenMemory, getCitizenMemories } from "./citizen-memory.js";
export { addCivilizationMemory, getCivilizationMemories } from "./civilization-memory.js";

let initialized = false;

export function initializeMemory() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.memory = data.memory ? normalizeMemory(data.memory) : createDefaultMemory();
  wireMemorySubscriber();
  Logger.info("Memory manager initialized.");
}

export function getMemoryStore() {
  const data = getWorldData();
  if (!data.memory) data.memory = createDefaultMemory();
  return data.memory;
}

export function rememberCitizen(citizenId, type, detail = {}) {
  if (!citizenId || !type) return;
  const store = getMemoryStore();
  if (!store.citizens[citizenId]) store.citizens[citizenId] = [];
  store.citizens[citizenId].push({
    type,
    day: Math.floor(Date.now() / 86400000),
    detail: typeof detail === "object" ? detail : { note: String(detail) }
  });
  if (store.citizens[citizenId].length > MAX_CITIZEN_MEMORIES) {
    store.citizens[citizenId] = store.citizens[citizenId].slice(-MAX_CITIZEN_MEMORIES);
  }
  store.stats.citizenEntries = (store.stats.citizenEntries || 0) + 1;
  markDirty();
}

export function rememberCivilization(type, detail = {}) {
  if (!type) return;
  const store = getMemoryStore();
  store.civilization.push({
    id: `mem_${store.civilization.length + 1}`,
    type,
    day: Math.floor(Date.now() / 86400000),
    detail
  });
  if (store.civilization.length > MAX_CIV_MEMORIES) {
    store.civilization = store.civilization.slice(-MAX_CIV_MEMORIES);
  }
  store.stats.civEntries = (store.stats.civEntries || 0) + 1;
  markDirty();
}

export function listCitizenMemories(citizenId) {
  return getMemoryStore().citizens[citizenId] || [];
}

export function listCivilizationMemories(limit = 20) {
  return getMemoryStore().civilization.slice(-limit);
}
