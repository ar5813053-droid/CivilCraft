import { markDirty } from "../core/data-store.js";
import { getVillager } from "../villagers/villager-registry.js";
import { MAX_STAFF } from "./healthcare-data.js";

const ROLES = ["healer", "nurse", "doctor"];

export function registerStaff(store, villagerId, role = "healer") {
  if (!ROLES.includes(role)) return { ok: false, error: "invalid_role" };
  if (!villagerId) return { ok: false, error: "missing_villager" };
  if (getVillager && !getVillager(villagerId)) return { ok: false, error: "missing_villager" };
  if (store.staff.some((s) => s.villagerId === villagerId)) return { ok: false, error: "duplicate" };
  const staff = {
    villagerId,
    role,
    clinicId: store.clinics[0]?.clinicId || "central_clinic",
    qualificationLevel: role === "doctor" ? 3 : role === "nurse" ? 2 : 1,
    patientsTreated: 0,
    emergenciesHandled: 0,
    status: "available"
  };
  store.staff.push(staff);
  if (store.staff.length > MAX_STAFF) store.staff = store.staff.slice(-MAX_STAFF);
  const villager = getVillager(villagerId);
  if (villager) villager.profession = role;
  markDirty();
  return { ok: true, staff };
}
