export const DAILY_VERSION = 1;
export const MAX_STATES = 2000;
export const MAX_ATTENDANCE = 500;
export const MAX_DAILY_EVENTS = 200;

export function createDefaultDailyLife() {
  return {
    version: DAILY_VERSION,
    states: [],
    attendance: [],
    events: [],
    cursor: 0,
    day: 0,
    cooldowns: {},
    food: { householdCooldowns: {}, recentResults: [] }
  };
}

export function normalizeDailyLife(raw) {
  const base = createDefaultDailyLife();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || DAILY_VERSION,
    states: Array.isArray(raw.states) ? raw.states.slice(-MAX_STATES) : [],
    attendance: Array.isArray(raw.attendance) ? raw.attendance.slice(-MAX_ATTENDANCE) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_DAILY_EVENTS) : [],
    cursor: Math.max(0, Math.floor(raw.cursor || 0)),
    day: Math.max(0, Math.floor(raw.day || 0)),
    cooldowns: raw.cooldowns && typeof raw.cooldowns === "object" ? raw.cooldowns : {},
    food: {
      householdCooldowns: raw.food?.householdCooldowns && typeof raw.food.householdCooldowns === "object" ? raw.food.householdCooldowns : {},
      recentResults: Array.isArray(raw.food?.recentResults) ? raw.food.recentResults.slice(-200) : []
    }
  };
}

export function clampNeed(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}
