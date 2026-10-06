import { MAX_CITIZEN_MEMORIES } from "./memory-data.js";
import { getMemoryStore } from "./memory-manager.js";
import { markDirty } from "../core/data-store.js";

/**
 * Compact citizen/player memory entry.
 * Does not copy full citizen objects.
 */
export function addCitizenMemory(citizenId, type, metadata = {}) {
  if (!citizenId || !type) return { ok: false, error: "invalid" };
  const store = getMemoryStore();
  if (!store.citizens[citizenId]) store.citizens[citizenId] = [];
  const list = store.citizens[citizenId];
  // Light duplicate prevention: same type+day
  const day = Math.floor(Date.now() / 86400000);
  if (list.some((m) => m.type === type && m.day === day && JSON.stringify(m.detail) === JSON.stringify(metadata))) {
    return { ok: false, error: "duplicate" };
  }
  list.push({
    type,
    day,
    detail: metadata && typeof metadata === "object" ? { ...metadata } : {}
  });
  if (list.length > MAX_CITIZEN_MEMORIES) {
    store.citizens[citizenId] = list.slice(-MAX_CITIZEN_MEMORIES);
  }
  store.stats.citizenEntries = (store.stats.citizenEntries || 0) + 1;
  markDirty();
  return { ok: true };
}

export function getCitizenMemories(citizenId) {
  return getMemoryStore().citizens[citizenId] || [];
}
