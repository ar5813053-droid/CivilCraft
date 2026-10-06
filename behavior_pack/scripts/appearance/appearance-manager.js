/**
 * Syncs role appearance to civilcraft:citizen entities via role_index property.
 * Simulation records remain authoritative; this only updates visuals.
 */

import { world, system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData } from "../core/data-store.js";
import { selectAppearance, ROLE_APPEARANCE, hashId } from "../civilization/appearance.js";
import { selectFestivalAppearance } from "./festival-appearance.js";
import { listActiveFestivals } from "../culture/culture-manager.js";
import { getEmploymentStore } from "../employment/employment-manager.js";
import { getEmploymentSnapshot } from "../employment/employment-records.js";
import { getGovernment } from "../government/leadership.js";

export const ROLE_INDEX = Object.freeze({
  "civilian": 0,
  "civilcraft_civilian": 0,
  "farmer": 1,
  "civilcraft_farmer": 1,
  "worker": 2,
  "civilcraft_worker": 2,
  "builder": 3,
  "civilcraft_builder": 3,
  "trader": 4,
  "civilcraft_trader": 4,
  "doctor": 5,
  "civilcraft_doctor": 5,
  "nurse": 6,
  "civilcraft_nurse": 6,
  "teacher": 7,
  "civilcraft_teacher": 7,
  "police": 8,
  "civilcraft_police": 8,
  "emergency": 9,
  "civilcraft_emergency": 9,
  "mayor": 10,
  "civilcraft_mayor": 10,
  "leader": 11,
  "civilcraft_leader": 11,
  "soldier": 12,
  "civilcraft_soldier": 12,
  "student": 13,
  "civilcraft_student": 13,
  "civilian_a": 14,
  "civilcraft_civilian_a": 14,
  "civilian_b": 15,
  "civilcraft_civilian_b": 15,
  "civilian_c": 16,
  "civilcraft_civilian_c": 16,
  "civilian_d": 17,
  "civilcraft_civilian_d": 17,
  "festival_christmas_farmer": 18,
  "festival_christmas_worker": 19,
  "festival_christmas_builder": 20,
  "festival_christmas_trader": 21,
  "festival_christmas_doctor": 22,
  "festival_christmas_nurse": 23,
  "festival_christmas_teacher": 24,
  "festival_christmas_police": 25,
  "festival_christmas_emergency": 26,
  "festival_christmas_mayor": 27,
  "festival_christmas_leader": 28,
  "festival_christmas_soldier": 29,
  "festival_christmas_student": 30,
  "festival_christmas_civilian": 31,
  "festival_diwali_farmer": 32,
  "festival_diwali_worker": 33,
  "festival_diwali_builder": 34,
  "festival_diwali_trader": 35,
  "festival_diwali_doctor": 36,
  "festival_diwali_nurse": 37,
  "festival_diwali_teacher": 38,
  "festival_diwali_police": 39,
  "festival_diwali_emergency": 40,
  "festival_diwali_mayor": 41,
  "festival_diwali_leader": 42,
  "festival_diwali_soldier": 43,
  "festival_diwali_student": 44,
  "festival_diwali_civilian": 45,
  "festival_holi_farmer": 46,
  "festival_holi_worker": 47,
  "festival_holi_builder": 48,
  "festival_holi_trader": 49,
  "festival_holi_doctor": 50,
  "festival_holi_nurse": 51,
  "festival_holi_teacher": 52,
  "festival_holi_police": 53,
  "festival_holi_emergency": 54,
  "festival_holi_mayor": 55,
  "festival_holi_leader": 56,
  "festival_holi_soldier": 57,
  "festival_holi_student": 58,
  "festival_holi_civilian": 59,
  "festival_ramadan_farmer": 60,
  "festival_ramadan_worker": 61,
  "festival_ramadan_builder": 62,
  "festival_ramadan_trader": 63,
  "festival_ramadan_doctor": 64,
  "festival_ramadan_nurse": 65,
  "festival_ramadan_teacher": 66,
  "festival_ramadan_police": 67,
  "festival_ramadan_emergency": 68,
  "festival_ramadan_mayor": 69,
  "festival_ramadan_leader": 70,
  "festival_ramadan_soldier": 71,
  "festival_ramadan_student": 72,
  "festival_ramadan_civilian": 73,
  "festival_eid_farmer": 74,
  "festival_eid_worker": 75,
  "festival_eid_builder": 76,
  "festival_eid_trader": 77,
  "festival_eid_doctor": 78,
  "festival_eid_nurse": 79,
  "festival_eid_teacher": 80,
  "festival_eid_police": 81,
  "festival_eid_emergency": 82,
  "festival_eid_mayor": 83,
  "festival_eid_leader": 84,
  "festival_eid_soldier": 85,
  "festival_eid_student": 86,
  "festival_eid_civilian": 87,
});

export function appearanceKeyToIndex(key) {
  if (key in ROLE_INDEX) return ROLE_INDEX[key];
  return ROLE_INDEX.civilcraft_civilian;
}

export function resolveAppearanceForRecord(villager) {
  if (!villager) return "civilcraft_civilian";
  const emp = getEmploymentSnapshot(getEmploymentStore(), villager.id);
  const jobId = emp.jobId || villager.profession;
  const gov = getGovernment();
  const isMayor = gov?.leadership?.mayor?.villagerId === villager.id;
  const isLeader = false;
  // Festival appearance if participating in active festival
  try {
    const active = listActiveFestivals();
    for (const track of active) {
      if (track.status !== "active" && track.status !== "preparation") continue;
      if (!(track.participantIds || []).includes(villager.id)) continue;
      const festKey = selectFestivalAppearance(track.festivalId, jobId, villager.id);
      if (festKey) return festKey;
    }
  } catch { /* culture optional */ }
  return selectAppearance(villager, {
    jobId,
    isMayor,
    isLeader
  });
}

/**
 * Apply appearance property to a civilcraft:citizen entity.
 * @param {import("@minecraft/server").Entity} entity
 * @param {string} appearanceKey
 */
export function applyAppearanceToEntity(entity, appearanceKey) {
  if (!entity || entity.typeId !== "civilcraft:citizen") return false;
  try {
    const idx = appearanceKeyToIndex(appearanceKey);
    entity.setProperty("civilcraft:role_index", idx);
    return true;
  } catch (e) {
    Logger.warn(`Appearance apply failed: ${e}`);
    return false;
  }
}

const APPEARANCE_INTERVAL = 200;
let initialized = false;

export function initializeAppearance() {
  if (initialized) return;
  initialized = true;
  system.runInterval(() => {
    try {
      syncNearbyAppearances();
    } catch (e) {
      Logger.error("Appearance sync failed", e);
    }
  }, APPEARANCE_INTERVAL);
  Logger.info("Appearance manager initialized.");
}

function syncNearbyAppearances() {
  const data = getWorldData();
  const dims = [];
  try {
    for (const p of world.getAllPlayers()) {
      dims.push(p.dimension);
    }
  } catch {
    return;
  }
  const seen = new Set();
  for (const dim of dims) {
    if (!dim || seen.has(dim.id)) continue;
    seen.add(dim.id);
    let entities;
    try {
      entities = dim.getEntities({ type: "civilcraft:citizen", closest: 40 });
    } catch {
      continue;
    }
    for (const ent of entities) {
      const idTag = (ent.getTags() || []).find((t) => t.startsWith("cc_id:"));
      const vid = idTag ? idTag.slice(6) : null;
      const record = vid ? data.villagers?.[vid] : null;
      const key = record ? resolveAppearanceForRecord(record) : "civilcraft_civilian";
      applyAppearanceToEntity(ent, key);
    }
  }
}

export function bindEntityToVillager(entity, villagerId) {
  if (!entity) return;
  try {
    for (const t of entity.getTags()) {
      if (t.startsWith("cc_id:")) entity.removeTag(t);
    }
    entity.addTag(`cc_id:${villagerId}`);
    const data = getWorldData();
    const record = data.villagers?.[villagerId];
    applyAppearanceToEntity(entity, resolveAppearanceForRecord(record || { id: villagerId }));
  } catch (e) {
    Logger.warn(`bindEntity failed: ${e}`);
  }
}
