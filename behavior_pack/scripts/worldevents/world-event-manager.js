import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultWorldEvents, normalizeWorldEvents } from "./world-event-data.js";
import { advanceDay, formatCalendar } from "./event-calendar.js";
import { tickScheduler, scheduleManual, cancelEvent } from "./event-scheduler.js";
import { addParticipant, removeParticipant } from "./event-participants.js";
import { getDefinition, listDefinitions } from "./event-registry.js";
import { Lifecycle } from "./event-instances.js";
import { flushEventBus } from "../events/event-bus.js";

let initialized = false;
export const WORLD_EVENT_INTERVAL = 1200;

export function initializeWorldEvents() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.worldEvents = data.worldEvents
    ? normalizeWorldEvents(data.worldEvents)
    : createDefaultWorldEvents();
  system.runInterval(() => {
    try {
      tickWorldEvents(data);
      flushEventBus();
    } catch (e) {
      Logger.error("World events tick failed", e);
    }
  }, WORLD_EVENT_INTERVAL);
  Logger.info("World event engine initialized.");
}

export function getWorldEventsStore() {
  const data = getWorldData();
  if (!data.worldEvents) data.worldEvents = createDefaultWorldEvents();
  return data.worldEvents;
}

export function tickWorldEvents(data) {
  const store = data.worldEvents;
  if (!store) return;
  advanceDay(store.calendar);
  tickScheduler(store, data, store.calendar);
  markDirty();
}

export function listActiveEvents() {
  return getWorldEventsStore().instances.filter(
    (e) => e.status === Lifecycle.ACTIVE || e.status === Lifecycle.PREPARATION || e.status === Lifecycle.CLOSING
  );
}

export function listUpcoming() {
  return getWorldEventsStore().instances.filter((e) => e.status === Lifecycle.SCHEDULED);
}

export function getEventInfo(id) {
  const store = getWorldEventsStore();
  return store.instances.find((e) => e.id === id) || store.history.find((e) => e.id === id) || null;
}

export function playerJoinEvent(playerCitizenId, eventId) {
  const inst = getWorldEventsStore().instances.find((e) => e.id === eventId);
  if (!inst) return { ok: false, error: "not_found" };
  if (inst.status !== Lifecycle.ACTIVE && inst.status !== Lifecycle.PREPARATION) {
    return { ok: false, error: "not_joinable" };
  }
  return { ok: addParticipant(inst, playerCitizenId) };
}

export function playerLeaveEvent(playerCitizenId, eventId) {
  const inst = getWorldEventsStore().instances.find((e) => e.id === eventId);
  if (!inst) return { ok: false, error: "not_found" };
  return { ok: removeParticipant(inst, playerCitizenId) };
}

export function calendarLines() {
  const store = getWorldEventsStore();
  const lines = formatCalendar(store.calendar);
  const active = listActiveEvents();
  if (active.length) lines.push(`Active: ${active.map((e) => e.name || e.type).join(", ")}`);
  else lines.push("Active: none");
  const up = listUpcoming().slice(0, 3);
  if (up.length) lines.push(`Upcoming: ${up.map((e) => e.type).join(", ")}`);
  return lines;
}

export {
  scheduleManual,
  cancelEvent,
  listDefinitions,
  getDefinition,
  Lifecycle
};
