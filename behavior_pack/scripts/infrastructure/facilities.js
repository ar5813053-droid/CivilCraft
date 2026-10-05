import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { createInfraRecord, MAX_INFRA } from "./infrastructure-data.js";
import { isInfraType } from "./infrastructure-types.js";
import { pushInfraEvent } from "./infrastructure-events.js";

export function addFacility(store, input) {
  if (!store) return { ok: false, error: "no_infrastructure" };
  if (!isInfraType(input?.type)) return { ok: false, error: "invalid_type" };
  if (store.records.some((r) => r.id === input.id)) return { ok: true, record: store.records.find((r) => r.id === input.id) };
  const record = createInfraRecord({ ...input, id: input.id || generateId("inf") });
  store.records.push(record);
  if (store.records.length > MAX_INFRA) store.records = store.records.slice(-MAX_INFRA);
  pushInfraEvent(store, "infrastructure_added", record.id);
  markDirty();
  return { ok: true, record };
}

export function removeFacility(store, id) {
  const before = store.records.length;
  store.records = store.records.filter((r) => r.id !== id);
  if (store.records.length === before) return { ok: false, error: "missing" };
  pushInfraEvent(store, "infrastructure_removed", id);
  markDirty();
  return { ok: true };
}

export function applyPublicWork(store, project) {
  if (!project?.infrastructureId) return { ok: false, error: "no_link" };
  const record = store.records.find((r) => r.id === project.infrastructureId);
  if (!record) return { ok: false, error: "missing" };
  record.condition = Math.min(100, record.condition + 10);
  record.capacity += 1;
  record.updatedAt = Date.now();
  pushInfraEvent(store, "infrastructure_repaired", record.id);
  markDirty();
  return { ok: true, record };
}
