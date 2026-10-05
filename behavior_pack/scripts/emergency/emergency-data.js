export const EMERGENCY_DATA_VERSION = 1;
export const MAX_ACTIVE = 50;
export const MAX_HISTORY = 100;
export const MAX_UNITS = 100;
export const EMERGENCY_TYPES = ["crime", "medical", "fire", "accident"];
export const PRIORITIES = ["low", "normal", "high", "critical"];

export function createDefaultEmergency() {
  return {
    version: EMERGENCY_DATA_VERSION,
    jurisdiction: "municipal_main",
    emergencies: [],
    history: [],
    units: [],
    events: []
  };
}

export function normalizeEmergency(raw) {
  const base = createDefaultEmergency();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || EMERGENCY_DATA_VERSION,
    jurisdiction: raw.jurisdiction || "municipal_main",
    emergencies: Array.isArray(raw.emergencies) ? raw.emergencies.slice(-MAX_ACTIVE) : [],
    history: Array.isArray(raw.history) ? raw.history.slice(-MAX_HISTORY) : [],
    units: Array.isArray(raw.units) ? raw.units.slice(-MAX_UNITS) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_HISTORY) : []
  };
}
