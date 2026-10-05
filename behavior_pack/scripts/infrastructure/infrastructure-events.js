import { MAX_INFRA_EVENTS } from "./infrastructure-data.js";
import { markDirty } from "../core/data-store.js";

export function pushInfraEvent(store, type, message) {
  if (!store) return;
  store.events = store.events || [];
  store.events.push({ type, message, timestamp: Date.now() });
  if (store.events.length > MAX_INFRA_EVENTS) store.events = store.events.slice(-MAX_INFRA_EVENTS);
  markDirty();
}
