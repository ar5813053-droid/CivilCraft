/**
 * Bounded justice event log.
 */

import { MAX_JUSTICE_EVENTS } from "./justice-data.js";
import { markDirty } from "../core/data-store.js";

export function pushJusticeEvent(store, type, message, extra = {}) {
  if (!store) return;
  if (!Array.isArray(store.events)) store.events = [];
  store.events.push({
    type,
    message,
    ...extra,
    timestamp: Date.now()
  });
  if (store.events.length > MAX_JUSTICE_EVENTS) {
    store.events = store.events.slice(-MAX_JUSTICE_EVENTS);
  }
  markDirty();
}
