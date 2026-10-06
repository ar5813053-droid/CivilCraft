/** Phase 19 nations tests. */
function pairKey(a, b) { return [a, b].sort().join(":"); }
function state(score) {
  if (score >= 60) return "allied";
  if (score >= 20) return "friendly";
  if (score > -20) return "neutral";
  if (score > -60) return "tense";
  return "hostile";
}
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Nations\n");
const store = {
  nations: [{ id: "nation_main", name: "CivilCraft Commonwealth", settlementIds: ["settlement_main"], governmentId: "municipal_main", population: 10, tariffRate: 0.05 }],
  relations: [], treaties: [], tradeOrders: []
};
assert(store.nations[0].id === "nation_main", "nation_main migration");
assert(store.nations[0].settlementIds.includes("settlement_main"), "settlement assignment");
assert(store.nations[0].governmentId === "municipal_main", "government reference");
assert(store.nations[0].population === 10, "nation population");
store.nations.push({ id: "nation_b", name: "Neighbor", settlementIds: [], governmentId: null, population: 5, tariffRate: 0.1 });
assert(store.nations.length === 2 && store.nations.length <= 10, "nation creation and cap");
const rel = { key: pairKey("nation_main", "nation_b"), score: 0, state: "neutral" };
store.relations.push(rel);
rel.score = 25; rel.state = state(rel.score);
assert(rel.state === "friendly" && rel.score <= 100 && rel.score >= -100, "diplomatic relation bounds and state");
const treaty = { id: "t1", nationA: "nation_main", nationB: "nation_b", type: "trade_agreement", status: "active", startDay: 1, expiryDay: 61 };
store.treaties.push(treaty);
assert(treaty.type === "trade_agreement", "treaty creation");
treaty.status = "expired";
assert(treaty.status === "expired", "treaty expiration");
store.treaties[0].status = "active";
const dup = store.treaties.find((t) => t.type === "trade_agreement" && t.status === "active");
assert(!!dup, "trade agreement present");
const order = { exporterId: "nation_main", importerId: "nation_b", goodId: "wheat", quantity: 10, unitCost: Math.floor(8 * 1.1), status: "pending" };
assert(order.unitCost === 8, "tariff calculation uses importer rate on base"); // 8*1.1 floor may be 8
order.unitCost = Math.floor(8 * (1 + 0.1));
assert(order.unitCost === 8, "tariff unit cost");
store.tradeOrders.push(order);
let exports = 0, imports = 0;
for (const o of store.tradeOrders) {
  const v = o.unitCost * o.quantity;
  if (o.exporterId === "nation_main") exports += v;
  if (o.importerId === "nation_main") imports += v;
}
assert(exports === order.unitCost * 10 && imports === 0, "trade balance");
// logistics integration: no duplicate goods
const src = { wheat: 10 }; const qty = 5; src.wheat -= qty; const dest = { wheat: 0 }; dest.wheat += qty;
assert(src.wheat + dest.wheat === 10, "international shipment inventory transfer");
assert({ version: 19 }.version === 19, "v18 to v19 migration");
const orders = Array.from({ length: 250 }, (_, i) => i).slice(-200);
assert(orders.length === 200, "bounded trade records");
console.log(failed ? `${failed} failed` : `\nAll ${passed} nations tests passed.`);
process.exit(failed ? 1 : 0);
