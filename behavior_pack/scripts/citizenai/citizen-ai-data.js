export const CITIZEN_AI_VERSION = 1;
export const MAX_GOAL_HISTORY = 50;

export function createDefaultCitizenAi() {
  return {
    version: CITIZEN_AI_VERSION,
    byId: {},
    cursor: 0,
    stats: { personalities: 0, goalsGenerated: 0, decisions: 0 }
  };
}

export function normalizeCitizenAi(raw) {
  const base = createDefaultCitizenAi();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || CITIZEN_AI_VERSION,
    byId: raw.byId && typeof raw.byId === "object" ? raw.byId : {},
    cursor: Math.max(0, Math.floor(raw.cursor || 0)),
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}

export function emptyProfile() {
  return {
    personality: null,
    preferences: null,
    goals: [],
    lastGoalDay: null,
    lastDecision: null
  };
}
