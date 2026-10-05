import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { MAX_ROADS } from "./infrastructure-data.js";
import { ROAD_TYPES } from "./infrastructure-types.js";
import { pushInfraEvent } from "./infrastructure-events.js";

export function addRoad(store, input) {
  if (!store) return { ok: false, error: "no_infrastructure" };
  if (input?.type && !ROAD_TYPES.includes(input.type)) return { ok: false, error: "invalid_road" };
  const road = {
    id: input.id || generateId("road"),
    settlementId: input.settlementId || "settlement_main",
    type: ROAD_TYPES.includes(input.type) ? input.type : "local",
    start: input.start || null,
    end: input.end || null,
    length: Math.max(1, Math.floor(input.length || 16)),
    condition: Math.max(0, Math.min(100, Math.floor(input.condition ?? 70))),
    capacity: Math.max(1, Math.floor(input.capacity || 10)),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  store.roads.push(road);
  if (store.roads.length > MAX_ROADS) store.roads = store.roads.slice(-MAX_ROADS);
  pushInfraEvent(store, "infrastructure_added", road.id);
  markDirty();
  return { ok: true, road };
}

export { ROAD_TYPES };
