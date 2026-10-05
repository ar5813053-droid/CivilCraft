import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { MAX_MIGRATIONS } from "./population-data.js";
import { pushPopulationEvent } from "./population-events.js";

const REASONS = ["housing", "employment", "family", "education", "safety", "economy", "random_life_event"];

export function recordMigration(store, input) {
  if (!store) return { ok: false, error: "no_population" };
  if (!input?.villagerId) return { ok: false, error: "missing_villager" };
  const direction = input.direction === "out" ? "out" : "in";
  const record = {
    id: generateId("mig"),
    villagerId: input.villagerId,
    fromSettlementId: input.fromSettlementId || null,
    toSettlementId: input.toSettlementId || "settlement_main",
    reason: REASONS.includes(input.reason) ? input.reason : "economy",
    direction,
    createdAt: Date.now()
  };
  store.migrations.push(record);
  if (store.migrations.length > MAX_MIGRATIONS) store.migrations = store.migrations.slice(-MAX_MIGRATIONS);
  if (direction === "in") store.counters.migrationIn += 1;
  else store.counters.migrationOut += 1;
  pushPopulationEvent(store, direction === "in" ? "migration_in" : "migration_out", input.villagerId);
  markDirty();
  return { ok: true, migration: record };
}
