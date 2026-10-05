import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultHealthcare, normalizeHealthcare, healthcareQuality, statusFromHealth } from "./healthcare-data.js";
import { ensureCentralClinic } from "./clinics.js";
import { treatVillager } from "./treatments.js";

export const HEALTHCARE_INTERVAL_TICKS = 900;
let initialized = false;

export function initializeHealthcare() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.healthcare = data.healthcare ? normalizeHealthcare(data.healthcare) : createDefaultHealthcare();
  ensureCentralClinic(data.healthcare);
  markDirty();
  system.runInterval(() => {
    try {
      refreshHealthStats(data.healthcare);
      markDirty();
    } catch (e) {
      Logger.error("Healthcare tick failed", e);
    }
  }, HEALTHCARE_INTERVAL_TICKS);
  Logger.info("Healthcare manager initialized.");
}

export function getHealthcare() {
  const data = getWorldData();
  if (!data.healthcare) data.healthcare = createDefaultHealthcare();
  return data.healthcare;
}

export function refreshHealthStats(store) {
  const records = store.records || [];
  store.stats.covered = records.length;
  store.stats.healthy = records.filter((r) => statusFromHealth(r.health) === "healthy").length;
  store.stats.sick = records.filter((r) => ["minor_illness", "seriously_ill"].includes(statusFromHealth(r.health))).length;
  store.stats.injured = records.filter((r) => statusFromHealth(r.health) === "injured").length;
  store.stats.critical = records.filter((r) => statusFromHealth(r.health) === "critical").length;
  store.stats.staff = store.staff.length;
  store.stats.unpaid = store.bills.filter((b) => b.status === "outstanding").reduce((s, b) => s + b.amount, 0);
  store.stats.quality = healthcareQuality(store);
}

export function handleMedicalEmergency(store, emergency) {
  if (!emergency || emergency.type !== "medical") return { ok: false, error: "not_medical" };
  if (emergency.status === "queued" || emergency.status === "reported") return { ok: false, error: "queued" };
  const staff = store.staff.find((s) => s.status === "available");
  if (!staff) return { ok: false, error: "no_staff" };
  if (!emergency.reporterVillagerId) return { ok: false, error: "no_patient" };
  return treatVillager(store, { villagerId: emergency.reporterVillagerId, staffId: staff.villagerId, conditionId: "injury" });
}

export function formatHealthLines() {
  const s = getHealthcare().stats;
  return [`§6Healthcare§r quality=${s.quality}`, `Covered ${s.covered} healthy ${s.healthy} critical ${s.critical}`, `Unpaid ${s.unpaid}`];
}

export { treatVillager };
