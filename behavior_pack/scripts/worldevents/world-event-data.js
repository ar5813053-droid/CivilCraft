import { createDefaultCalendar, normalizeCalendar } from "./event-calendar.js";

export const WORLD_EVENT_VERSION = 1;

export function createDefaultWorldEvents() {
  return {
    version: WORLD_EVENT_VERSION,
    calendar: createDefaultCalendar(),
    instances: [],
    history: [],
    cooldowns: {},
    stats: { completed: 0, active: 0, scheduled: 0 }
  };
}

export function normalizeWorldEvents(raw) {
  const base = createDefaultWorldEvents();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || WORLD_EVENT_VERSION,
    calendar: normalizeCalendar(raw.calendar),
    instances: Array.isArray(raw.instances) ? raw.instances.slice(-40) : [],
    history: Array.isArray(raw.history) ? raw.history.slice(-150) : [],
    cooldowns: raw.cooldowns && typeof raw.cooldowns === "object" ? raw.cooldowns : {},
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}
