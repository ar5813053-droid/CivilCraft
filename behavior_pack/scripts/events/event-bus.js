/**
 * Cross-system event bus.
 * Distributes events only — no game logic.
 */

import { EventType } from "./event-types.js";

const handlers = new Map();
const QUEUE_CAP = 100;
const HISTORY_CAP = 100;
let queue = [];
let history = [];
let seq = 0;

/**
 * @param {string} eventType
 * @param {(payload: object, event: object) => void} handler
 * @returns {() => void} unsubscribe
 */
export function subscribe(eventType, handler) {
  if (!eventType || typeof handler !== "function") return () => {};
  if (!handlers.has(eventType)) handlers.set(eventType, []);
  handlers.get(eventType).push(handler);
  return () => {
    const list = handlers.get(eventType);
    if (!list) return;
    const i = list.indexOf(handler);
    if (i >= 0) list.splice(i, 1);
  };
}

/**
 * Build a normalized event envelope.
 */
export function createEvent(type, opts = {}) {
  seq += 1;
  return {
    id: opts.id || `cev_${seq}_${Date.now()}`,
    type,
    timestamp: opts.timestamp ?? Date.now(),
    simulationDay: opts.simulationDay ?? Math.floor(Date.now() / 86400000),
    source: opts.source || "unknown",
    actorId: opts.actorId || null,
    settlementId: opts.settlementId || "settlement_main",
    nationId: opts.nationId || "nation_main",
    metadata: opts.metadata && typeof opts.metadata === "object" ? opts.metadata : {}
  };
}

/**
 * Publish an event. Queued for flushEventBus.
 */
export function publish(typeOrEvent, payload = {}) {
  let event;
  if (typeOrEvent && typeof typeOrEvent === "object" && typeOrEvent.type) {
    event = typeOrEvent;
  } else {
    if (!typeOrEvent) return null;
    event = createEvent(typeOrEvent, {
      source: payload.source,
      actorId: payload.actorId,
      settlementId: payload.settlementId,
      nationId: payload.nationId,
      metadata: payload.metadata || payload
    });
  }
  queue.push(event);
  if (queue.length > QUEUE_CAP) queue = queue.slice(-QUEUE_CAP);
  return event;
}

/**
 * Deliver queued events to subscribers. Isolated per handler.
 */
export function flushEventBus() {
  const batch = queue.splice(0, 25);
  for (const ev of batch) {
    history.push({ id: ev.id, type: ev.type, day: ev.simulationDay });
    if (history.length > HISTORY_CAP) history = history.slice(-HISTORY_CAP);

    const list = handlers.get(ev.type) || [];
    for (const h of list) {
      try {
        h(ev.metadata || {}, ev);
      } catch {
        /* isolate */
      }
    }
    const any = handlers.get("*") || [];
    for (const h of any) {
      try {
        h(ev.metadata || {}, ev);
      } catch {
        /* isolate */
      }
    }
  }
  return batch.length;
}

export function getQueueLength() {
  return queue.length;
}

export function getEventHistory(limit = 20) {
  return history.slice(-limit);
}

export function clearEventBusForTests() {
  queue = [];
  history = [];
  handlers.clear();
  seq = 0;
}

export { EventType };
