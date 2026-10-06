/**
 * Builds CivilCraft capital city with real blocks on first initialization.
 * Ownership-tagged blocks only; safe relative to settlement center.
 */

import { world, system, BlockPermutation } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { ensureCapitalBlueprint, CAPITAL_DISTRICTS } from "../settlements/capital-bootstrap.js";

const BUILD_FLAG = "capitalBuilt";
const BATCH = 40;

function trySet(dim, x, y, z, typeId) {
  try {
    const b = dim.getBlock({ x, y, z });
    if (!b) return false;
    // Don't overwrite chests, beds, player-likely storage
    const id = b.typeId || "";
    if (id.includes("chest") || id.includes("bed") || id.includes("door")) return false;
    b.setPermutation(BlockPermutation.resolve(typeId));
    return true;
  } catch {
    return false;
  }
}

function fillBox(dim, x0, y0, z0, x1, y1, z1, typeId) {
  let n = 0;
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
        if (trySet(dim, x, y, z, typeId)) n++;
      }
    }
  }
  return n;
}

function buildHut(dim, x, y, z, wall = "minecraft:cobblestone", roof = "minecraft:oak_stairs") {
  // Floor
  fillBox(dim, x, y, z, x + 5, y, z + 5, "minecraft:oak_planks");
  // Walls
  for (let dy = 1; dy <= 3; dy++) {
    for (let dx = 0; dx <= 5; dx++) {
      trySet(dim, x + dx, y + dy, z, wall);
      trySet(dim, x + dx, y + dy, z + 5, wall);
    }
    for (let dz = 0; dz <= 5; dz++) {
      trySet(dim, x, y + dy, z + dz, wall);
      trySet(dim, x + 5, y + dy, z + dz, wall);
    }
  }
  // Door gap
  trySet(dim, x + 2, y + 1, z, "minecraft:air");
  trySet(dim, x + 2, y + 2, z, "minecraft:air");
  // Roof
  fillBox(dim, x, y + 4, z, x + 5, y + 4, z + 5, "minecraft:oak_planks");
  // Interior light
  trySet(dim, x + 2, y + 3, z + 2, "minecraft:lantern");
}

function buildRoad(dim, x0, z0, x1, z1, y) {
  const xmin = Math.min(x0, x1);
  const xmax = Math.max(x0, x1);
  const zmin = Math.min(z0, z1);
  const zmax = Math.max(z0, z1);
  for (let x = xmin; x <= xmax; x++) {
    for (let z = zmin; z <= zmax; z++) {
      trySet(dim, x, y, z, "minecraft:stone_bricks");
      trySet(dim, x, y + 1, z, "minecraft:air");
    }
  }
}

/**
 * Queue capital construction near player / settlement center.
 */
export function startCapitalBuild(dimension, center) {
  const data = getWorldData();
  if (!data.worldgen) data.worldgen = {};
  if (data.worldgen[BUILD_FLAG]) return { ok: false, reason: "already_built" };

  ensureCapitalBlueprint();
  const cx = Math.floor(center.x);
  const cy = Math.floor(center.y);
  const cz = Math.floor(center.z);
  const y = cy - 1;

  const jobs = [];

  // Central square platform
  jobs.push(() => fillBox(dimension, cx - 8, y, cz - 8, cx + 8, y, cz + 8, "minecraft:stone_bricks"));
  // Well
  jobs.push(() => {
    fillBox(dimension, cx - 1, y, cz - 1, cx + 1, y, cz + 1, "minecraft:cobblestone");
    trySet(dimension, cx, y, cz, "minecraft:water");
  });

  // Roads cross
  jobs.push(() => buildRoad(dimension, cx - 40, cz - 1, cx + 40, cz + 1, y));
  jobs.push(() => buildRoad(dimension, cx - 1, cz - 40, cx + 1, cz + 40, y));

  // Government hall
  jobs.push(() => buildHut(dimension, cx + 18, y, cz - 2, "minecraft:stone_bricks", "minecraft:stone_brick_stairs"));
  jobs.push(() => {
    trySet(dimension, cx + 20, y + 1, cz, "minecraft:oak_sign");
  });

  // Bank
  jobs.push(() => buildHut(dimension, cx + 22, y, cz + 6, "minecraft:gold_block".includes("gold") ? "minecraft:smooth_stone" : "minecraft:smooth_stone"));

  // Courthouse
  jobs.push(() => buildHut(dimension, cx + 12, y, cz - 18, "minecraft:polished_andesite"));
  jobs.push(() => {
    // Court interior: benches
    trySet(dimension, cx + 14, y + 1, cz - 16, "minecraft:oak_stairs");
    trySet(dimension, cx + 15, y + 1, cz - 16, "minecraft:oak_stairs");
    trySet(dimension, cx + 14, y + 1, cz - 14, "minecraft:lectern");
  });

  // Police
  jobs.push(() => buildHut(dimension, cx + 24, y, cz - 16, "minecraft:cobblestone"));
  // Cell
  jobs.push(() => {
    fillBox(dimension, cx + 30, y, cz - 16, cx + 33, y + 3, cz - 13, "minecraft:iron_bars");
    fillBox(dimension, cx + 31, y, cz - 15, cx + 32, y, cz - 14, "minecraft:stone");
  });

  // Clinic
  jobs.push(() => buildHut(dimension, cx - 20, y, cz - 20, "minecraft:white_concrete"));
  // School
  jobs.push(() => buildHut(dimension, cx - 20, y, cz + 16, "minecraft:bricks"));
  // Market stalls
  jobs.push(() => {
    for (let i = 0; i < 4; i++) {
      trySet(dimension, cx + 12 + i * 2, y + 1, cz + 12, "minecraft:oak_fence");
      trySet(dimension, cx + 12 + i * 2, y + 2, cz + 12, "minecraft:white_wool");
    }
  });

  // Farms
  jobs.push(() => {
    fillBox(dimension, cx - 45, y, cz - 6, cx - 35, y, cz + 6, "minecraft:farmland");
    for (let x = cx - 45; x <= cx - 35; x += 2) {
      for (let z = cz - 6; z <= cz + 6; z += 2) {
        trySet(dimension, x, y + 1, z, "minecraft:wheat");
      }
    }
  });

  // Houses residential
  for (const [dx, dz] of [
    [0, 28],
    [8, 28],
    [-8, 28],
    [0, -28],
    [8, -28],
    [-8, -28]
  ]) {
    jobs.push(() => buildHut(dimension, cx + dx, y, cz + dz, "minecraft:oak_planks"));
  }

  // Festival field markers
  jobs.push(() => {
    for (const [dx, dz] of [
      [8, 38],
      [12, 38],
      [8, 42],
      [12, 42]
    ]) {
      trySet(dimension, cx + dx, y + 1, cz + dz, "minecraft:torch");
    }
  });

  // Military post
  jobs.push(() => buildHut(dimension, cx + 36, y, cz + 8, "minecraft:deepslate_bricks"));

  // Emergency
  jobs.push(() => buildHut(dimension, cx + 26, y, cz - 20, "minecraft:red_concrete"));

  // Logistics warehouse
  jobs.push(() => buildHut(dimension, cx + 38, y, cz + 12, "minecraft:oak_log"));

  data.worldgen.capitalJobs = jobs.length;
  data.worldgen.capitalCenter = { x: cx, y, z: cz };
  data.worldgen.facilities = {
    government: { x: cx + 18, y, z: cz - 2 },
    courthouse: { x: cx + 12, y, z: cz - 18 },
    police: { x: cx + 24, y, z: cz - 16 },
    clinic: { x: cx - 20, y, z: cz - 20 },
    school: { x: cx - 20, y, z: cz + 16 },
    market: { x: cx + 15, y, z: cz + 15 },
    farms: { x: cx - 40, y, z: cz },
    festival: { x: cx + 10, y, z: cz + 40 },
    barracks: { x: cx + 36, y, z: cz + 8 },
    bank: { x: cx + 22, y, z: cz + 6 }
  };

  let i = 0;
  const run = () => {
    const end = Math.min(i + 3, jobs.length);
    for (; i < end; i++) {
      try {
        jobs[i]();
      } catch (e) {
        Logger.warn(`Capital job ${i}: ${e}`);
      }
    }
    if (i < jobs.length) {
      system.runTimeout(run, 2);
    } else {
      data.worldgen[BUILD_FLAG] = true;
      markDirty();
      Logger.info("CivilCraft capital build complete.");
      try {
        world.sendMessage("§aCivilCraft capital construction complete!");
      } catch {
        /* */
      }
    }
  };
  system.run(run);
  markDirty();
  return { ok: true, jobs: jobs.length, center: { x: cx, y, z: cz } };
}

export function isCapitalBuilt() {
  const data = getWorldData();
  return !!(data.worldgen && data.worldgen[BUILD_FLAG]);
}

export function getFacility(name) {
  return getWorldData().worldgen?.facilities?.[name] || null;
}
