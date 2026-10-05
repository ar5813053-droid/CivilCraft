import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { SUBJECTS, MAX_CLASSES } from "./education-data.js";

export function createClass(store, subject, teacherId) {
  if (!SUBJECTS.includes(subject)) return { ok: false, error: "invalid_subject" };
  if (!store.teachers.some((t) => t.villagerId === teacherId)) return { ok: false, error: "missing_teacher" };
  const school = store.schools[0];
  const klass = {
    classId: generateId("cls"),
    schoolId: school?.schoolId || "central_school",
    subject,
    educationLevel: "primary",
    teacherId,
    studentIds: (school?.studentIds || []).slice(0, 12),
    progress: 0,
    scheduledAt: Date.now(),
    status: "scheduled"
  };
  store.classes.push(klass);
  if (store.classes.length > MAX_CLASSES) store.classes = store.classes.slice(-MAX_CLASSES);
  const teacher = store.teachers.find((t) => t.villagerId === teacherId);
  if (teacher) teacher.classesTaught += 1;
  markDirty();
  return { ok: true, class: klass };
}
