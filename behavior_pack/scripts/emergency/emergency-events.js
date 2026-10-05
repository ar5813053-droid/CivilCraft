import { MAX_HISTORY } from "./emergency-data.js";

export function pushEmergencyEvent(store, type, message) {
  if (!store) return;
  if (!Array.isArray(store.events)) store.events = [];
  store.events.push({ type, message, timestamp: Date.now() });
  if (store.events.length > MAX_HISTORY) store.events = store.events.slice(-MAX_HISTORY);
}
