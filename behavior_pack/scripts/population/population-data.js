export const POPULATION_VERSION = 1;
export const MAX_SIMULATED = 2000;
export const MAX_HOUSEHOLDS = 1000;
export const MAX_RELATIONSHIPS = 4000;
export const MAX_POP_EVENTS = 200;
export const MAX_MIGRATIONS = 200;

export const LIFE_STAGES = [
  { id: "infant", min: 0, max: 2 },
  { id: "child", min: 3, max: 12 },
  { id: "teenager", min: 13, max: 17 },
  { id: "young_adult", min: 18, max: 29 },
  { id: "adult", min: 30, max: 49 },
  { id: "middle_aged", min: 50, max: 64 },
  { id: "senior", min: 65, max: 200 }
];

export function lifeStage(age) {
  const years = Math.max(0, Math.floor(age || 0));
  return LIFE_STAGES.find((s) => years >= s.min && years <= s.max)?.id || "adult";
}

export function jobEligible(age) {
  const stage = lifeStage(age);
  if (stage === "infant" || stage === "child") return false;
  if (stage === "teenager") return false;
  return true;
}

export function createDefaultPopulation() {
  return {
    version: POPULATION_VERSION,
    households: [],
    relationships: [],
    migrations: [],
    events: [],
    deaths: [],
    cursor: 0,
    counters: { births: 0, deaths: 0, migrationIn: 0, migrationOut: 0 }
  };
}

export function normalizePopulation(raw) {
  const base = createDefaultPopulation();
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    version: raw.version || POPULATION_VERSION,
    households: Array.isArray(raw.households) ? raw.households.slice(-MAX_HOUSEHOLDS) : [],
    relationships: Array.isArray(raw.relationships) ? raw.relationships.slice(-MAX_RELATIONSHIPS) : [],
    migrations: Array.isArray(raw.migrations) ? raw.migrations.slice(-MAX_MIGRATIONS) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_POP_EVENTS) : [],
    deaths: Array.isArray(raw.deaths) ? raw.deaths.slice(-MAX_POP_EVENTS) : [],
    cursor: Math.max(0, Math.floor(raw.cursor || 0)),
    counters: { ...base.counters, ...(raw.counters || {}) }
  };
}
