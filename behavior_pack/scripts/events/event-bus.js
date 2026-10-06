/**
 * Typed civilization event bus. Subscribers registered by type.
 * Bounded queue; never blocks tick with unlimited handlers.
 */

const handlers = new Map();
const QUEUE_CAP = 100;
let queue = [];

export function subscribe(eventType, handler) {
  if (!eventType || typeof handler !== "function") return;
  if (!handlers.has(eventType)) handlers.set(eventType, []);
  handlers.get(eventType).push(handler);
}

export function publish(eventType, payload = {}) {
  if (!eventType) return;
  queue.push({ type: eventType, payload, at: Date.now() });
  if (queue.length > QUEUE_CAP) queue = queue.slice(-QUEUE_CAP);
}

export function flushEventBus() {
  const batch = queue.splice(0, 25);
  for (const ev of batch) {
    const list = handlers.get(ev.type) || [];
    for (const h of list) {
      try {
        h(ev.payload, ev);
      } catch {
        /* isolate subscriber failures */
      }
    }
    const any = handlers.get("*") || [];
    for (const h of any) {
      try {
        h(ev.payload, ev);
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
