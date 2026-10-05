/**
 * Dynamic pricing based on supply and demand pressure.
 *
 * Formula (stable, gradual):
 *   ratio = demand / max(supply, 1)
 *   target = basePrice * clamp(0.5 + 0.5 * ratio, 0.5, 2.0)
 *   next  = lerp(current, target, alpha)
 *   next  = clamp(round(next), minPrice, maxPrice)
 *
 * Prices only update on economy ticks, not every game tick.
 */

import { clamp } from "../core/utils.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { getAllGoods, getGood } from "./goods-registry.js";

/** How fast prices move toward target each update (0–1). */
const PRICE_ALPHA = 0.15;

/** Demand decays each price tick so pressure does not accumulate forever. */
const DEMAND_DECAY = 0.85;

/**
 * @param {string} goodId
 * @returns {number} current market price (integer)
 */
export function getMarketPrice(goodId) {
  const good = getGood(goodId);
  if (!good) return 1;
  const data = getWorldData();
  const stored = data.economy?.market?.prices?.[goodId];
  if (typeof stored === "number" && Number.isFinite(stored) && stored > 0) {
    return Math.floor(stored);
  }
  return good.basePrice;
}

/**
 * Records demand pressure for a good (e.g. after a purchase attempt).
 * @param {string} goodId
 * @param {number} amount
 */
export function recordDemand(goodId, amount = 1) {
  const data = getWorldData();
  if (!data.economy) return;
  const demand = data.economy.market.demand;
  const add = Math.max(0, Math.floor(amount));
  demand[goodId] = (demand[goodId] || 0) + add;
  markDirty();
}

/**
 * Sets / refreshes supply snapshot from village stock + shop inventories.
 * Called by economy manager before price update.
 * @param {Record<string, number>} supplyMap
 */
export function setSupplySnapshot(supplyMap) {
  const data = getWorldData();
  if (!data.economy) return;
  data.economy.market.supply = { ...supplyMap };
  markDirty();
}

/**
 * Recomputes all market prices once per economy price tick.
 */
export function updateAllPrices() {
  const data = getWorldData();
  if (!data.economy) return;

  const { supply, demand, prices } = data.economy.market;

  for (const good of getAllGoods()) {
    const id = good.id;
    const s = Math.max(0, Math.floor(supply[id] || 0));
    const d = Math.max(0, Math.floor(demand[id] || 0));

    // ratio: >1 means demand exceeds supply
    const ratio = d / Math.max(s, 1);
    const factor = clamp(0.5 + 0.5 * ratio, 0.5, 2.0);
    const target = good.basePrice * factor;

    const current = prices[id] ?? good.basePrice;
    const lerped = current + (target - current) * PRICE_ALPHA;
    const next = Math.round(clamp(lerped, good.minPrice, good.maxPrice));
    prices[id] = next;

    // Decay demand so it reflects recent activity
    demand[id] = Math.floor((demand[id] || 0) * DEMAND_DECAY);
  }

  markDirty();
}

/**
 * Snapshot for debug display.
 * @returns {{ id: string, supply: number, demand: number, price: number, base: number }[]}
 */
export function getPriceSnapshot() {
  return getAllGoods().map((g) => {
    const data = getWorldData();
    const m = data.economy?.market;
    return {
      id: g.id,
      supply: m?.supply?.[g.id] ?? 0,
      demand: m?.demand?.[g.id] ?? 0,
      price: getMarketPrice(g.id),
      base: g.basePrice
    };
  });
}
