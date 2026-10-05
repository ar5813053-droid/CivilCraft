import { MAX_EDU_EVENTS } from "./education-data.js";
import { markDirty } from "../core/data-store.js";

export function pushEducationEvent(store, type, message) {
  if (!store) return;
  store.events = store.events || [];
  store.events.push({ type, message, timestamp: Date.now() });
  if (store.events.length > MAX_EDU_EVENTS) store.events = store.events.slice(-MAX_EDU_EVENTS);
  markDirty();
}
