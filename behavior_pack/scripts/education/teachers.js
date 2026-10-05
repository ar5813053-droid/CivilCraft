import { markDirty } from "../core/data-store.js";
import { getVillager } from "../villagers/villager-registry.js";
import { MAX_TEACHERS } from "./education-data.js";

export function registerTeacher(store, villagerId) {
  if (!villagerId) return { ok: false, error: "missing_villager" };
  if (getVillager && !getVillager(villagerId)) return { ok: false, error: "missing_villager" };
  if (store.teachers.some((t) => t.villagerId === villagerId)) return { ok: false, error: "duplicate" };
  const teacher = {
    villagerId,
    schoolId: store.schools[0]?.schoolId || "central_school",
    qualificationLevel: 2,
    classesTaught: 0,
    studentsTaught: 0,
    performance: 60
  };
  store.teachers.push(teacher);
  if (store.teachers.length > MAX_TEACHERS) store.teachers = store.teachers.slice(-MAX_TEACHERS);
  const villager = getVillager(villagerId);
  if (villager) villager.profession = "teacher";
  markDirty();
  return { ok: true, teacher };
}
