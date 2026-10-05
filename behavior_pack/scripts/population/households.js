import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { MAX_HOUSEHOLDS } from "./population-data.js";
import { pushPopulationEvent } from "./population-events.js";

export function createHousehold(store, input) {
  if (!store) return { ok: false, error: "no_population" };
  const members = Array.isArray(input?.memberIds) ? input.memberIds.slice(0, 12) : [];
  const household = {
    id: input.id || generateId("hh"),
    settlementId: input.settlementId || "settlement_main",
    houseId: null,
    memberIds: members,
    headId: input.headId || members[0] || null,
    income: 0,
    expenses: 0,
    savings: 0,
    size: members.length,
    status: "homeless",
    structure: members.length > 1 ? "shared_household" : "single",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  store.households.push(household);
  if (store.households.length > MAX_HOUSEHOLDS) store.households = store.households.slice(-MAX_HOUSEHOLDS);
  pushPopulationEvent(store, "household_created", household.id);
  markDirty();
  return { ok: true, household };
}

export function familyStructure(household, relationships) {
  if (!household) return "single";
  const members = new Set(household.memberIds || []);
  const rels = (relationships || []).filter((r) => members.has(r.fromVillagerId) && members.has(r.toVillagerId) && r.active !== false);
  const hasSpouse = rels.some((r) => r.type === "spouse");
  const hasChild = rels.some((r) => r.type === "child");
  if (hasSpouse && hasChild) return "couple_with_children";
  if (hasSpouse) return "couple";
  if (hasChild) return "single_parent";
  if (members.size > 2) return "extended_family";
  if (members.size > 1) return "shared_household";
  return "single";
}
