/**
 * Infrastructure registry. Data bindings only; no block placement.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultInfrastructure, normalizeInfrastructure } from "./infrastructure-data.js";
import { addFacility } from "./facilities.js";

export const INFRA_INTERVAL_TICKS = 1200;
let initialized = false;

export function initializeInfrastructure() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.infrastructure = data.infrastructure ? normalizeInfrastructure(data.infrastructure) : createDefaultInfrastructure();
  bindExistingFacilities(data);
  system.runInterval(() => {
    try {
      decayRoads(data.infrastructure);
      applyCompletedWorks(data);
      markDirty();
    } catch (e) {
      Logger.error("Infrastructure tick failed", e);
    }
  }, INFRA_INTERVAL_TICKS);
  Logger.info("Infrastructure manager initialized.");
}

export function getInfrastructure() {
  const data = getWorldData();
  if (!data.infrastructure) data.infrastructure = createDefaultInfrastructure();
  return data.infrastructure;
}

export function bindExistingFacilities(data) {
  const store = data.infrastructure;
  const links = [
    { id: "central_station", type: "police_station", capacity: 12 },
    { id: "central_clinic", type: "clinic", capacity: 8 },
    { id: "central_school", type: "school", capacity: 20 },
    { id: "municipal_hall", type: "government_building", capacity: 6 }
  ];
  for (const link of links) addFacility(store, { ...link, settlementId: "settlement_main" });
  for (const station of data.police?.stations || []) {
    station.settlementId = station.settlementId || "settlement_main";
  }
  for (const clinic of data.healthcare?.clinics || []) {
    clinic.settlementId = clinic.settlementId || "settlement_main";
  }
  for (const school of data.education?.schools || []) {
    school.settlementId = school.settlementId || "settlement_main";
  }
}

function decayRoads(store) {
  for (const road of store.roads || []) {
    if (road.condition > 40) road.condition -= 1;
  }
}

function applyCompletedWorks(data) {
  const govs = data.government?.governments || {};
  for (const gov of Object.values(govs)) {
    for (const project of gov.projects || []) {
      if (project.status === "completed" && project.infrastructureId && !project.applied) {
        const record = data.infrastructure.records.find((r) => r.id === project.infrastructureId);
        if (record) {
          record.condition = Math.min(100, (record.condition || 0) + 10);
          record.capacity = (record.capacity || 0) + 1;
          project.applied = true;
        }
      }
    }
  }
}

export function formatInfraLines() {
  const store = getInfrastructure();
  return [`§6Infrastructure§r ${store.records.length} facilities, ${store.roads.length} roads`];
}
