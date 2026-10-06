/**
 * Job-site travel for civilcraft:citizen entities near players.
 * Step-teleport toward capital facilities (Bedrock-safe, bounded).
 */

import { world, system } from "@minecraft/server";
import { getWorldData } from "../core/data-store.js";
import { getFacility } from "../worldgen/capital-builder.js";
import { getEmploymentSnapshot } from "../employment/employment-records.js";
import { getEmploymentStore } from "../employment/employment-manager.js";
import { Logger } from "../core/logger.js";

const INTERVAL = 120;
const STEP = 2.2;
const ARRIVE = 3.5;
const MAX_PER_TICK = 8;
let initialized = false;

const JOB_FACILITY = Object.freeze({
  farmer: "farms",
  farm_worker: "farms",
  worker: "market",
  builder: "government",
  construction: "government",
  trader: "market",
  shop_employee: "market",
  doctor: "clinic",
  nurse: "clinic",
  teacher: "school",
  student: "school",
  police_officer: "police",
  emergency_worker: "police",
  soldier: "barracks",
  government_worker: "government",
  mayor: "government"
});

function stepToward(entity, target) {
  try {
    const loc = entity.location;
    const dx = target.x + 2 - loc.x;
    const dz = target.z + 2 - loc.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < ARRIVE) return true;
    const scale = Math.min(STEP, dist) / dist;
    entity.teleport(
      { x: loc.x + dx * scale, y: loc.y, z: loc.z + dz * scale },
      { dimension: entity.dimension, keepVelocity: false }
    );
    return false;
  } catch {
    return false;
  }
}

export function initializeJobNavigation() {
  if (initialized) return;
  initialized = true;
  system.runInterval(() => {
    try {
      tickNavigation();
    } catch (e) {
      Logger.warn(`Job nav: ${e}`);
    }
  }, INTERVAL);
  Logger.info("Job navigation initialized.");
}

function tickNavigation() {
  if (!getWorldData().worldgen?.capitalBuilt) return;
  const empStore = getEmploymentStore();
  let processed = 0;
  for (const player of world.getAllPlayers()) {
    if (processed >= MAX_PER_TICK) break;
    let ents = [];
    try {
      ents = player.dimension.getEntities({
        type: "civilcraft:citizen",
        location: player.location,
        maxDistance: 64
      });
    } catch {
      continue;
    }
    for (const ent of ents) {
      if (processed >= MAX_PER_TICK) break;
      const vid = ent.getDynamicProperty?.("civilcraft:villager_id") || ent.nameTag || null;
      // Match by nearby record profession when tag missing
      let jobId = "worker";
      if (vid) {
        jobId = getEmploymentSnapshot(empStore, String(vid)).jobId || "worker";
      }
      const fac = JOB_FACILITY[jobId] || "market";
      const target = getFacility(fac);
      if (target) {
        stepToward(ent, target);
        processed++;
      }
    }
  }
}
