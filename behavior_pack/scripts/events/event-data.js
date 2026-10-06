export const EVENT_VERSION = 1;
export const MAX_EVENTS = 100;
export const MAX_HISTORY = 150;

export const EventStatus = Object.freeze({
  SCHEDULED: "scheduled",
  ANNOUNCED: "announced",
  ACTIVE: "active",
  COMPLETED: "completed",
  ARCHIVED: "archived",
  CANCELLED: "cancelled"
});

export function createDefaultEvents() {
  return {
    version: EVENT_VERSION,
    events: [],
    history: [],
    cursor: 0,
    stats: { completed: 0, active: 0 }
  };
}

export function normalizeEvents(raw) {
  const base = createDefaultEvents();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || EVENT_VERSION,
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_EVENTS) : [],
    history: Array.isArray(raw.history) ? raw.history.slice(-MAX_HISTORY) : [],
    cursor: Math.max(0, Math.floor(raw.cursor || 0)),
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}
