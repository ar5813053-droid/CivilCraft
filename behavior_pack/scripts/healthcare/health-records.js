import { markDirty } from "../core/data-store.js";
import { MAX_HEALTH_RECORDS, statusFromHealth } from "./healthcare-data.js";

export function ensureHealthRecord(store, villagerId) {
  if (!store || !villagerId) return null;
  let record = store.records.find((r) => r.villagerId === villagerId);
  if (!record) {
    record = {
      villagerId,
      health: 80,
      maxHealth: 100,
      condition: null,
      status: "healthy",
      lastTreatmentAt: null,
      clinicId: null,
      doctorId: null,
      medicalVisits: 0,
      medicalExpenses: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    store.records.push(record);
    if (store.records.length > MAX_HEALTH_RECORDS) store.records = store.records.slice(-MAX_HEALTH_RECORDS);
    markDirty();
  }
  record.status = statusFromHealth(record.health);
  return record;
}

export function setHealth(store, villagerId, health) {
  const record = ensureHealthRecord(store, villagerId);
  if (!record) return { ok: false, error: "invalid" };
  record.health = Math.max(0, Math.min(100, Math.floor(health)));
  record.status = statusFromHealth(record.health);
  record.updatedAt = Date.now();
  markDirty();
  return { ok: true, record };
}
