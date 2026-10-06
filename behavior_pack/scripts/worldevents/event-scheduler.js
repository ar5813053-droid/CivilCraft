import { getDefinition, listDefinitions } from "./event-registry.js";
import { createInstance, Lifecycle, MAX_ACTIVE_EVENTS } from "./event-instances.js";
import { selectParticipants } from "./event-participants.js";
import { applyEventEffects } from "./event-effects.js";
import { publish } from "../events/event-bus.js";
import { EventType } from "../events/event-types.js";

/**
 * Advance all instances one calendar day.
 */
export function tickScheduler(store, data, calendar) {
  const day = calendar.totalDays;
  const doy = calendar.dayOfYear;

  // Recurring from definitions
  for (const def of listDefinitions()) {
    if (def.recurringDayOfYear == null) continue;
    if (doy !== def.recurringDayOfYear) continue;
    if (store.cooldowns?.[def.id] != null && day - store.cooldowns[def.id] < (def.cooldownDays || 30)) continue;
    if (store.instances.some((e) => e.definitionId === def.id && e.status !== Lifecycle.COMPLETED && e.status !== Lifecycle.CANCELLED)) {
      continue;
    }
    if (store.instances.filter((e) => e.status === Lifecycle.ACTIVE || e.status === Lifecycle.PREPARATION).length >= MAX_ACTIVE_EVENTS) {
      break;
    }
    const inst = createInstance(def, { startDay: day, source: "calendar" });
    store.instances.push(inst);
    store.cooldowns = store.cooldowns || {};
    store.cooldowns[def.id] = day;
  }

  // Conditional: food shortage
  const food = data.civilization?.stats?.foodAvailability;
  if (food != null && food < 25) {
    const def = getDefinition("food_crisis_response");
    if (def && !(store.cooldowns?.food_crisis_response != null && day - store.cooldowns.food_crisis_response < 10)) {
      if (!store.instances.some((e) => e.definitionId === "food_crisis_response" && e.status === Lifecycle.ACTIVE)) {
        const inst = createInstance(def, { startDay: day, source: "condition", importance: "major" });
        store.instances.push(inst);
        store.cooldowns = store.cooldowns || {};
        store.cooldowns.food_crisis_response = day;
      }
    }
  }

  for (const inst of store.instances) {
    const def = getDefinition(inst.definitionId);
    if (!def) continue;

    if (inst.status === Lifecycle.SCHEDULED && day >= inst.prepStartDay && day < inst.startDay) {
      inst.status = Lifecycle.PREPARATION;
      publish("EVENT_ANNOUNCED", { source: "worldevents", metadata: { eventId: inst.id, type: inst.type } });
    }

    if (
      (inst.status === Lifecycle.SCHEDULED || inst.status === Lifecycle.PREPARATION) &&
      day >= inst.startDay
    ) {
      inst.status = Lifecycle.ACTIVE;
      inst.participantIds = selectParticipants(data, def, inst.settlementId);
      applyEventEffects(inst, def, data, "active");
      publish(EventType.EVENT_ACTIVE || "EVENT_ACTIVE", {
        source: "worldevents",
        metadata: { eventId: inst.id, type: inst.type, participants: inst.participantIds.length }
      });
      store.stats.active = (store.stats.active || 0) + 1;
    }

    if (inst.status === Lifecycle.ACTIVE && day >= inst.endDay - 1 && day < inst.endDay) {
      inst.status = Lifecycle.CLOSING;
    }

    if ((inst.status === Lifecycle.ACTIVE || inst.status === Lifecycle.CLOSING) && day >= inst.endDay) {
      inst.status = Lifecycle.COMPLETED;
      applyEventEffects(inst, def, data, "complete");
      store.history.push({
        id: inst.id,
        type: inst.type,
        category: def.category,
        startDay: inst.startDay,
        endDay: inst.endDay,
        participants: inst.participantIds.length,
        outcome: "completed"
      });
      if (store.history.length > 150) store.history = store.history.slice(-150);
      store.stats.completed = (store.stats.completed || 0) + 1;
      store.stats.active = Math.max(0, (store.stats.active || 1) - 1);
    }
  }

  store.instances = store.instances.filter(
    (e) => e.status !== Lifecycle.COMPLETED && e.status !== Lifecycle.CANCELLED && e.status !== Lifecycle.EXPIRED
  );
  if (store.instances.length > MAX_ACTIVE_EVENTS + 10) {
    store.instances = store.instances.slice(-MAX_ACTIVE_EVENTS - 10);
  }
}

export function scheduleManual(store, typeId, opts = {}) {
  const def = getDefinition(typeId);
  if (!def) return { ok: false, error: "unknown_type" };
  const day = opts.startDay ?? 0;
  if (store.cooldowns?.[typeId] != null && day - store.cooldowns[typeId] < (def.cooldownDays || 0)) {
    return { ok: false, error: "cooldown" };
  }
  const inst = createInstance(def, { ...opts, startDay: day });
  store.instances.push(inst);
  return { ok: true, instance: inst };
}

export function cancelEvent(store, eventId) {
  const inst = store.instances.find((e) => e.id === eventId);
  if (!inst) return { ok: false, error: "not_found" };
  if (inst.status === Lifecycle.COMPLETED) return { ok: false, error: "already_completed" };
  inst.status = Lifecycle.CANCELLED;
  return { ok: true };
}
