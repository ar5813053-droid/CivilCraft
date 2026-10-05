import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { getHouseType, occupancyStatus } from "./housing-types.js";
import { MAX_HOUSES } from "./housing-data.js";
import { pushHousingEvent } from "./housing-events.js";

export function createHouse(store, input) {
  if (!store) return { ok: false, error: "no_housing" };
  const type = getHouseType(input?.type || "small_house");
  if (!type) return { ok: false, error: "invalid_type" };
  const house = {
    id: input.id || generateId("house"),
    settlementId: input.settlementId || "settlement_main",
    type: type.id,
    ownerId: input.ownerId || null,
    householdId: null,
    location: input.location || null,
    capacity: type.capacity,
    occupants: 0,
    condition: 80,
    rent: type.rent,
    value: type.value,
    quality: type.quality,
    ownership: input.ownerId ? "owner" : "vacant",
    status: "vacant",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  store.houses.push(house);
  if (store.houses.length > MAX_HOUSES) store.houses = store.houses.slice(-MAX_HOUSES);
  pushHousingEvent(store, "house_created", house.id);
  markDirty();
  return { ok: true, house };
}

export function refreshHouseStatus(house) {
  if (!house || house.status === "unavailable" || house.status === "abandoned") return house;
  house.status = occupancyStatus(house.occupants, house.capacity);
  house.updatedAt = Date.now();
  return house;
}

export function assignHousehold(store, houseId, household) {
  const house = store.houses.find((h) => h.id === houseId);
  if (!house || !household) return { ok: false, error: "missing" };
  if (house.settlementId !== household.settlementId) return { ok: false, error: "settlement_mismatch" };
  if (house.status === "unavailable") return { ok: false, error: "unavailable" };
  if (household.houseId && household.houseId !== house.id) return { ok: false, error: "already_housed" };
  const size = household.memberIds?.length || household.size || 1;
  if (house.occupants + size > house.capacity && house.householdId !== household.id) {
    return { ok: false, error: "no_capacity" };
  }
  house.householdId = household.id;
  house.occupants = size;
  household.houseId = house.id;
  household.status = "housed";
  refreshHouseStatus(house);
  pushHousingEvent(store, "house_assigned", house.id);
  markDirty();
  return { ok: true, house };
}

export function releaseHousehold(store, houseId) {
  const house = store.houses.find((h) => h.id === houseId);
  if (!house) return { ok: false, error: "missing" };
  house.householdId = null;
  house.occupants = 0;
  refreshHouseStatus(house);
  pushHousingEvent(store, "house_released", house.id);
  markDirty();
  return { ok: true, house };
}

export function decayCondition(store) {
  for (const house of store.houses || []) {
    const type = getHouseType(house.type);
    const drop = type?.maintenance || 1;
    house.condition = Math.max(0, (house.condition || 0) - drop);
  }
}
