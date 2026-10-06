/**
 * Automatic trade order matching using shop inventories and treaties.
 */

import { createTradeOrder } from "./international-trade.js";
import { getAllShops } from "../economy/shops.js";
import { getQty } from "../economy/inventory.js";
import { markDirty } from "../core/data-store.js";

const TRADE_GOODS = ["wheat", "bread", "wood", "stone", "coal", "iron", "tools"];
const MAX_AUTO_ORDERS = 5;

/**
 * Create pending trade orders when treaties and stock exist.
 * Source/dest shop ids are set for logistics fulfillment.
 */
export function autoMatchTrade(store, dayStamp) {
  if (!store) return { created: 0 };
  const treaties = (store.treaties || []).filter((t) => t.status === "active" && t.type === "trade_agreement");
  if (!treaties.length) return { created: 0 };
  const shops = getAllShops();
  if (shops.length < 2) return { created: 0 };
  let created = 0;
  for (const treaty of treaties) {
    if (created >= MAX_AUTO_ORDERS) break;
    for (const goodId of TRADE_GOODS) {
      if (created >= MAX_AUTO_ORDERS) break;
      const exporters = shops.filter((s) => getQty(s.inventory, goodId) >= 5);
      const importers = shops.filter((s) => getQty(s.inventory, goodId) < 3);
      if (!exporters.length || !importers.length) continue;
      const src = exporters[0];
      const dest = importers.find((s) => s.id !== src.id);
      if (!dest) continue;
      const pendingDup = (store.tradeOrders || []).some(
        (o) => o.status === "pending" && o.goodId === goodId && o.exporterId === treaty.nationA
      );
      if (pendingDup) continue;
      const r = createTradeOrder(store, {
        exporterId: treaty.nationA,
        importerId: treaty.nationB,
        goodId,
        quantity: Math.min(10, getQty(src.inventory, goodId)),
        dayStamp,
        requireTreaty: true
      });
      if (r.ok) {
        r.order.sourceShopId = src.id;
        r.order.destShopId = dest.id;
        created += 1;
      }
    }
  }
  if (created) markDirty();
  return { created };
}
