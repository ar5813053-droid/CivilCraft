/**
 * Syncs role appearance to civilcraft:citizen entities via role_index property.
 * Simulation records remain authoritative; this only updates visuals.
 */

import { world, system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData } from "../core/data-store.js";
import { selectAppearance, ROLE_APPEARANCE, hashId } from "../civilization/appearance.js";
import { getEmploymentStore } from "../employment/employment-manager.js";
import { getEmploymentSnapshot } from "../employment/employment-records.js";
import { getGovernment } from "../government/leadership.js";

export const ROLE_INDEX = Object.freeze({
  civilcraft_civilian: 0,
  civilcraft_farmer: 1,
  civilcraft_worker: 2,
  civilcraft_builder: 3,
  civilcraft_trader: 4,
  civilcraft_doctor: 5,
  civilcraft_nurse: 6,
  civilcraft_teacher: 7,
  civilcraft_police: 8,
  civilcraft_emergency: 9,
  civilcraft_mayor: 10,
  civilcraft_leader: 11,
  civilcraft_soldier: 12,
  civilcraft_student: 13,
  civilcraft_civilian_a: 14,
  civilcraft_civilian_b: 15,
  civilcraft_civilian_c: 16,
  civilcraft_civilian_d: 17
});

export function appearanceKeyToIndex(key) {
  if (key in ROLE_INDEX) return ROLE_INDEX[key];
  return ROLE_INDEX.civilcraft_civilian;
}

export function resolveAppearanceForRecord(villager) {
  if (!villager) return "civilcraft_civilian";
  const emp = getEmploymentSnapshot(getEmploymentStore(), villager.id);
  const gov = getGovernment();
  const isMayor = gov?.leadership?.mayor?.villagerId === villager.id;
  const isLeader = false;
  return selectAppearance(villager, {
    jobId: emp.jobId || villager.profession,
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
