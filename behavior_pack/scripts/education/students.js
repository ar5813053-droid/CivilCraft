import { markDirty } from "../core/data-store.js";
import { getVillager } from "../villagers/villager-registry.js";
import { MAX_EDU_RECORDS, eligibleAge, LEVELS } from "./education-data.js";
import { pushEducationEvent } from "./education-events.js";

export function enrollStudent(store, villagerId) {
  if (!store || !villagerId) return { ok: false, error: "invalid" };
  const villager = getVillager(villagerId);
  if (!villager) return { ok: false, error: "missing_villager" };
  if (!eligibleAge(villager.age ?? 10)) return { ok: false, error: "ineligible_age" };
  const school = store.schools[0];
  if (!school) return { ok: false, error: "no_school" };
  if (school.studentIds.length >= school.capacity) return { ok: false, error: "school_full" };
  let record = store.records.find((r) => r.villagerId === villagerId);
  if (!record) {
    record = {
      villagerId,
      educationLevel: "none",
      literacy: 20,
      skillBonus: 0,
      schoolId: school.schoolId,
      enrolled: true,
      attendance: 0,
      completedClasses: 0,
      educationExpenses: 0,
      performance: 50,
      graduationProgress: 0,
      enrolledAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    store.records.push(record);
    if (store.records.length > MAX_EDU_RECORDS) store.records = store.records.slice(-MAX_EDU_RECORDS);
  }
  record.enrolled = true;
  record.schoolId = school.schoolId;
  if (!school.studentIds.includes(villagerId)) school.studentIds.push(villagerId);
  pushEducationEvent(store, "enrolled", villagerId);
  markDirty();
  return { ok: true, record };
}

export function advanceProgress(record, amount = 10) {
  if (!record || !record.enrolled) return { ok: false, error: "not_enrolled" };
  record.attendance = Math.min(100, (record.attendance || 0) + 5);
  record.graduationProgress = Math.min(100, (record.graduationProgress || 0) + amount);
  record.literacy = Math.min(100, (record.literacy || 0) + 2);
  record.updatedAt = Date.now();
  return { ok: true, record };
}

export function graduate(record) {
  if (!record) return { ok: false, error: "missing" };
  if ((record.graduationProgress || 0) < 100) return { ok: false, error: "incomplete" };
  const idx = LEVELS.indexOf(record.educationLevel);
  record.educationLevel = LEVELS[Math.min(LEVELS.length - 1, idx + 1)] || "primary";
  record.graduationProgress = 0;
  record.completedClasses += 1;
  record.enrolled = record.educationLevel !== "advanced";
  return { ok: true, record };
}
