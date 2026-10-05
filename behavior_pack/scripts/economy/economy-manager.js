/**
 * Economy orchestrator.
 *
 * Runs production, consumption, restock, pricing, and aggregates
 * on fixed intervals — never every tick.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty, saveWorldData } from "../core/data-store.js";
import { getAllVillagers } from "../villagers/villager-registry.js";
import { initializeGoods } from "./goods-registry.js";
import { normalizeEconomyData, createDefaultEconomyData, CURRENCY_SYMBOL } from "./economy-data.js";
import { ensureDefaultShops, getAllShops, restockAllShops, hydrateShop } from "./shops.js";
import { runProductionForMany } from "./production.js";
import { runConsumptionForMany } from "./consumption.js";
import { updateAllPrices, setSupplySnapshot, getPriceSnapshot } from "./prices.js";
import { linkTradersToShops, payOwnerDividends } from "./businesses.js";
import { getQty } from "./inventory.js";
import { getBalance, formatMoney, STARTING_BALANCE, setBalance } from "./wallet.js";
import { getRecentTransactions } from "./transactions.js";
import { getAllGoods } from "./goods-registry.js";

/** Economy simulation interval (ticks). ~15 seconds. */
export const ECONOMY_INTERVAL_TICKS = 300;

/** Price update every N economy ticks. */
const PRICE_EVERY_N = 2;

/** Dividend / trader link every N economy ticks. */
const BUSINESS_EVERY_N = 4;

let initialized = false;
let economyTickCount = 0;

/**
 * Initializes economy subsystem (idempotent).
 */
export function initializeEconomy() {
  if (initialized) return;
  initialized = true;

  initializeGoods();

  const data = getWorldData();
  if (!data.economy) {
    data.economy = createDefaultEconomyData();
    markDirty();
  } else {
    data.economy = normalizeEconomyData(data.economy);
  }

  // Seed market prices from base prices if empty
  for (const good of getAllGoods()) {
    if (data.economy.market.prices[good.id] == null) {
      data.economy.market.prices[good.id] = good.basePrice;
    }
  }

  ensureDefaultShops();
  hydrateAllShops();
  seedVillagerWallets();
  linkTradersToShops();

  system.runInterval(() => {
    onEconomyTick();
  }, ECONOMY_INTERVAL_TICKS);

  Logger.info("Economy manager initialized.");
}

function hydrateAllShops() {
  for (const shop of getAllShops()) {
    hydrateShop(shop);
  }
}

/**
 * Gives starting balance only to villagers with missing/zero uninitialized money
 * who have never received a seed (tracked via lastUpdated vs createdAt is weak —
 * we only seed if money is undefined-like; existing 0 from Phase 1 stays 0
 * unless we detect brand-new records).
 *
 * Policy: if money is 0 and inventory is empty and no profession production yet,
 * grant STARTING_BALANCE once via a flag on the record.
 */
function seedVillagerWallets() {
  for (const v of getAllVillagers()) {
    if (!v.inventory) v.inventory = {};
    if (v._economySeeded) continue;
    // Phase 1 villagers may have money: 0 — seed them once for playability
    if (getBalance(v) === 0) {
      setBalance(v, STARTING_BALANCE);
    }
    v._economySeeded = true;
    markDirty();
  }
}

/**
 * Main economy tick — processes all registered villagers (lightweight data),
 * not world entity scans.
 */
function onEconomyTick() {
  economyTickCount++;
  const villagers = getAllVillagers();
  if (villagers.length === 0) return;

  try {
    // 1. Production (working villagers)
    runProductionForMany(villagers);

    // 2. Consumption / food
    runConsumptionForMany(villagers);

    // 3. Shop restock from village stock
    restockAllShops();

    // 4. Supply snapshot for pricing
    refreshSupplySnapshot();

    // 5. Prices (less frequent)
    if (economyTickCount % PRICE_EVERY_N === 0) {
      updateAllPrices();
    }

    // 6. Business links / dividends
    if (economyTickCount % BUSINESS_EVERY_N === 0) {
      linkTradersToShops();
      payOwnerDividends();
    }

    // 7. Village economic aggregates
    refreshEconomyTotals(villagers);

    markDirty();
  } catch (e) {
    Logger.error("Economy tick failed", e);
  }
}

/**
 * Aggregates supply from village stock + all shop inventories.
 */
function refreshSupplySnapshot() {
  const data = getWorldData();
  if (!data.economy) return;

  /** @type {Record<string, number>} */
  const supply = {};

  for (const good of getAllGoods()) {
    supply[good.id] = data.economy.villageStock[good.id] || 0;
  }

  for (const shop of getAllShops()) {
    for (const good of getAllGoods()) {
      supply[good.id] =
        (supply[good.id] || 0) + getQty(shop.inventory, good.id);
    }
  }

  // Personal inventories (small contribution)
  for (const v of getAllVillagers()) {
    if (!v.inventory) continue;
    for (const good of getAllGoods()) {
      supply[good.id] =
        (supply[good.id] || 0) + getQty(v.inventory, good.id);
    }
  }

  setSupplySnapshot(supply);
}

/**
 * @param {import("../villagers/villager-identity.js").VillagerRecord[]} villagers
 */
function refreshEconomyTotals(villagers) {
  const data = getWorldData();
  if (!data.economy) return;

  let totalMoney = 0;
  let employed = 0;
  let unemployed = 0;

  for (const v of villagers) {
    totalMoney += getBalance(v);
    if (v.profession && v.profession !== "citizen") employed++;
    else unemployed++;
  }

  for (const shop of getAllShops()) {
    totalMoney += shop.balance || 0;
  }

  const totals = data.economy.totals;
  totals.totalMoney = totalMoney;
  totals.averageWealth =
    villagers.length > 0 ? Math.round(totalMoney / villagers.length) : 0;
  totals.employed = employed;
  totals.unemployed = unemployed;

  // Mirror into village data for Phase 1 compatibility
  const village = data.villages?.main;
  if (village) {
    village.economy = {
      totalMoney,
      averageWealth: totals.averageWealth,
      totalProduction: totals.totalProduction,
      totalConsumption: totals.totalConsumption,
      totalSales: totals.totalSales,
      employed,
      unemployed
    };
  }
}

/**
 * Debug / status snapshot.
 */
export function getEconomySnapshot() {
  const data = getWorldData();
  const eco = data.economy;
  if (!eco) {
    return { ready: false };
  }
  return {
    ready: true,
    currency: eco.currencyCode,
    symbol: eco.currencySymbol || CURRENCY_SYMBOL,
    totals: { ...eco.totals },
    shopCount: Object.keys(eco.shops || {}).length,
    prices: getPriceSnapshot(),
    villageStock: { ...eco.villageStock },
    recentTx: getRecentTransactions(5)
  };
}

/**
 * Human-readable multi-line status for chat.
 * @returns {string[]}
 */
export function formatEconomyStatusLines() {
  const snap = getEconomySnapshot();
  if (!snap.ready) return ["§cEconomy not initialized."];

  const lines = [
    "§6CivilCraft Economy§r",
    `Total Money: §a${formatMoney(snap.totals.totalMoney, snap.symbol)}§r`,
    `Avg Wealth: §a${formatMoney(snap.totals.averageWealth, snap.symbol)}§r`,
    `Employed: ${snap.totals.employed}  Unemployed: ${snap.totals.unemployed}`,
    `Shops: ${snap.shopCount}  Tx: ${snap.totals.transactionCount}`,
    `Produced: ${snap.totals.totalProduction}  Consumed: ${snap.totals.totalConsumption}`
  ];

  lines.push("§7Prices:§r");
  for (const p of snap.prices.slice(0, 7)) {
    lines.push(
      `  ${p.id}: ${p.price}${snap.symbol} (s:${p.supply} d:${p.demand})`
    );
  }
  return lines;
}
