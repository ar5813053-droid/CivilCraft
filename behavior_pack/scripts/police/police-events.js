import { MAX_POLICE_EVENTS } from "./police-data.js";
import { markDirty } from "../core/data-store.js";

export function pushPoliceEvent(store, type, message) {
  if (!store) return;
  if (!Array.isArray(store.events)) store.events = [];
  store.events.push({ type, message, timestamp: Date.now() });
  if (store.events.length > MAX_POLICE_EVENTS) store.events = store.events.slice(-MAX_POLICE_EVENTS);
  markDirty();
}
