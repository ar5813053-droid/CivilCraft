export const CIVILIZATION_VERSION = 1;
export const MAX_WORLD_EVENTS = 200;
export const MAX_LIFE_EVENTS = 300;
export const EVENT_COOLDOWNS = Object.freeze({
  food_shortage: 5,
  unemployment_crisis: 7,
  utility_disruption: 5,
  election_completed: 1,
  settlement_upgrade: 10,
  trade_agreement: 3,
  business_growth: 5,
  positive_government: 7
});

export function createDefaultCivilization() {
  return {
    version: CIVILIZATION_VERSION,
    score: 50,
    events: [],
    lifeEvents: [],
    eventCooldowns: {},
    lastComputedDay: null,
    stats: {
      population: 0,
      employment: 0,
      unemployment: 0,
      housing: 0,
      foodAvailability: 50,
      averageHealth: 50,
      education: 50,
      businesses: 0,
      utilityQuality: 50,
      crime: 0,
      governmentApproval: 50,
      prosperity: 50
    },
    cursor: 0
  };
}

export function normalizeCivilization(raw) {
  const base = createDefaultCivilization();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || CIVILIZATION_VERSION,
    score: Math.max(0, Math.min(100, Math.round(raw.score ?? 50))),
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_WORLD_EVENTS) : [],
    lifeEvents: Array.isArray(raw.lifeEvents) ? raw.lifeEvents.slice(-MAX_LIFE_EVENTS) : [],
    eventCooldowns: raw.eventCooldowns && typeof raw.eventCooldowns === "object" ? raw.eventCooldowns : {},
    lastComputedDay: raw.lastComputedDay ?? null,
    stats: { ...base.stats, ...(raw.stats || {}) },
    cursor: Math.max(0, Math.floor(raw.cursor || 0))
  };
}
