import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { MAX_CLINICS } from "./healthcare-data.js";

export function ensureCentralClinic(store) {
  let clinic = store.clinics.find((c) => c.clinicId === "central_clinic");
  if (!clinic) {
    clinic = {
      clinicId: "central_clinic",
      name: "Central Clinic",
      jurisdiction: store.jurisdiction || "municipal_main",
      location: null,
      capacity: 8,
      staffIds: [],
      status: "active",
      treatmentQuality: 60,
      createdAt: Date.now()
    };
    store.clinics.push(clinic);
    markDirty();
  }
  return clinic;
}

export function createClinic(store, name) {
  if (store.clinics.length >= MAX_CLINICS) return { ok: false, error: "clinic_cap" };
  const clinic = {
    clinicId: generateId("cli"),
    name: name || "Clinic",
    jurisdiction: store.jurisdiction,
    location: null,
    capacity: 6,
    staffIds: [],
    status: "active",
    treatmentQuality: 50,
    createdAt: Date.now()
  };
  store.clinics.push(clinic);
  markDirty();
  return { ok: true, clinic };
}
