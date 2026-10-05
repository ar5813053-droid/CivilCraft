export const SETTLEMENT_VERSION = 1;
export const MAX_SETTLEMENTS = 50;
export const MAX_SETTLEMENT_EVENTS = 100;

export function createSettlement(partial = {}) {
  const now = Date.now();
  return {
    id: partial.id || "settlement_main",
    name: partial.name || "Main Settlement",
    type: partial.type || "village",
    jurisdiction: partial.jurisdiction || "municipal_main",
    location: partial.location || null,
    bounds: partial.bounds || null,
    population: Math.max(0, Math.floor(partial.population || 0)),
    capacity: Math.max(1, Math.floor(partial.capacity || 100)),
    developmentLevel: clampScore(partial.developmentLevel ?? 10),
    prosperity: clampScore(partial.prosperity ?? 40),
    infrastructureIds: Array.isArray(partial.infrastructureIds) ? partial.infrastructureIds.slice(0, 200) : [],
    governmentId: partial.governmentId || "municipal_main",
    facilityIds: Array.isArray(partial.facilityIds) ? partial.facilityIds.slice(0, 200) : [],
    createdAt: partial.createdAt || now,
    updatedAt: now
  };
}

export function clampScore(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function createDefaultSettlements() {
  return { version: SETTLEMENT_VERSION, settlements: [], events: [] };
}

export function normalizeSettlements(raw) {
  const base = createDefaultSettlements();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || SETTLEMENT_VERSION,
    settlements: Array.isArray(raw.settlements)
      ? raw.settlements.slice(-MAX_SETTLEMENTS).map((s) => createSettlement(s))
      : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_SETTLEMENT_EVENTS) : []
  };
}
