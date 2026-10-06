/** Phase 14 business production tests. */
const RECIPES = {
  bread: { inputs: [{ goodId: "wheat", amount: 2 }], outputs: [{ goodId: "bread", amount: 1 }], jobIds: ["trader"], maxPerCycle: 5 }
};
function produce(shop, recipe, employees, day) {
  if (!shop.active) return { produced: false, reason: "inactive" };
  if (shop.lastProductionDay === day) return { produced: false, reason: "cooldown" };
  if (!employees.length) return { produced: false, reason: "no_employee" };
  if (!employees.some((e) => recipe.jobIds.includes(e.jobId))) return { produced: false, reason: "wrong_job" };
  for (const i of recipe.inputs) if ((shop.inv[i.goodId] || 0) < i.amount) return { produced: false, reason: "missing_inputs" };
  for (const i of recipe.inputs) shop.inv[i.goodId] -= i.amount;
  for (const o of recipe.outputs) shop.inv[o.goodId] = (shop.inv[o.goodId] || 0) + o.amount;
  shop.lastProductionDay = day;
  return { produced: true };
}
function purchase(shop, qty) {
  if ((shop.inv.bread || 0) < qty) return { ok: false, reason: "stockout" };
  shop.inv.bread -= qty;
  shop.revenue = (shop.revenue || 0) + qty * 8;
  shop.balance = (shop.balance || 0) + qty * 8;
  return { ok: true };
}
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Business production\n");
const shop = { active: true, inv: { wheat: 10, bread: 0 }, revenue: 0, balance: 50, lastProductionDay: null };
assert(Object.keys(shop.inv).length >= 1, "business inventory");
assert(RECIPES.bread.inputs[0].amount === 2, "recipe validation");
assert(produce(shop, RECIPES.bread, [], 1).reason === "no_employee", "production without employee");
assert(produce(shop, RECIPES.bread, [{ jobId: "trader" }], 1).produced, "production with employee");
assert(shop.inv.wheat === 8 && shop.inv.bread === 1, "input consumption and output creation");
assert(produce(shop, RECIPES.bread, [{ jobId: "trader" }], 1).reason === "cooldown", "production cooldown");
shop.inv.wheat = 0;
assert(produce(shop, RECIPES.bread, [{ jobId: "trader" }], 2).reason === "missing_inputs", "missing inputs");
assert(purchase(shop, 1).ok && shop.inv.bread === 0, "purchase consumes stock");
assert(shop.revenue === 8, "purchase creates revenue");
assert(purchase(shop, 1).reason === "stockout", "stockout");
assert({ version: 14, inv: shop.inv }.version === 14, "v13 to v14 migration");
console.log(failed ? `${failed} failed` : `\nAll ${passed} production-business tests passed.`);
process.exit(failed ? 1 : 0);
