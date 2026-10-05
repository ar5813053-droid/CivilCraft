import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultEducation, normalizeEducation, educationQuality, skillBonus, LEVELS } from "./education-data.js";
import { ensureCentralSchool } from "./schools.js";
import { advanceProgress } from "./students.js";

export const EDUCATION_INTERVAL_TICKS = 1000;
let initialized = false;

export function initializeEducation() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.education = data.education ? normalizeEducation(data.education) : createDefaultEducation();
  ensureCentralSchool(data.education);
  markDirty();
  system.runInterval(() => {
    try {
      for (const record of data.education.records) {
        if (record.enrolled) advanceProgress(record, 5);
      }
      refreshEducationStats(data.education);
      markDirty();
    } catch (e) {
      Logger.error("Education tick failed", e);
    }
  }, EDUCATION_INTERVAL_TICKS);
  Logger.info("Education manager initialized.");
}

export function getEducation() {
  const data = getWorldData();
  if (!data.education) data.education = createDefaultEducation();
  return data.education;
}

export function refreshEducationStats(store) {
  const enrolled = store.records.filter((r) => r.enrolled);
  store.stats.enrolled = enrolled.length;
  store.stats.teachers = store.teachers.length;
  store.stats.schools = store.schools.length;
  store.stats.attendance = enrolled.length
    ? Math.round(enrolled.reduce((s, r) => s + (r.attendance || 0), 0) / enrolled.length)
    : 0;
  store.stats.literacy = store.records.length
    ? Math.round(store.records.reduce((s, r) => s + (r.literacy || 0), 0) / store.records.length)
    : 0;
  store.stats.graduates = store.records.filter((r) => r.educationLevel !== "none").length;
  const levelIndex = store.records.map((r) => Math.max(0, LEVELS.indexOf(r.educationLevel)));
  store.stats.averageLevel = levelIndex.length
    ? Math.round((levelIndex.reduce((a, b) => a + b, 0) / levelIndex.length) * 10) / 10
    : 0;
  const capacity = store.schools.reduce((s, sc) => s + (sc.capacity || 0), 0);
  store.stats.utilization = capacity ? Math.round((enrolled.length / capacity) * 100) : 0;
  store.stats.quality = educationQuality(store);
  for (const record of store.records) record.skillBonus = skillBonus(record.educationLevel);
}

export function formatEducationLines() {
  const s = getEducation().stats;
  return [`§6Education§r quality=${s.quality}`, `Enrolled ${s.enrolled} teachers ${s.teachers}`, `Literacy ${s.literacy}`];
}
