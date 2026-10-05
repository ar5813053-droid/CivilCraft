/**
 * Emergency dispatch foundation. No medical or fire simulation.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { generateId } from "../core/utils.js";
import {
  createDefaultEmergency,
  normalizeEmergency,
  EMERGENCY_TYPES,
  PRIORITIES,
  MAX_ACTIVE,
  MAX_HISTORY,
  MAX_UNITS
} from "./emergency-data.js";
import { dispatchEmergency, setEmergencyStatus } from "./emergency-dispatch.js";
import { pushEmergencyEvent } from "./emergency-events.js";

export const EMERGENCY_INTERVAL_TICKS = 400;

let initialized = false;

export function initializeEmergency() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.emergency = data.emergency ? normalizeEmergency(data.emergency) : createDefaultEmergency();
  ensurePoliceUnit(data.emergency);
  markDirty();
  system.runInterval(() => {
    try {
      tickEmergencies(data.emergency);
    } catch (e) {
      Logger.error("Emergency tick failed", e);
    }
  }, EMERGENCY_INTERVAL_TICKS);
  Logger.info("Emergency manager initialized.");
}

export function getEmergencyStore() {
  const data = getWorldData();
  if (!data.emergency) data.emergency = createDefaultEmergency();
  return data.emergency;
}

export function ensurePoliceUnit(store) {
  if (store.units.some((u) => u.unitId === "unit_police_1")) return;
  store.units.push({
    unitId: "unit_police_1",
    type: "police",
    departmentId: "public_safety",
    stationId: "central_station",
    officerIds: [],
    status: "available",
    jurisdiction: store.jurisdiction || "municipal_main"
  });
  if (store.units.length > MAX_UNITS) store.units = store.units.slice(-MAX_UNITS);
}

export function createEmergency(store, input) {
  if (!store) return { ok: false, error: "no_emergency" };
  if (!EMERGENCY_TYPES.includes(input?.type)) return { ok: false, error: "invalid_type" };
  const priority = PRIORITIES.includes(input?.priority) ? input.priority : "normal";
  const emergency = {
    emergencyId: generateId("emg"),
    type: input.type,
    priority,
    reporterVillagerId: input.reporterVillagerId || null,
    location: input.location || null,
    distance: Math.max(0, Math.floor(input.distance || 0)),
    description: typeof input.description === "string" ? input.description.slice(0, 160) : "",
    jurisdiction: input.jurisdiction || store.jurisdiction || "municipal_main",
    assignedUnitId: null,
    status: "reported",
    createdAt: Date.now(),
    dispatchedAt: null,
    resolvedAt: null,
    responseTime: 0
  };
  store.emergencies.push(emergency);
  if (store.emergencies.length > MAX_ACTIVE) {
    const overflow = store.emergencies.splice(0, store.emergencies.length - MAX_ACTIVE);
    store.history.push(...overflow);
    if (store.history.length > MAX_HISTORY) store.history = store.history.slice(-MAX_HISTORY);
  }
  pushEmergencyEvent(store, "reported", emergency.emergencyId);
  const dispatched = dispatchEmergency(store, emergency);
  markDirty();
  return { ok: true, emergency, dispatch: dispatched };
}

export function resolveEmergency(store, emergencyId) {
  const emergency = store.emergencies.find((e) => e.emergencyId === emergencyId);
  if (!emergency) return { ok: false, error: "missing" };
  if (emergency.status === "dispatched") setEmergencyStatus(emergency, "responding");
  const result = setEmergencyStatus(emergency, "resolved");
  if (!result.ok) return result;
  const unit = store.units.find((u) => u.unitId === emergency.assignedUnitId);
  if (unit) unit.status = "available";
  store.history.push(emergency);
  store.emergencies = store.emergencies.filter((e) => e.emergencyId !== emergencyId);
  if (store.history.length > MAX_HISTORY) store.history = store.history.slice(-MAX_HISTORY);
  pushEmergencyEvent(store, "resolved", emergencyId);
  markDirty();
  return { ok: true, emergency };
}

function tickEmergencies(store) {
  for (const emergency of store.emergencies) {
    if (emergency.status === "queued" || emergency.status === "reported") {
      dispatchEmergency(store, emergency);
    }
  }
  markDirty();
}

export function formatEmergencyLines() {
  const store = getEmergencyStore();
  return [
    "§6Emergencies§r",
    `Open: ${store.emergencies.length}  Units: ${store.units.length}`,
    ...store.emergencies.slice(-4).map((e) => `${e.type}/${e.priority}/${e.status}`)
  ];
}
