import { MAX_EVENTS } from "./employment-data.js";
import { markDirty } from "../core/data-store.js";

export function pushEmploymentEvent(store, type, message) {
  if (!store) return;
  store.events = store.events || [];
  store.events.push({ type, message, timestamp: Date.now() });
  if (store.events.length > MAX_EVENTS) store.events = store.events.slice(-MAX_EVENTS);
  markDirty();
}
