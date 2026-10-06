/**
 * Safe bounded decoration placement.
 * Only replaces air/replaceable; records ownership; cleanup restores only CivilCraft-owned.
 */

import { world } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { markDirty } from "../core/data-store.js";

export const MAX_DECORATIONS = 80;
export const DECOR_BATCH = 8;

/** Blocks considered safe to replace */
const REPLACEABLE = new Set([
  "minecraft:air",
  "minecraft:short_grass",
  "minecraft:tall_grass",
  "minecraft:snow_layer"
]);

/** Festival-themed placeable blocks (vanilla only) */
export const DECOR_PALETTE = Object.freeze({
  christmas: ["minecraft:red_wool", "minecraft:green_wool", "minecraft:oak_fence", "minecraft:lantern"],
  diwali: ["minecraft:orange_wool", "minecraft:yellow_wool", "minecraft:lantern", "minecraft:torch"],
  holi: ["minecraft:pink_wool", "minecraft:purple_wool", "minecraft:yellow_wool", "minecraft:red_wool"],
  ramadan: ["minecraft:lantern", "minecraft:blue_wool", "minecraft:white_wool", "minecraft:torch"],
  eid: ["minecraft:gold_block", "minecraft:white_wool", "minecraft:lantern", "minecraft:yellow_wool"]
});

export function createDecorationStore() {
  return { records: [], cursor: 0 };
}

/**
 * Queue decorative placements around a center (data-driven; physical place is optional).
 */
export function planDecorations(store, festivalId, center, radius = 6) {
  if (!center || center.x == null) return [];
  const palette = DECOR_PALETTE[festivalId] || DECOR_PALETTE.christmas;
  const planned = [];
  const offsets = [
    [2, 0, 0], [-2, 0, 0], [0, 0, 2], [0, 0, -2],
    [3, 0, 3], [-3, 0, 3], [3, 0, -3], [-3, 0, -3],
    [0, 1, 0], [4, 0, 0], [-4, 0, 0], [0, 0, 4]
  ];
  for (let i = 0; i < offsets.length && planned.length < DECOR_BATCH; i++) {
    const [dx, dy, dz] = offsets[i];
    planned.push({
      decorationId: `dec_${festivalId}_${store.records.length + planned.length}`,
      festivalId,
      x: Math.floor(center.x + dx),
      y: Math.floor(center.y + dy),
      z: Math.floor(center.z + dz),
      placedBlock: palette[i % palette.length],
      originalBlock: null,
      owner: "civilcraft",
      placed: false
    });
  }
  return planned;
}

/**
 * Place one batch of decorations in the overworld if dimension available.
 */
export function placeDecorationBatch(store, planned) {
  let dim;
  try {
    dim = world.getDimension("overworld");
  } catch {
    // No runtime world — keep as planned records only
    for (const p of planned) {
      store.records.push({ ...p, placed: false, deferred: true });
    }
    if (store.records.length > MAX_DECORATIONS) store.records = store.records.slice(-MAX_DECORATIONS);
    markDirty();
    return { placed: 0, deferred: planned.length };
  }

  let placed = 0;
  for (const p of planned) {
    try {
      const block = dim.getBlock({ x: p.x, y: p.y, z: p.z });
      if (!block) continue;
      const typeId = block.typeId;
      if (!REPLACEABLE.has(typeId)) continue;
      p.originalBlock = typeId;
      block.setType(p.placedBlock);
      p.placed = true;
      store.records.push(p);
      placed++;
    } catch (e) {
      Logger.warn(`Decor place failed: ${e}`);
    }
  }
  if (store.records.length > MAX_DECORATIONS) store.records = store.records.slice(-MAX_DECORATIONS);
  markDirty();
  return { placed, deferred: 0 };
}

/**
 * Restore only CivilCraft-owned decorations for a festival.
 */
export function cleanupFestivalDecorations(store, festivalId) {
  let dim;
  try {
    dim = world.getDimension("overworld");
  } catch {
    dim = null;
  }
  let restored = 0;
  const remaining = [];
  for (const r of store.records) {
    if (r.festivalId !== festivalId) {
      remaining.push(r);
      continue;
    }
    if (!r.placed || !dim) {
      restored++;
      continue;
    }
    try {
      const block = dim.getBlock({ x: r.x, y: r.y, z: r.z });
      if (block && block.typeId === r.placedBlock) {
        block.setType(r.originalBlock || "minecraft:air");
        restored++;
      }
    } catch {
      remaining.push(r); // retry later
    }
  }
  store.records = remaining;
  markDirty();
  return { restored };
}
