import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { MAX_SCHOOLS } from "./education-data.js";

export function ensureCentralSchool(store) {
  let school = store.schools.find((s) => s.schoolId === "central_school");
  if (!school) {
    school = {
      schoolId: "central_school",
      name: "Central School",
      jurisdiction: store.jurisdiction || "municipal_main",
      location: null,
      capacity: 20,
      teacherIds: [],
      studentIds: [],
      quality: 55,
      status: "active",
      createdAt: Date.now()
    };
    store.schools.push(school);
    markDirty();
  }
  return school;
}

export function createSchool(store, name) {
  if (store.schools.length >= MAX_SCHOOLS) return { ok: false, error: "school_cap" };
  const school = {
    schoolId: generateId("sch"),
    name: name || "School",
    jurisdiction: store.jurisdiction,
    location: null,
    capacity: 16,
    teacherIds: [],
    studentIds: [],
    quality: 50,
    status: "active",
    createdAt: Date.now()
  };
  store.schools.push(school);
  markDirty();
  return { ok: true, school };
}
