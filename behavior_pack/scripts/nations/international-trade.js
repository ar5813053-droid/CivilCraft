/**
 * International trade orders that feed existing logistics shipments.
 */

import { MAX_TRADE_ORDERS } from "./nation-data.js";
import { getNation } from "./nation-registry.js";
import { getRelation } from "./diplomacy.js";
import { getMarketPrice } from "../economy/prices.js";
import { markDirty } from "../core/data-store.js";

export function createTradeOrder(store, input) {
  const exporter = getNation(store, input.exporterId);
  const importer = getNation(store, input.importerId);
  if (!exporter || !importer || input.exporterId === input.importerId) {
    return { ok: false, error: "invalid_nations" };
  }
  const rel = getRelation(store, input.exporterId, input.importerId);
  if (rel && rel.score < -60) return { ok: false, error: "hostile" };
  const hasTrade = (store.treaties || []).some(
    (t) =>
      t.status === "active" &&
      t.type === "trade_agreement" &&
      ((t.nationA === input.exporterId && t.nationB === input.importerId) ||
        (t.nationA === input.importerId && t.nationB === input.exporterId))
  );
  if (!hasTrade && input.requireTreaty !== false) {
    return { ok: false, error: "no_trade_agreement" };
  }
  const qty = Math.max(1, Math.min(50, Math.floor(input.quantity || 1)));
  const base = getMarketPrice(input.goodId) || 8;
  const tariff = importer.tariffRate || 0;
  const unitCost = Math.max(1, Math.floor(base * (1 + tariff)));
  const order = {
    id: `trade_${store.tradeOrders.length + 1}`,
    exporterId: input.exporterId,
    importerId: input.importerId,
    goodId: input.goodId || "wheat",
    quantity: qty,
    unitCost,
    tariffRate: tariff,
    status: "pending",
    createdDay: input.dayStamp ?? Math.floor(Date.now() / 86400000)
  };
  store.tradeOrders.push(order);
  if (store.tradeOrders.length > MAX_TRADE_ORDERS) store.tradeOrders = store.tradeOrders.slice(-MAX_TRADE_ORDERS);
  markDirty();
  return { ok: true, order };
}

/**
 * Fulfill via logistics createShipment when source/dest shops provided.
 */
export function fulfillTradeOrder(store, order, logisticsApi) {
  if (!order || order.status !== "pending") return { ok: false };
  if (!logisticsApi?.createRoute || !logisticsApi?.createShipment) {
    order.status = "failed";
    return { ok: false, error: "no_logistics" };
  }
  const routeResult = logisticsApi.createRoute(logisticsApi.store, {
    sourceId: order.sourceShopId,
    destinationId: order.destShopId,
    goodId: order.goodId,
    capacity: order.quantity,
    travelDays: 2
  });
  if (!routeResult.ok) {
    order.status = "failed";
    return { ok: false, error: routeResult.error };
  }
  const ship = logisticsApi.createShipment(logisticsApi.store, {
    routeId: routeResult.route.id,
    quantity: order.quantity,
    dayStamp: order.createdDay
  });
  if (!ship.ok) {
    order.status = "failed";
    return { ok: false, error: ship.error };
  }
  order.status = "shipped";
  order.shipmentId = ship.shipment.id;
  store.stats.tradeValue = (store.stats.tradeValue || 0) + order.unitCost * order.quantity;
  markDirty();
  return { ok: true, shipment: ship.shipment };
}

export function tradeBalance(store, nationId) {
  let exports = 0;
  let imports = 0;
  for (const o of store.tradeOrders || []) {
    if (o.status === "failed") continue;
    const value = (o.unitCost || 0) * (o.quantity || 0);
    if (o.exporterId === nationId) exports += value;
    if (o.importerId === nationId) imports += value;
  }
  return { exports, imports, net: exports - imports };
}
