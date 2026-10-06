export const MEMORY_VERSION = 1;
export const MAX_CITIZEN_MEMORIES = 30;
export const MAX_CIV_MEMORIES = 200;

export function createDefaultMemory() {
  return {
    version: MEMORY_VERSION,
    citizens: {},
    civilization: [],
    stats: { citizenEntries: 0, civEntries: 0 }
  };
}

export function normalizeMemory(raw) {
  const base = createDefaultMemory();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || MEMORY_VERSION,
    citizens: raw.citizens && typeof raw.citizens === "object" ? raw.citizens : {},
    civilization: Array.isArray(raw.civilization) ? raw.civilization.slice(-MAX_CIV_MEMORIES) : [],
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}
