export const INFRA_VERSION = 1;
export const MAX_INFRA = 500;
export const MAX_ROADS = 500;
export const MAX_INFRA_EVENTS = 100;

export function createDefaultInfrastructure() {
  return { version: INFRA_VERSION, records: [], roads: [], events: [] };
}

export function normalizeInfrastructure(raw) {
  const base = createDefaultInfrastructure();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || INFRA_VERSION,
    records: Array.isArray(raw.records) ? raw.records.slice(-MAX_INFRA) : [],
    roads: Array.isArray(raw.roads) ? raw.roads.slice(-MAX_ROADS) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_INFRA_EVENTS) : []
  };
}

export function createInfraRecord(partial) {
  return {
    id: partial.id,
    type: partial.type,
    name: partial.name || partial.type,
    settlementId: partial.settlementId || "settlement_main",
    location: partial.location || null,
    bounds: partial.bounds || null,
    structureId: partial.structureId || null,
    capacity: Math.max(0, Math.floor(partial.capacity || 0)),
    condition: Math.max(0, Math.min(100, Math.floor(partial.condition ?? 80))),
    createdAt: partial.createdAt || Date.now(),
    updatedAt: Date.now()
  };
}
