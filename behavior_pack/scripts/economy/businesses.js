/**
 * Lightweight business layer tying traders to shops.
 * Phase 2: ownership + revenue share only.
 */

import { getAllVillagers, patchVillager } from "../villagers/villager-registry.js";
import { getAllShops, assignTraderToShop, hydrateShop } from "./shops.js";
import { transferMoney, TxType } from "./transactions.js";
import { Logger } from "../core/logger.js";
import { markDirty } from "../core/data-store.js";

/**
 * Links unemployed traders to available shops.
 */
export function linkTradersToShops() {
  const traders = getAllVillagers().filter((v) => v.profession === "trader");
  const shops = getAllShops();

  for (const trader of traders) {
    const owned = shops.find((s) => s.ownerId === trader.id);
    if (owned) continue;
    const assigned = assignTraderToShop(trader.id);
    if (assigned) {
      Logger.debug(`Trader ${trader.name} assigned to ${assigned.name}`);
    }
  }
}

/**
 * Pays a modest owner dividend from shop balance (profit share).
 * Only pays if shop balance is healthy — no infinite money.
 * @param {number} [threshold=300]
 * @param {number} [share=20]
 */
export function payOwnerDividends(threshold = 300, share = 20) {
  const villagers = getAllVillagers();
  const byId = Object.fromEntries(villagers.map((v) => [v.id, v]));

  for (const shop of getAllShops()) {
    hydrateShop(shop);
    if (!shop.ownerId || !shop.open) continue;
    if ((shop.balance || 0) < threshold) continue;

    const owner = byId[shop.ownerId];
    if (!owner) continue;

    const payout = Math.min(share, Math.floor((shop.balance - threshold) * 0.1));
    if (payout < 1) continue;

    // Shop uses money accessor
    const result = transferMoney(shop, owner, payout, TxType.SALARY, "shop_dividend");
    if (result.ok) {
      owner.taxableIncome = (owner.taxableIncome || 0) + payout;
      Logger.debug(
        `Dividend ${payout}₡: ${shop.name} → ${owner.name}`
      );
      markDirty();
    }
  }
}
