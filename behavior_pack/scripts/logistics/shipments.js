import { MAX_SHIPMENTS, CARRIER_CAPACITY } from "./logistics-data.js";
import { getRoute } from "./routes.js";
import { getQty, removeItem, addItem, ensureInventory } from "../economy/inventory.js";
import { getShop } from "../economy/shops.js";
import { markDirty } from "../core/data-store.js";

function resolveHolder(id) {
  return getShop(id) || null;
}

export function createShipment(store, input) {
  const route = getRoute(store, input.routeId);
  if (!route || !route.active) return { ok: false, error: "invalid_route" };
  const qty = Math.min(Math.floor(input.quantity || 0), route.capacity, CARRIER_CAPACITY.small);
  if (qty <= 0) return { ok: false, error: "invalid_quantity" };
  const source = resolveHolder(route.sourceId);
  if (!source) return { ok: false, error: "invalid_source" };
  const inv = ensureInventory(source);
  if (getQty(inv, route.goodId) < qty) return { ok: false, error: "missing_goods" };
  if (!removeItem(inv, route.goodId, qty)) return { ok: false, error: "reserve_failed" };

  const day = input.dayStamp ?? Math.floor(Date.now() / 86400000);
  const travel = Math.max(1, route.travelDays + (input.roadModifier || 0));
  const shipment = {
    id: `ship_${store.shipments.length + 1}_${day}`,
    routeId: route.id,
    sourceId: route.sourceId,
    destinationId: route.destinationId,
    goodId: route.goodId,
    quantity: qty,
    createdDay: day,
    arrivalDay: day + travel,
    status: "in_transit"
  };
  store.shipments.push(shipment);
  if (store.shipments.length > MAX_SHIPMENTS) store.shipments = store.shipments.slice(-MAX_SHIPMENTS);
  store.stats.inTransit = (store.stats.inTransit || 0) + 1;
  markDirty();
  return { ok: true, shipment };
}

export function advanceShipment(store, shipment, dayStamp) {
  if (!shipment || shipment.status !== "in_transit") return { ok: false };
  if (dayStamp < shipment.arrivalDay) return { ok: false, reason: "in_transit" };
  const dest = resolveHolder(shipment.destinationId);
  if (!dest) {
    shipment.status = "failed";
    store.stats.failed = (store.stats.failed || 0) + 1;
    markDirty();
    return { ok: false, error: "invalid_destination" };
  }
  addItem(ensureInventory(dest), shipment.goodId, shipment.quantity);
  shipment.status = "delivered";
  store.stats.delivered = (store.stats.delivered || 0) + 1;
  store.stats.inTransit = Math.max(0, (store.stats.inTransit || 1) - 1);
  markDirty();
  return { ok: true, shipment };
}
