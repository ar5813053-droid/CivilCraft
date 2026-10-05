/**
 * Lightweight economic inventory helpers.
 * Inventories are plain Record<string, number> maps (goodId -> qty).
 */

import { hasGood } from "./goods-registry.js";

/**
 * Ensures inventory object exists and returns it.
 * @param {{ inventory?: Record<string, number> }} holder
 * @returns {Record<string, number>}
 */
export function ensureInventory(holder) {
  if (!holder.inventory || typeof holder.inventory !== "object") {
    holder.inventory = {};
  }
  return holder.inventory;
}

/**
 * @param {Record<string, number>|null|undefined} inv
 * @param {string} goodId
 * @returns {number}
 */
export function getQty(inv, goodId) {
  if (!inv || typeof inv !== "object") return 0;
  const n = inv[goodId];
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * @param {Record<string, number>} inv
 * @param {string} goodId
 * @param {number} amount
 * @returns {boolean}
 */
export function addItem(inv, goodId, amount) {
  if (!hasGood(goodId)) return false;
  const qty = Math.floor(amount);
  if (qty <= 0 || !Number.isFinite(qty)) return false;
  inv[goodId] = getQty(inv, goodId) + qty;
  return true;
}

/**
 * Removes items if available.
 * @param {Record<string, number>} inv
 * @param {string} goodId
 * @param {number} amount
 * @returns {boolean}
 */
export function removeItem(inv, goodId, amount) {
  const qty = Math.floor(amount);
  if (qty <= 0 || !Number.isFinite(qty)) return false;
  const current = getQty(inv, goodId);
  if (current < qty) return false;
  const next = current - qty;
  if (next === 0) delete inv[goodId];
  else inv[goodId] = next;
  return true;
}

/**
 * @param {Record<string, number>|null|undefined} inv
 * @param {string} goodId
 * @param {number} amount
 * @returns {boolean}
 */
export function hasItem(inv, goodId, amount = 1) {
  return getQty(inv, goodId) >= Math.floor(amount);
}

/**
 * Total unit count across all goods.
 * @param {Record<string, number>|null|undefined} inv
 * @returns {number}
 */
export function totalUnits(inv) {
  if (!inv) return 0;
  let sum = 0;
  for (const k of Object.keys(inv)) {
    sum += getQty(inv, k);
  }
  return sum;
}
