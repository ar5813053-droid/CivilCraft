import { MAX_ROUTES, DEFAULT_TRAVEL_DAYS } from "./logistics-data.js";
import { markDirty } from "../core/data-store.js";

export function createRoute(store, partial) {
  if (!partial?.sourceId || !partial?.destinationId || !partial?.goodId) {
    return { ok: false, error: "invalid_route" };
  }
  if (partial.sourceId === partial.destinationId) return { ok: false, error: "same_endpoint" };
  const route = {
    id: partial.id || `route_${store.routes.length + 1}`,
    sourceId: partial.sourceId,
    destinationId: partial.destinationId,
    goodId: partial.goodId,
    capacity: partial.capacity || 20,
    travelDays: partial.travelDays ?? DEFAULT_TRAVEL_DAYS,
    active: partial.active !== false
  };
  store.routes.push(route);
  if (store.routes.length > MAX_ROUTES) store.routes = store.routes.slice(-MAX_ROUTES);
  store.stats.routes = store.routes.length;
  markDirty();
  return { ok: true, route };
}

export function getRoute(store, routeId) {
  return (store.routes || []).find((r) => r.id === routeId) || null;
}
