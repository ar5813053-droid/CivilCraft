/**
 * Registry of economic goods.
 * Add new goods here — the economy engine does not hard-code item lists.
 */

import { Logger } from "../core/logger.js";

/**
 * @typedef {Object} GoodDefinition
 * @property {string} id
 * @property {string} displayName
 * @property {string} category   // food | material | fuel | tool | other
 * @property {number} basePrice  // integer CC
 * @property {number} minPrice
 * @property {number} maxPrice
 * @property {boolean} consumable
 * @property {boolean} producible
 * @property {boolean} tradable
 * @property {number} [hungerRestore]  // if consumable food
 */

/** @type {Map<string, GoodDefinition>} */
const goods = new Map();

/**
 * @param {GoodDefinition} def
 */
export function registerGood(def) {
  if (!def?.id) {
    Logger.error("Cannot register good without id");
    return;
  }
  const normalized = {
    id: def.id,
    displayName: def.displayName || def.id,
    category: def.category || "other",
    basePrice: Math.max(1, Math.floor(def.basePrice || 1)),
    minPrice: Math.max(1, Math.floor(def.minPrice ?? 1)),
    maxPrice: Math.max(1, Math.floor(def.maxPrice ?? 9999)),
    consumable: !!def.consumable,
    producible: def.producible !== false,
    tradable: def.tradable !== false,
    hungerRestore: def.hungerRestore
  };
  if (normalized.minPrice > normalized.maxPrice) {
    normalized.maxPrice = normalized.minPrice;
  }
  goods.set(normalized.id, normalized);
}

/**
 * @param {string} id
 * @returns {GoodDefinition|undefined}
 */
export function getGood(id) {
  return goods.get(id);
}

/**
 * @returns {GoodDefinition[]}
 */
export function getAllGoods() {
  return Array.from(goods.values());
}

/**
 * @param {string} id
 * @returns {boolean}
 */
export function hasGood(id) {
  return goods.has(id);
}

/**
 * @param {string} category
 * @returns {GoodDefinition[]}
 */
export function getGoodsByCategory(category) {
  return getAllGoods().filter((g) => g.category === category);
}

/**
 * Registers Phase 2 starter goods.
 */
export function initializeGoods() {
  registerGood({
    id: "wheat",
    displayName: "Wheat",
    category: "food",
    basePrice: 4,
    minPrice: 1,
    maxPrice: 20,
    consumable: false,
    producible: true,
    tradable: true
  });
  registerGood({
    id: "bread",
    displayName: "Bread",
    category: "food",
    basePrice: 8,
    minPrice: 2,
    maxPrice: 40,
    consumable: true,
    producible: true,
    tradable: true,
    hungerRestore: 5
  });
  registerGood({
    id: "wood",
    displayName: "Wood",
    category: "material",
    basePrice: 6,
    minPrice: 2,
    maxPrice: 30,
    consumable: false,
    producible: true,
    tradable: true
  });
  registerGood({
    id: "stone",
    displayName: "Stone",
    category: "material",
    basePrice: 5,
    minPrice: 1,
    maxPrice: 25,
    consumable: false,
    producible: true,
    tradable: true
  });
  registerGood({
    id: "coal",
    displayName: "Coal",
    category: "fuel",
    basePrice: 7,
    minPrice: 2,
    maxPrice: 35,
    consumable: false,
    producible: true,
    tradable: true
  });
  registerGood({
    id: "iron",
    displayName: "Iron",
    category: "material",
    basePrice: 20,
    minPrice: 8,
    maxPrice: 80,
    consumable: false,
    producible: true,
    tradable: true
  });
  registerGood({
    id: "tools",
    displayName: "Tools",
    category: "tool",
    basePrice: 35,
    minPrice: 15,
    maxPrice: 120,
    consumable: false,
    producible: true,
    tradable: true
  });

  Logger.info(`Goods registry initialized (${goods.size} goods).`);
}
