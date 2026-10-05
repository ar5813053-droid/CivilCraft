/**
 * Basic villager consumption (food).
 *
 * At economy intervals, hungry villagers try to eat from inventory
 * or purchase bread/wheat from a food shop.
 *
 * No money is created. Failed purchases track demand only.
 */

import { clamp } from "../core/utils.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { Logger } from "../core/logger.js";
import { ensureInventory, getQty, hasItem } from "./inventory.js";
import { consumeOwnGoods, purchaseGoods, TxType } from "./transactions.js";
import { getMarketPrice, recordDemand } from "./prices.js";
import { getShopsByType } from "./shops.js";

/** Hunger threshold below which villager seeks food. */
const HUNGER_SEEK = 14;

/** Hunger restored per bread. */
const BREAD_RESTORE = 5;

/** Natural hunger drain per consumption tick while awake. */
const HUNGER_DRAIN = 1;

/**
 * Attempts to feed a single villager.
 * @param {import("../villagers/villager-identity.js").VillagerRecord} record
 * @returns {{ fed: boolean, method?: string }}
 */
export function tryFeedVillager(record) {
  if (!record) return { fed: false };

  // Light drain
  if (record.currentActivity !== "sleep") {
    record.hunger = clamp((record.hunger ?? 20) - HUNGER_DRAIN, 0, 20);
  }

  if ((record.hunger ?? 20) >= HUNGER_SEEK) {
    return { fed: false };
  }

  const inv = ensureInventory(record);

  // Prefer own bread, then wheat
  if (hasItem(inv, "bread", 1)) {
    consumeOwnGoods(record, "bread", 1, "eat_own_bread");
    record.hunger = clamp((record.hunger ?? 0) + BREAD_RESTORE, 0, 20);
    markDirty();
    return { fed: true, method: "own_bread" };
  }
  if (hasItem(inv, "wheat", 2)) {
    consumeOwnGoods(record, "wheat", 2, "eat_own_wheat");
    record.hunger = clamp((record.hunger ?? 0) + 3, 0, 20);
    markDirty();
    return { fed: true, method: "own_wheat" };
  }

  // Try to buy from a food/general shop
  const shops = [
    ...getShopsByType("food"),
    ...getShopsByType("general")
  ];

  for (const shop of shops) {
    if (!shop.open) continue;
    const stock = getQty(shop.inventory, "bread");
    if (stock < 1) continue;

    const price = shop.priceOverrides?.bread ?? getMarketPrice("bread");
    recordDemand("bread", 1);

    const result = purchaseGoods({
      buyer: record,
      seller: shop,
      goodId: "bread",
      quantity: 1,
      unitPrice: price,
      type: TxType.PURCHASE,
      reason: "buy_food"
    });

    if (result.ok) {
      // Immediately consume purchased bread
      consumeOwnGoods(record, "bread", 1, "eat_purchased_bread");
      record.hunger = clamp((record.hunger ?? 0) + BREAD_RESTORE, 0, 20);
      // Mild happiness bump when fed
      record.happiness = clamp((record.happiness ?? 50) + 1, 0, 100);
      markDirty();
      return { fed: true, method: "bought_bread" };
    }
  }

  // Unmet demand — slight happiness penalty, no free food
  recordDemand("bread", 1);
  record.happiness = clamp((record.happiness ?? 50) - 1, 0, 100);
  markDirty();
  Logger.debug(`${record.name} could not obtain food (hunger=${record.hunger})`);
  return { fed: false };
}

/**
 * Batch consumption pass.
 * @param {import("../villagers/villager-identity.js").VillagerRecord[]} records
 * @returns {{ fed: number, unmet: number }}
 */
export function runConsumptionForMany(records) {
  let fed = 0;
  let unmet = 0;
  for (const r of records) {
    try {
      const result = tryFeedVillager(r);
      if (result.fed) fed++;
      else if ((r.hunger ?? 20) < HUNGER_SEEK) unmet++;
    } catch (e) {
      Logger.debug("Consumption error", e);
    }
  }
  return { fed, unmet };
}
