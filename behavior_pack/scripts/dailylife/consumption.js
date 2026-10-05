/**
 * Citizen meals. Inventory and demand stay in Economy.
 * Phase 9 already decays hunger in tickNeeds; this module does not.
 */

import { getQty } from "../economy/inventory.js";
import { consumeOwnGoods } from "../economy/transactions.js";
import { recordDemand } from "../economy/prices.js";
import { getGood } from "../economy/goods-registry.js";

export const DAILY_FOOD_REQUIREMENT = 1;
export const HUNGER_RESTORE = 40;
export const MEAL_HUNGER = 70;
export const MAX_CONSUMPTION_RESULTS = 200;
export const MAX_CONSUMPTION_COOLDOWNS = 2000;
export const FOOD_PRIORITY = ["bread"];

export function ensureConsumptionState(store) {
  if (!store.consumption) store.consumption = { citizenCooldowns: {}, recentResults: [] };
  return store.consumption;
}

export function findAvailableFood(villager) {
  for (const id of FOOD_PRIORITY) {
    const good = getGood(id);
    if (!good || good.consumable === false) continue;
    if (getQty(villager?.inventory, id) >= DAILY_FOOD_REQUIREMENT) return id;
  }
  return null;
}

export function getConsumptionStatus(villager, hunger, dayStamp, cooldowns) {
  const last = cooldowns?.[villager?.id];
  return {
    villagerId: villager?.id || null,
    foodAvailable: findAvailableFood(villager),
    hunger,
    alreadyConsumed: last?.lastConsumedDay === dayStamp,
    eligible: (hunger ?? 100) < MEAL_HUNGER && last?.lastConsumedDay !== dayStamp
  };
}

function pushResult(store, result) {
  const state = ensureConsumptionState(store);
  state.recentResults.push(result);
  if (state.recentResults.length > MAX_CONSUMPTION_RESULTS) {
    state.recentResults = state.recentResults.slice(-MAX_CONSUMPTION_RESULTS);
  }
  const ids = Object.keys(state.citizenCooldowns);
  if (ids.length > MAX_CONSUMPTION_COOLDOWNS) delete state.citizenCooldowns[ids[0]];
  return result;
}

export function evaluateCitizenConsumption(store, villager, needs, dayStamp) {
  if (!villager) return { consumed: false, reason: "invalid_villager" };
  const state = ensureConsumptionState(store);
  const hungerBefore = needs?.hunger ?? 70;
  if (state.citizenCooldowns[villager.id]?.lastConsumedDay === dayStamp) {
    return { villagerId: villager.id, dayStamp, consumed: false, quantity: 0, goodId: null, hungerBefore, hungerAfter: hungerBefore, reason: "already_consumed" };
  }
  if (hungerBefore >= MEAL_HUNGER) {
    return { villagerId: villager.id, dayStamp, consumed: false, quantity: 0, goodId: null, hungerBefore, hungerAfter: hungerBefore, reason: "already_consumed" };
  }
  const goodId = findAvailableFood(villager);
  if (!goodId) {
    return pushResult(store, { villagerId: villager.id, dayStamp, consumed: false, quantity: 0, goodId: null, hungerBefore, hungerAfter: hungerBefore, reason: "no_food" });
  }
  const eaten = consumeOwnGoods(villager, goodId, DAILY_FOOD_REQUIREMENT, "daily_meal");
  if (!eaten.ok) {
    return pushResult(store, { villagerId: villager.id, dayStamp, consumed: false, quantity: 0, goodId, hungerBefore, hungerAfter: hungerBefore, reason: "insufficient_food" });
  }
  recordDemand(goodId, DAILY_FOOD_REQUIREMENT);
  const hungerAfter = Math.max(0, Math.min(100, hungerBefore + HUNGER_RESTORE));
  if (needs) needs.hunger = hungerAfter;
  state.citizenCooldowns[villager.id] = { lastConsumedDay: dayStamp, quantity: DAILY_FOOD_REQUIREMENT, goodId };
  return pushResult(store, {
    villagerId: villager.id,
    dayStamp,
    consumed: true,
    quantity: DAILY_FOOD_REQUIREMENT,
    goodId,
    hungerBefore,
    hungerAfter,
    reason: hungerBefore < 15 ? "urgent_meal" : "daily_meal"
  });
}
