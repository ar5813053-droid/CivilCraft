export const CULTURE_VERSION = 2;
export const MAX_CULTURE_HISTORY = 80;
export const MAX_ACTIVE_FESTIVAL_TRACK = 20;

export function createDefaultCulture() {
  return {
    version: CULTURE_VERSION,
    preferences: {},
    activeFestivals: [],
    history: [],
    cooldowns: {},
    impact: {},
    decorations: { records: [], cursor: 0 },
    stats: {
      festivalsHeld: 0,
      totalAttendance: 0,
      cancelled: 0
    }
  };
}

export function normalizeCulture(raw) {
  const base = createDefaultCulture();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: Math.max(CULTURE_VERSION, raw.version || 1),
    preferences: raw.preferences && typeof raw.preferences === "object" ? raw.preferences : {},
    activeFestivals: Array.isArray(raw.activeFestivals)
      ? raw.activeFestivals.slice(-MAX_ACTIVE_FESTIVAL_TRACK)
      : [],
    history: Array.isArray(raw.history) ? raw.history.slice(-MAX_CULTURE_HISTORY) : [],
    cooldowns: raw.cooldowns && typeof raw.cooldowns === "object" ? raw.cooldowns : {},
    impact: raw.impact && typeof raw.impact === "object" ? raw.impact : {},
    decorations: raw.decorations && typeof raw.decorations === "object" ? raw.decorations : { records: [], cursor: 0 },
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}
