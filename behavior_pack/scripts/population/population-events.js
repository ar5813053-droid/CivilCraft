import { MAX_POP_EVENTS } from "./population-data.js";
import { markDirty } from "../core/data-store.js";

export function pushPopulationEvent(store, type, message) {
  if (!store) return;
  store.events = store.events || [];
  store.events.push({ type, message, timestamp: Date.now() });
  if (store.events.length > MAX_POP_EVENTS) store.events = store.events.slice(-MAX_POP_EVENTS);
  markDirty();
}
