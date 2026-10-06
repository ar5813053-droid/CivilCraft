/**
 * Shop data model and helpers.
 * Shops are simulation records — not physical structures in Phase 2.
 */

import { generateId } from "../core/utils.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { Logger } from "../core/logger.js";
import { sanitizeMoney } from "./wallet.js";
import { ensureInventory, addItem, getQty } from "./inventory.js";
import { getMarketPrice } from "./prices.js";
import { purchaseGoods, TxType } from "./transactions.js";

/** @typedef {import("./economy-data.js").ShopRecord} ShopRecord */

export const SHOP_TYPES = Object.freeze({
  GENERAL: "general",
  FOOD: "food",
  BUILDING: "building",
  TOOLS: "tools"
});

/** Default stock for newly created shops by type. */
const DEFAULT_STOCK = {
  general: { wheat: 20, bread: 15, wood: 10, stone: 10, coal: 8, tools: 3 },
  food: { wheat: 40, bread: 30 },
  building: { wood: 50, stone: 50, iron: 10 },
  tools: { tools: 12, iron: 8, wood: 15 }
};

/**
 * Creates a shop and registers it in economy data.
 * @param {object} opts
 * @param {string} opts.type
 * @param {string} [opts.name]
 * @param {string|null} [opts.ownerId]
 * @param {string} [opts.villageId]
 * @param {number} [opts.startingBalance]
 * @returns {ShopRecord}
 */
export function createShop(opts) {
  const data = getWorldData();
  if (!data.economy) {
    throw new Error("Economy not initialized");
  }

  const type = opts.type || SHOP_TYPES.GENERAL;
  const id = generateId("shop");
  /** @type {ShopRecord} */
  const capacityByType = { general: 4, food: 5, building: 5, tools: 4 };
  const shop = {
    id,
    type,
    name: opts.name || `${type} shop`,
    ownerId: opts.ownerId ?? null,
    villageId: opts.villageId || "main",
    balance: sanitizeMoney(opts.startingBalance ?? 200),
    inventory: { ...(DEFAULT_STOCK[type] || DEFAULT_STOCK.general) },
    priceOverrides: {},
    open: true,
    active: true,
    employeeCapacity: capacityByType[type] ?? 4,
    employeeVillagerIds: [],
    revenue: 0,
    operatingExpenses: 0,
    payrollExpense: 0,
    profit: 0,
    lastOperatingDay: null,
    lastPayrollDay: null,
    unpaidPayroll: [],
    financialStatus: "healthy",
    createdAt: Date.now(),
    lastUpdated: Date.now()
  };

  // Alias money field for wallet helpers
  Object.defineProperty(shop, "money", {
    get() {
      return this.balance;
    },
    set(v) {
      this.balance = sanitizeMoney(v);
    },
    enumerable: false,
    configurable: true
  });

  data.economy.shops[id] = shop;
  markDirty();
  Logger.info(`Shop created: ${shop.name} (${id})`);
  return shop;
}

/**
 * Ensures wallet-compatible money accessor on loaded shops.
 * @param {ShopRecord} shop
 */
export function hydrateShop(shop) {
  if (!shop) return shop;
  shop.balance = sanitizeMoney(shop.balance);
  if (!shop.inventory) shop.inventory = {};
  if (typeof shop.employeeCapacity !== "number") {
    const capacityByType = { general: 4, food: 5, building: 5, tools: 4 };
    shop.employeeCapacity = capacityByType[shop.type] ?? 4;
  }
  if (!Array.isArray(shop.employeeVillagerIds)) shop.employeeVillagerIds = [];
  if (typeof shop.revenue !== "number") shop.revenue = 0;
  if (typeof shop.operatingExpenses !== "number") shop.operatingExpenses = 0;
  if (typeof shop.payrollExpense !== "number") shop.payrollExpense = 0;
  if (typeof shop.profit !== "number") shop.profit = 0;
  if (shop.active == null) shop.active = shop.open !== false;
  if (shop.financialStatus == null) shop.financialStatus = "healthy";
  if (!Array.isArray(shop.unpaidPayroll)) shop.unpaidPayroll = [];
  if (!Object.getOwnPropertyDescriptor(shop, "money")?.get) {
    Object.defineProperty(shop, "money", {
      get() {
        return this.balance;
      },
      set(v) {
        this.balance = sanitizeMoney(v);
      },
      enumerable: false,
      configurable: true
    });
  }
  return shop;
}

/**
 * @param {string} shopId
 * @returns {ShopRecord|undefined}
 */
export function getShop(shopId) {
  const shop = getWorldData().economy?.shops?.[shopId];
  return shop ? hydrateShop(shop) : undefined;
}

/**
 * @returns {ShopRecord[]}
 */
export function getAllShops() {
  const shops = getWorldData().economy?.shops ?? {};
  return Object.values(shops).map(hydrateShop);
}

/**
 * @param {string} type
 * @returns {ShopRecord[]}
 */
export function getShopsByType(type) {
  return getAllShops().filter((s) => s.type === type);
}

/**
 * Restocks a shop from village stockpile (limited transfer).
 * @param {ShopRecord} shop
 * @param {string} goodId
 * @param {number} amount
 * @returns {number} actual amount moved
 */
export function restockFromVillage(shop, goodId, amount) {
  const data = getWorldData();
  if (!data.economy) return 0;
  const avail = data.economy.villageStock[goodId] || 0;
  const take = Math.min(avail, Math.max(0, Math.floor(amount)));
  if (take <= 0) return 0;

  data.economy.villageStock[goodId] = avail - take;
  const inv = ensureInventory(shop);
  addItem(inv, goodId, take);
  shop.lastUpdated = Date.now();
  markDirty();
  return take;
}

/**
 * Auto-restock open shops from village stock (called on economy tick).
 * Moves modest amounts so production remains the bottleneck.
 */
export function restockAllShops() {
  const data = getWorldData();
  if (!data.economy) return;

  for (const shop of getAllShops()) {
    if (!shop.open) continue;
    const defaults = DEFAULT_STOCK[shop.type] || {};
    for (const goodId of Object.keys(defaults)) {
      const target = defaults[goodId];
      const current = getQty(shop.inventory, goodId);
      if (current < Math.floor(target * 0.4)) {
        restockFromVillage(shop, goodId, Math.ceil(target * 0.3));
      }
    }
  }
}

/**
 * Ensures at least one of each Phase 2 shop type exists for the default village.
 */
export function ensureDefaultShops() {
  const existing = getAllShops();
  const types = Object.values(SHOP_TYPES);
  for (const type of types) {
    if (!existing.some((s) => s.type === type)) {
      createShop({
        type,
        name: type === "general" ? "General Store" :
          type === "food" ? "Food Shop" :
          type === "building" ? "Building Materials" : "Tool Shop",
        villageId: "main",
        startingBalance: 250
      });
    }
  }
}

/**
 * Assigns a trader villager as owner of an unowned shop of matching interest.
 * @param {string} villagerId
 * @returns {ShopRecord|null}
 */
export function assignTraderToShop(villagerId) {
  const unowned = getAllShops().find((s) => !s.ownerId);
  if (!unowned) return null;
  unowned.ownerId = villagerId;
  unowned.lastUpdated = Date.now();
  markDirty();
  return unowned;
}

/**
 * Effective sell price for a shop good.
 * @param {ShopRecord} shop
 * @param {string} goodId
 * @returns {number}
 */
export function getShopPrice(shop, goodId) {
  if (shop.priceOverrides && typeof shop.priceOverrides[goodId] === "number") {
    return Math.max(1, Math.floor(shop.priceOverrides[goodId]));
  }
  return getMarketPrice(goodId);
}
