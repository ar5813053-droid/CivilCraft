import { markDirty } from "../core/data-store.js";
import { MAX_HEALTH_EVENTS } from "./healthcare-data.js";

export function pushMedicalEvent(store, type, message) {
  if (!store) return;
  store.events = store.events || [];
  store.events.push({ type, message, timestamp: Date.now() });
  if (store.events.length > MAX_HEALTH_EVENTS) store.events = store.events.slice(-MAX_HEALTH_EVENTS);
  markDirty();
}
