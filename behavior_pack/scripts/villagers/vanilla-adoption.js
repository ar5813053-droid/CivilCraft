/**
 * Bounded adoption of nearby vanilla villagers into CivilCraft citizen records.
 * Does not rewrite vanilla villager AI; creates simulation records only.
 */

import { world, system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { generateId } from "../core/utils.js";
import { ensureDemographics } from "../population/demographics.js";

const ADOPT_INTERVAL = 600; // 30s
const MAX_ADOPT_PER_TICK = 3;
const MAX_TOTAL = 200;
const SCAN_RADIUS = 48;

let initialized = false;

function stableIdFromEntity(entity) {
  try {
    // Prefer unique id if available
    if (entity.id != null) return `van_${String(entity.id).replace(/[^a-zA-Z0-9]/g, "").slice(-12)}`;
  } catch {
    /* */
  }
  const loc = entity.location || { x: 0, y: 0, z: 0 };
  return `van_${Math.floor(loc.x)}_${Math.floor(loc.y)}_${Math.floor(loc.z)}`;
}

export function initializeVanillaAdoption() {
  if (initialized) return;
  initialized = true;
  system.runInterval(() => {
    try {
      adoptNearbyVillagers();
    } catch (e) {
      Logger.warn(`Vanilla adoption: ${e}`);
    }
  }, ADOPT_INTERVAL);
  Logger.info("Vanilla villager adoption initialized (bounded).");
}

function adoptNearbyVillagers() {
  const data = getWorldData();
  if (!data.villagers) data.villagers = {};
  const count = Object.keys(data.villagers).length;
  if (count >= MAX_TOTAL) return;

  let adopted = 0;
  const players = world.getAllPlayers();
  if (!players.length) return;

  for (const player of players) {
    if (adopted >= MAX_ADOPT_PER_TICK) break;
    let entities = [];
    try {
      entities = player.dimension.getEntities({
        type: "minecraft:villager_v2",
        location: player.location,
        maxDistance: SCAN_RADIUS
      });
    } catch {
      try {
        entities = player.dimension.getEntities({
          type: "minecraft:villager",
          location: player.location,
          maxDistance: SCAN_RADIUS
        });
      } catch {
        return;
      }
    }
    for (const ent of entities) {
      if (adopted >= MAX_ADOPT_PER_TICK) break;
      if (count + adopted >= MAX_TOTAL) break;
      const id = stableIdFromEntity(ent);
      if (data.villagers[id]) continue;
      // Tag entity to avoid re-processing storms
      try {
        if (ent.hasTag && ent.hasTag("civilcraft_adopted")) continue;
        if (ent.addTag) ent.addTag("civilcraft_adopted");
      } catch {
        /* tags optional */
      }
      const rec = {
        id,
        name: `Villager_${id.slice(-4)}`,
        age: 30,
        lifeStage: "adult",
        profession: "citizen",
        settlementId: "settlement_main",
        alive: true,
        health: 90,
        educationLevel: "none",
        source: "vanilla_adopt"
      };
      ensureDemographics(rec);
      data.villagers[id] = rec;
      adopted++;
    }
  }
  if (adopted) {
    markDirty();
    Logger.info(`Adopted ${adopted} vanilla villagers into CivilCraft records`);
  }
}
