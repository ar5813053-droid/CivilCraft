export const LOGISTICS_VERSION = 1;
export const MAX_ROUTES = 200;
export const MAX_SHIPMENTS = 500;
export const MAX_LOG_EVENTS = 200;
export const DEFAULT_TRAVEL_DAYS = 1;
export const CARRIER_CAPACITY = { small: 20, large: 100 };

export function createDefaultLogistics() {
  return {
    version: LOGISTICS_VERSION,
    routes: [],
    shipments: [],
    events: [],
    cursor: 0,
    stats: { routes: 0, inTransit: 0, delivered: 0, failed: 0 }
  };
}

export function normalizeLogistics(raw) {
  const base = createDefaultLogistics();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || LOGISTICS_VERSION,
    routes: Array.isArray(raw.routes) ? raw.routes.slice(-MAX_ROUTES) : [],
    shipments: Array.isArray(raw.shipments) ? raw.shipments.slice(-MAX_SHIPMENTS) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_LOG_EVENTS) : [],
    cursor: Math.max(0, Math.floor(raw.cursor || 0)),
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}
