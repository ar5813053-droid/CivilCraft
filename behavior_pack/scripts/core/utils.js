/**
 * Shared utility helpers for CivilCraft.
 */

/**
 * Generates a reasonably unique ID string for villagers / households.
 * Uses timestamp + random suffix; not cryptographically secure.
 * @returns {string}
 */
export function generateId(prefix = "id") {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}_${rand}`;
}

/**
 * Clamps a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Returns the current Minecraft day time (0–23999).
 * Prefers getTimeOfDay when available; falls back to absolute time.
 * @param {import("@minecraft/server").World} world
 * @returns {number}
 */
export function getDayTime(world) {
  try {
    if (typeof world.getTimeOfDay === "function") {
      return world.getTimeOfDay();
    }
    return world.getAbsoluteTime() % 24000;
  } catch {
    return 0;
  }
}

/**
 * Converts day time (0–23999) to approximate hour (0–23).
 * @param {number} dayTime
 * @returns {number}
 */
export function dayTimeToHour(dayTime) {
  return Math.floor((dayTime / 1000 + 6) % 24);
}

/**
 * Safe JSON parse that returns fallback on failure.
 * @param {string} raw
 * @param {*} fallback
 * @returns {*}
 */
export function safeJsonParse(raw, fallback = null) {
  if (typeof raw !== "string" || raw.length === 0) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Euclidean distance between two locations.
 * @param {{x:number,y:number,z:number}} a
 * @param {{x:number,y:number,z:number}} b
 * @returns {number}
 */
export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Returns true if the entity is a vanilla villager (v1 or v2).
 * @param {import("@minecraft/server").Entity} entity
 * @returns {boolean}
 */
export function isVillagerEntity(entity) {
  if (!entity || !entity.typeId) return false;
  return (
    entity.typeId === "minecraft:villager" ||
    entity.typeId === "minecraft:villager_v2"
  );
}
