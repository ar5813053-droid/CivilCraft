import { MAX_HOUSING_EVENTS } from "./housing-data.js";
import { markDirty } from "../core/data-store.js";

export function pushHousingEvent(store, type, message) {
  if (!store) return;
  store.events = store.events || [];
  store.events.push({ type, message, timestamp: Date.now() });
  if (store.events.length > MAX_HOUSING_EVENTS) store.events = store.events.slice(-MAX_HOUSING_EVENTS);
  markDirty();
}
