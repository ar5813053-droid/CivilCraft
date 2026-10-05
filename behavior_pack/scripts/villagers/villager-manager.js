/**
 * Bridges runtime entities and persistent villager identities.
 *
 * Responsibilities:
 * - Detect/attach CivilCraft identity to vanilla villagers
 * - Keep entity dynamic property + tag in sync
 * - Provide active-set helpers for the simulation manager
 */

import { world } from "@minecraft/server";
import {
  ENTITY_VILLAGER_ID_KEY,
  MANAGED_VILLAGER_TAG
} from "../core/constants.js";
import { Logger } from "../core/logger.js";
import { isVillagerEntity } from "../core/utils.js";
import {
  registerVillager,
  getVillager,
  patchVillager,
  findByEntityId
} from "./villager-registry.js";

/**
 * @typedef {import("@minecraft/server").Entity} Entity
 * @typedef {import("./villager-identity.js").VillagerRecord} VillagerRecord
 */

/**
 * Reads the CivilCraft villager ID from an entity, if present.
 * @param {Entity} entity
 * @returns {string|undefined}
 */
export function getLinkedVillagerId(entity) {
  try {
    const value = entity.getDynamicProperty(ENTITY_VILLAGER_ID_KEY);
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Links an entity to a villager identity.
 * @param {Entity} entity
 * @param {string} villagerId
 */
export function linkEntity(entity, villagerId) {
  try {
    entity.setDynamicProperty(ENTITY_VILLAGER_ID_KEY, villagerId);
    if (!entity.hasTag(MANAGED_VILLAGER_TAG)) {
      entity.addTag(MANAGED_VILLAGER_TAG);
    }
    patchVillager(villagerId, { entityId: entity.id });
  } catch (e) {
    Logger.warn(`Failed to link entity ${entity.id} to ${villagerId}`, e);
  }
}

/**
 * Ensures a villager entity has a CivilCraft identity.
 * Creates a new record if none exists.
 * @param {Entity} entity
 * @param {Partial<VillagerRecord>} [seed]
 * @returns {VillagerRecord|null}
 */
export function ensureManaged(entity, seed = {}) {
  if (!isVillagerEntity(entity)) return null;

  const existingId = getLinkedVillagerId(entity);
  if (existingId) {
    const record = getVillager(existingId);
    if (record) {
      // Refresh runtime entity id
      if (record.entityId !== entity.id) {
        patchVillager(existingId, { entityId: entity.id });
      }
      return record;
    }
    // Stale link — fall through and re-register
  }

  // Try matching by previous entity id (rare)
  const byEntity = findByEntityId(entity.id);
  if (byEntity) {
    linkEntity(entity, byEntity.id);
    return byEntity;
  }

  const record = registerVillager({
    ...seed,
    entityId: entity.id
  });
  linkEntity(entity, record.id);
  return record;
}

/**
 * Collects managed villager entities currently loaded near a location.
 * Uses a bounded radius to stay performance-friendly.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {{x:number,y:number,z:number}} location
 * @param {number} radius
 * @returns {{entity: Entity, record: VillagerRecord}[]}
 */
export function getManagedNear(dimension, location, radius) {
  const results = [];
  try {
    const entities = dimension.getEntities({
      location,
      maxDistance: radius,
      type: "minecraft:villager_v2"
    });
    // Also include legacy villager if present
    const legacy = dimension.getEntities({
      location,
      maxDistance: radius,
      type: "minecraft:villager"
    });

    const all = [...entities, ...legacy];
    for (const entity of all) {
      const id = getLinkedVillagerId(entity);
      if (!id) continue;
      const record = getVillager(id);
      if (record) {
        results.push({ entity, record });
      }
    }
  } catch (e) {
    Logger.debug("getManagedNear failed", e);
  }
  return results;
}

/**
 * Attempts to manage a single entity if it is a villager and not yet managed.
 * Called from spawn/load events.
 * @param {Entity} entity
 */
export function tryAdoptEntity(entity) {
  if (!isVillagerEntity(entity)) return;
  // Phase 1: only adopt if already tagged or explicitly requested later.
  // Automatic mass-adoption is intentionally avoided for performance.
  if (entity.hasTag(MANAGED_VILLAGER_TAG) || getLinkedVillagerId(entity)) {
    ensureManaged(entity);
  }
}

/**
 * Debug helper: force-manage all villagers near players.
 * Should only be used via development commands.
 * @param {number} [radius=48]
 * @returns {number} number of newly or already managed villagers
 */
export function forceManageNearPlayers(radius = 48) {
  let count = 0;
  for (const player of world.getAllPlayers()) {
    const nearby = player.dimension.getEntities({
      location: player.location,
      maxDistance: radius,
      families: ["villager"]
    });
    for (const entity of nearby) {
      if (isVillagerEntity(entity)) {
        ensureManaged(entity);
        count++;
      }
    }
  }
  Logger.info(`Force-managed ${count} villagers near players.`);
  return count;
}
