import { MAX_DAILY_EVENTS } from "./daily-life-data.js";
import { markDirty } from "../core/data-store.js";

export function pushDailyEvent(store, type, message) {
  if (!store) return;
  store.events = store.events || [];
  store.events.push({ type, message, timestamp: Date.now() });
  if (store.events.length > MAX_DAILY_EVENTS) store.events = store.events.slice(-MAX_DAILY_EVENTS);
  markDirty();
}
