export const Lifecycle = Object.freeze({
  SCHEDULED: "scheduled",
  PREPARATION: "preparation",
  ACTIVE: "active",
  CLOSING: "closing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  EXPIRED: "expired"
});

export const MAX_ACTIVE_EVENTS = 25;
export const MAX_HISTORY = 150;
export const MAX_PARTICIPANTS = 50;

let seq = 0;

export function createInstance(def, opts = {}) {
  seq += 1;
  const startDay = opts.startDay ?? 0;
  const prep = def.preparationDays || 0;
  return {
    id: opts.id || `we_${def.id}_${seq}_${startDay}`,
    definitionId: def.id,
    type: def.type,
    name: def.name,
    category: def.category,
    status: Lifecycle.SCHEDULED,
    startDay,
    prepStartDay: startDay - prep,
    endDay: startDay + (def.durationDays || 1),
    settlementId: opts.settlementId || "settlement_main",
    nationId: opts.nationId || "nation_main",
    source: opts.source || "scheduler",
    organizerId: opts.organizerId || null,
    participantIds: [],
    activityProgress: {},
    effectsApplied: false,
    completedEffects: {},
    importance: opts.importance || "normal"
  };
}
