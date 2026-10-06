import { MAX_CIV_MEMORIES } from "./memory-data.js";
import { getMemoryStore } from "./memory-manager.js";
import { markDirty } from "../core/data-store.js";

export function addCivilizationMemory(type, metadata = {}) {
  if (!type) return { ok: false, error: "invalid" };
  const store = getMemoryStore();
  const day = Math.floor(Date.now() / 86400000);
  const entry = {
    id: `cmem_${store.civilization.length + 1}_${day}`,
    type,
    day,
    timestamp: Date.now(),
    settlementId: metadata.settlementId || "settlement_main",
    nationId: metadata.nationId || "nation_main",
    actorId: metadata.actorId || null,
    metadata: { ...metadata }
  };
  // Duplicate: same type+day+actor
  if (
    store.civilization.some(
      (m) => m.type === type && m.day === day && m.actorId === entry.actorId
    )
  ) {
    return { ok: false, error: "duplicate" };
  }
  store.civilization.push(entry);
  if (store.civilization.length > MAX_CIV_MEMORIES) {
    store.civilization = store.civilization.slice(-MAX_CIV_MEMORIES);
  }
  store.stats.civEntries = (store.stats.civEntries || 0) + 1;
  markDirty();
  return { ok: true, entry };
}

export function getCivilizationMemories(limit = 20) {
  return getMemoryStore().civilization.slice(-limit);
}
