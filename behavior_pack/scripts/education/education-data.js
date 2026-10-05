export const EDUCATION_VERSION = 1;
export const MAX_EDU_RECORDS = 500;
export const MAX_SCHOOLS = 20;
export const MAX_TEACHERS = 100;
export const MAX_CLASSES = 100;
export const MAX_EDU_EVENTS = 100;
export const MIN_STUDENT_AGE = 6;
export const MAX_STUDENT_AGE = 18;
export const LEVELS = ["none", "primary", "secondary", "vocational", "advanced"];
export const SUBJECTS = ["literacy", "mathematics", "science", "civics", "vocational"];
export const SKILL_BONUS = { none: 0, primary: 0.03, secondary: 0.06, vocational: 0.1, advanced: 0.12 };

export function createDefaultEducation() {
  return {
    version: EDUCATION_VERSION,
    jurisdiction: "municipal_main",
    records: [],
    schools: [],
    teachers: [],
    classes: [],
    events: [],
    stats: { enrolled: 0, teachers: 0, schools: 0, attendance: 0, averageLevel: 0, literacy: 0, graduates: 0, spending: 0, utilization: 0, quality: 50 }
  };
}

export function normalizeEducation(raw) {
  const base = createDefaultEducation();
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    version: raw.version || EDUCATION_VERSION,
    records: Array.isArray(raw.records) ? raw.records.slice(-MAX_EDU_RECORDS) : [],
    schools: Array.isArray(raw.schools) ? raw.schools.slice(-MAX_SCHOOLS) : [],
    teachers: Array.isArray(raw.teachers) ? raw.teachers.slice(-MAX_TEACHERS) : [],
    classes: Array.isArray(raw.classes) ? raw.classes.slice(-MAX_CLASSES) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_EDU_EVENTS) : [],
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}

export function skillBonus(level) {
  return SKILL_BONUS[level] || 0;
}

export function eligibleAge(age) {
  return typeof age === "number" && age >= MIN_STUDENT_AGE && age <= MAX_STUDENT_AGE;
}

export function educationQuality(store) {
  const teachers = store?.teachers?.length || 0;
  const capacity = (store?.schools || []).reduce((s, sc) => s + (sc.capacity || 0), 0);
  const attendance = store?.stats?.attendance || 0;
  return Math.max(0, Math.min(100, 35 + teachers * 6 + Math.min(20, capacity) + Math.min(15, Math.floor(attendance / 5))));
}
