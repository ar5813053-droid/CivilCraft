/**
 * Officer records linked to existing villager ids. No duplicate identity.
 */

import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { getVillager } from "../villagers/villager-registry.js";
import { MAX_OFFICERS } from "./police-data.js";
import { isValidRank } from "./ranks.js";
import { pushPoliceEvent } from "./police-events.js";

export function hireOfficer(store, villagerId, rank = "recruit") {
  if (!store) return { ok: false, error: "no_police" };
  if (!villagerId) return { ok: false, error: "missing_villager" };
  if (getVillager && !getVillager(villagerId)) return { ok: false, error: "missing_villager" };
  if (!isValidRank(rank)) return { ok: false, error: "invalid_rank" };
  if (store.officers.some((o) => o.villagerId === villagerId)) {
    return { ok: false, error: "duplicate_officer" };
  }
  const officer = {
    officerId: generateId("off"),
    villagerId,
    rank,
    departmentId: "public_safety",
    stationId: store.stations[0]?.stationId || "central_station",
    jurisdiction: store.jurisdiction || "municipal_main",
    status: "available",
    shiftId: "day",
    patrolId: null,
    arrests: 0,
    warnings: 0,
    violationsReported: 0,
    emergencyResponses: 0,
    createdAt: Date.now()
  };
  store.officers.push(officer);
  if (store.officers.length > MAX_OFFICERS) store.officers = store.officers.slice(-MAX_OFFICERS);
  const villager = getVillager(villagerId);
  if (villager) villager.profession = "police_officer";
  pushPoliceEvent(store, "officer_hired", villagerId);
  markDirty();
  return { ok: true, officer };
}

export function getOfficerByVillager(store, villagerId) {
  return store?.officers?.find((o) => o.villagerId === villagerId);
}

export function availableOfficers(store) {
  return (store?.officers || []).filter((o) => o.status === "available" || o.status === "patrol");
}
