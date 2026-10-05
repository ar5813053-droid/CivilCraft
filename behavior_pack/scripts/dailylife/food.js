/**
 * Household food decisions. Economy owns the purchase.
 */

import { getQty } from "../economy/inventory.js";
import { purchaseGoods } from "../economy/transactions.js";
import { getAllShops, getShopPrice } from "../economy/shops.js";
import { getGood } from "../economy/goods-registry.js";

export const FOOD_GOOD_ID = "bread";
export const HUNGER_THRESHOLD = 35;
export const MAX_FOOD_PER_DAY = 10;
export const MAX_FOOD_RESULTS = 200;
export const MAX_FOOD_COOLDOWNS = 1000;

export function ensureFoodState(store) {
  if (!store.food) store.food = { householdCooldowns: {}, recentResults: [] };
  if (!store.food.householdCooldowns) store.food.householdCooldowns = {};
  if (!Array.isArray(store.food.recentResults)) store.food.recentResults = [];
  return store.food;
}

export function householdFoodQty(members) {
  return (members || []).reduce((sum, member) => sum + getQty(member.inventory, FOOD_GOOD_ID), 0);
}

export function getHouseholdFoodStatus(household, members, needsById, dayStamp, cooldowns) {
  const foodAvailable = householdFoodQty(members);
  const hungry = (members || []).some((m) => (needsById?.[m.id]?.hunger ?? 80) < HUNGER_THRESHOLD);
  const estimatedNeed = Math.min(MAX_FOOD_PER_DAY, Math.max(1, members?.length || 1));
  const last = cooldowns?.[household?.id]?.lastDayStamp;
  return {
    householdId: household?.id || null,
    memberCount: members?.length || 0,
    foodAvailable,
    estimatedNeed,
    needsPurchase: foodAvailable < estimatedNeed && (hungry || foodAvailable === 0),
    canAttemptToday: last !== dayStamp
  };
}

export function choosePayer(members) {
  const adults = (members || []).filter((m) => m.alive !== false && (m.lifeStage === "adult" || m.lifeStage === "young_adult" || typeof m.age !== "number" || m.age >= 18));
  return adults.sort((a, b) => (b.money || 0) - (a.money || 0))[0] || null;
}

function recordResult(store, result) {
  const food = ensureFoodState(store);
  food.recentResults.push(result);
  if (food.recentResults.length > MAX_FOOD_RESULTS) food.recentResults = food.recentResults.slice(-MAX_FOOD_RESULTS);
  const ids = Object.keys(food.householdCooldowns);
  if (ids.length > MAX_FOOD_COOLDOWNS) delete food.householdCooldowns[ids[0]];
  food.householdCooldowns[result.householdId] = { lastDayStamp: result.dayStamp };
  return result;
}

export function evaluateHouseholdFood(store, household, members, needsById, dayStamp) {
  const food = ensureFoodState(store);
  const status = getHouseholdFoodStatus(household, members, needsById, dayStamp, food.householdCooldowns);
  if (!household) return { attempted: false, purchased: false, reason: "missing_household" };
  if (!status.canAttemptToday) {
    return { householdId: household.id, dayStamp, attempted: false, purchased: false, quantity: 0, reason: "already_purchased_today" };
  }
  if (!status.needsPurchase) {
    return recordResult(store, { householdId: household.id, dayStamp, attempted: false, purchased: false, quantity: 0, reason: status.foodAvailable > 0 ? "sufficient_food" : "no_hunger_need" });
  }
  if (!getGood(FOOD_GOOD_ID)) {
    return recordResult(store, { householdId: household.id, dayStamp, attempted: true, purchased: false, quantity: 0, reason: "no_food_good" });
  }
  const shop = getAllShops().find((s) => getQty(s.inventory, FOOD_GOOD_ID) > 0);
  if (!shop) {
    return recordResult(store, { householdId: household.id, dayStamp, attempted: true, purchased: false, quantity: 0, reason: "no_food_shop" });
  }
  const payer = choosePayer(members);
  if (!payer) {
    return recordResult(store, { householdId: household.id, dayStamp, attempted: true, purchased: false, quantity: 0, reason: "no_payer" });
  }
  const quantity = Math.min(MAX_FOOD_PER_DAY, status.estimatedNeed, getQty(shop.inventory, FOOD_GOOD_ID));
  const price = getShopPrice(shop, FOOD_GOOD_ID);
  const result = purchaseGoods({
    buyer: payer,
    seller: shop,
    goodId: FOOD_GOOD_ID,
    quantity,
    unitPrice: price,
    reason: "household_food"
  });
  if (!result.ok) {
    return recordResult(store, {
      householdId: household.id,
      dayStamp,
      attempted: true,
      purchased: false,
      quantity: 0,
      payerVillagerId: payer.id,
      reason: result.error === "insufficient_funds" ? "insufficient_funds" : "purchase_failed"
    });
  }
  return recordResult(store, {
    householdId: household.id,
    dayStamp,
    attempted: true,
    purchased: true,
    quantity,
    goodId: FOOD_GOOD_ID,
    payerVillagerId: payer.id,
    reason: "purchased"
  });
}
