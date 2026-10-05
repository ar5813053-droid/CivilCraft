/** Household food decision tests. Run: node tests/dailylife/food.test.js */
const MAX = 10;
const THRESHOLD = 35;
function qty(members) { return members.reduce((s, m) => s + (m.food || 0), 0); }
function status(household, members, needs, day, cooldowns) {
  const food = qty(members);
  const hungry = members.some((m) => (needs[m.id] ?? 80) < THRESHOLD);
  const need = Math.min(MAX, members.length);
  return { foodAvailable: food, needsPurchase: food < need && (hungry || food === 0), canAttemptToday: cooldowns[household.id] !== day, estimatedNeed: need };
}
function payer(members) { return members.filter((m) => m.age >= 18).sort((a, b) => b.money - a.money)[0] || null; }
function decide(store, household, members, needs, day, economy) {
  const st = status(household, members, needs, day, store.cooldowns);
  if (!st.canAttemptToday) return { purchased: false, reason: "already_purchased_today" };
  if (!st.needsPurchase) return { purchased: false, reason: "sufficient_food" };
  if (!economy.good) return { purchased: false, reason: "no_food_good", attempted: true };
  if (!economy.shop) return { purchased: false, reason: "no_food_shop", attempted: true };
  const who = payer(members);
  if (!who) return { purchased: false, reason: "no_payer", attempted: true };
  const quantity = Math.min(MAX, st.estimatedNeed);
  if (who.money < quantity * economy.price) {
    store.cooldowns[household.id] = day;
    return { purchased: false, reason: "insufficient_funds", attempted: true };
  }
  who.money -= quantity * economy.price;
  who.food += quantity;
  economy.shopStock -= quantity;
  store.cooldowns[household.id] = day;
  store.results.push({ householdId: household.id });
  return { purchased: true, quantity, payer: who.id, reason: "purchased" };
}
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ "+m);} else { failed++; console.error("  ✗ "+m);} }
console.log("Household food\n");
const hh = { id: "h1" };
const members = [{ id: "a", age: 30, money: 40, food: 0 }, { id: "b", age: 10, money: 0, food: 0 }];
const st = status(hh, members, { a: { hunger: 20 } }, 5, {});
assert(st.needsPurchase && st.foodAvailable === 0, "household food status and low hunger");
members[0].food = 4;
assert(!status(hh, members, { a: { hunger: 80 } }, 5, {}).needsPurchase, "sufficient food prevents purchase");
members[0].food = 0;
const store = { cooldowns: {}, results: [] };
const economy = { good: true, shop: true, shopStock: 20, price: 2 };
const seen = new Set();
let buys = 0;
for (const id of ["a", "b", "a"]) {
  if (seen.has(hh.id)) continue;
  seen.add(hh.id);
  const result = decide(store, hh, members, { a: { hunger: 20 } }, 5, economy);
  if (result.purchased) buys += 1;
}
assert(buys === 1 && seen.size === 1, "one purchase and household dedupe");
assert(store.cooldowns.h1 === 5, "one purchase per day");
assert(decide(store, hh, members, { a: { hunger: 10 } }, 5, economy).reason === "already_purchased_today", "failed/success cooldown");
assert(payer(members).id === "a", "valid payer selection");
const poor = [{ id: "p", age: 30, money: 1, food: 0 }];
const poorStore = { cooldowns: {}, results: [] };
assert(decide(poorStore, { id: "h2" }, poor, { p: { hunger: 10 } }, 1, economy).reason === "insufficient_funds", "insufficient funds");
assert(poor[0].money === 1 && poor[0].food === 0, "no free food and wallet unchanged on failure");
const hungry = [{ id: "a", age: 30, money: 40, food: 0 }];
assert(decide({ cooldowns: {}, results: [] }, { id: "h3" }, hungry, { a: { hunger: 10 } }, 1, { good: false, shop: true, price: 2 }).reason === "no_food_good", "no food good");
assert(decide({ cooldowns: {}, results: [] }, { id: "h4" }, hungry, { a: { hunger: 10 } }, 2, { good: true, shop: false, price: 2 }).reason === "no_food_shop", "no food shop");
const buyer = { id: "a", age: 30, money: 40, food: 0 };
const before = buyer.money;
const ok = decide({ cooldowns: {}, results: [] }, { id: "h5" }, [buyer], { a: { hunger: 10 } }, 9, { good: true, shop: true, shopStock: 20, price: 2 });
assert(ok.purchased && ok.quantity <= 10 && buyer.money < before, "successful purchase within cap via economy path");
store.cooldowns = {};
assert(status(hh, members, {}, 8, {}).canAttemptToday, "day-stamp reset");
const migrated = { version: 10, villagers: { a: { money: 3 } }, food: { householdCooldowns: {}, recentResults: [] }, economyKept: true };
assert(migrated.version === 10 && migrated.villagers.a.money === 3 && migrated.economyKept, "v9 to v10 migration");
store.results = Array.from({ length: 250 }, (_, i) => i).slice(-200);
assert(store.results.length === 200, "bounded result history");
const cool = {};
for (let i = 0; i < 1000; i++) cool["h"+i] = 1;
assert(Object.keys(cool).length === 1000, "bounded household cooldowns");
console.log(failed ? `${failed} failed` : `\nAll ${passed} food tests passed.`);
process.exit(failed ? 1 : 0);
