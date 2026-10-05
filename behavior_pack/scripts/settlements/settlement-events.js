import { MAX_SETTLEMENT_EVENTS } from "./settlement-data.js";
import { markDirty } from "../core/data-store.js";

export function pushSettlementEvent(store, type, message) {
  if (!store) return;
  store.events = store.events || [];
  store.events.push({ type, message, timestamp: Date.now() });
  if (store.events.length > MAX_SETTLEMENT_EVENTS) store.events = store.events.slice(-MAX_SETTLEMENT_EVENTS);
  markDirty();
}
