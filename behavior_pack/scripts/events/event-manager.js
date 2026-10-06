import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultEvents, normalizeEvents, EventStatus, MAX_EVENTS, MAX_HISTORY } from "./event-data.js";
import { publish, flushEventBus } from "./event-bus.js";
import { rememberCivilization } from "../memory/memory-manager.js";
import { reportEvent } from "../social/media.js";

let initialized = false;
export const EVENT_INTERVAL = 1200;

export function initializeEvents() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.events = data.events ? normalizeEvents(data.events) : createDefaultEvents();
  system.runInterval(() => {
    try {
      tickEvents(data);
      flushEventBus();
    } catch (e) {
      Logger.error("Events tick failed", e);
    }
  }, EVENT_INTERVAL);
  Logger.info("Event manager initialized.");
}

export function getEventsStore() {
  const data = getWorldData();
  if (!data.events) data.events = createDefaultEvents();
  return data.events;
}

export function scheduleEvent(partial) {
  const store = getEventsStore();
  const ev = {
    id: partial.id || `evt_${store.events.length + 1}_${Date.now()}`,
    type: partial.type || "community",
    nameKey: partial.nameKey || partial.type,
    status: EventStatus.SCHEDULED,
    startDay: partial.startDay ?? Math.floor(Date.now() / 86400000),
    endDay: partial.endDay ?? null,
    settlementId: partial.settlementId || "settlement_main",
    effects: partial.effects || {}
  };
  store.events.push(ev);
  if (store.events.length > MAX_EVENTS) store.events = store.events.slice(-MAX_EVENTS);
  publish("EVENT_SCHEDULED", { eventId: ev.id, type: ev.type });
  markDirty();
  return ev;
}

function tickEvents(data) {
  const store = data.events;
  if (!store) return;
  const day = Math.floor(Date.now() / 86400000);
  for (const ev of store.events) {
    if (ev.status === EventStatus.SCHEDULED && day >= ev.startDay) {
      ev.status = EventStatus.ANNOUNCED;
      publish("EVENT_ANNOUNCED", { eventId: ev.id, type: ev.type });
      if (data.social) {
        reportEvent(data.social, {
          type: "local_news",
          headlineKey: ev.nameKey || ev.type,
          severity: 2,
          createdDay: day
        });
      }
    }
    if (ev.status === EventStatus.ANNOUNCED) {
      ev.status = EventStatus.ACTIVE;
      publish("EVENT_ACTIVE", { eventId: ev.id, type: ev.type });
      store.stats.active = (store.stats.active || 0) + 1;
    }
    if (ev.status === EventStatus.ACTIVE && ev.endDay != null && day >= ev.endDay) {
      ev.status = EventStatus.COMPLETED;
      store.history.push({ ...ev, archivedDay: day });
      if (store.history.length > MAX_HISTORY) store.history = store.history.slice(-MAX_HISTORY);
      rememberCivilization(ev.type, { eventId: ev.id, nameKey: ev.nameKey });
      publish("EVENT_COMPLETED", { eventId: ev.id, type: ev.type });
      store.stats.completed = (store.stats.completed || 0) + 1;
      store.stats.active = Math.max(0, (store.stats.active || 1) - 1);
    }
  }
  store.events = store.events.filter((e) => e.status !== EventStatus.COMPLETED && e.status !== EventStatus.ARCHIVED);
  markDirty();
}
