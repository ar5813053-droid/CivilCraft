import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { MAX_RELATIONSHIPS } from "./population-data.js";
import { pushPopulationEvent } from "./population-events.js";

const TYPES = ["parent", "child", "spouse", "sibling", "guardian"];

export function addRelationship(store, fromId, toId, type) {
  if (!store) return { ok: false, error: "no_population" };
  if (!fromId || !toId || fromId === toId) return { ok: false, error: "invalid_ids" };
  if (!TYPES.includes(type)) return { ok: false, error: "invalid_type" };
  const exists = store.relationships.some((r) => r.fromVillagerId === fromId && r.toVillagerId === toId && r.type === type);
  if (exists) return { ok: false, error: "duplicate" };
  const rel = {
    id: generateId("rel"),
    fromVillagerId: fromId,
    toVillagerId: toId,
    type,
    active: true,
    createdAt: Date.now()
  };
  store.relationships.push(rel);
  if (store.relationships.length > MAX_RELATIONSHIPS) store.relationships = store.relationships.slice(-MAX_RELATIONSHIPS);
  if (type === "parent") addRelationship(store, toId, fromId, "child");
  pushPopulationEvent(store, "relationship_created", rel.id);
  markDirty();
  return { ok: true, relationship: rel };
}
