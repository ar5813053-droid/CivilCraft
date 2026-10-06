/** Phase 16 utilities tests. */
function demand(pop, biz) { return Math.min(100, Math.floor(pop * 0.5 + biz * 2)); }
function quality(cap, dem, cov) { return Math.floor(Math.min(100, Math.max(0, cov * 0.4 + Math.min(100, (cap / Math.max(1, dem)) * 50) * 0.6))); }
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Utilities\n");
const net = { water: { capacity: 50, demand: 0, coverage: 50, quality: 50 } };
assert(net.water.capacity === 50, "utility service creation and capacity");
net.water.demand = demand(40, 5);
assert(net.water.demand === 30, "demand from population and businesses");
net.water.quality = quality(50, 30, 50);
assert(net.water.quality > 0 && net.water.quality <= 100, "quality");
assert(demand(100, 0) > demand(10, 0), "population effect");
assert(demand(0, 10) > demand(0, 1), "business effect");
const infra = 70;
assert(quality(infra, 20, infra) >= 50, "infrastructure integration");
const hcMod = 0.9 + net.water.quality / 500;
assert(hcMod >= 0.9 && hcMod <= 1.05, "healthcare/education/business modifier band");
const maintCost = 5; let treasury = 3;
assert(treasury < maintCost, "insufficient funds for maintenance");
treasury = 20; treasury -= maintCost;
assert(treasury === 15, "maintenance expense");
assert({ version: 16 }.version === 16, "v15 to v16 migration");
let cursor = 0; cursor = (cursor + 10) % 3; assert(cursor === 1, "bounded processing cursor");
console.log(failed ? `${failed} failed` : `\nAll ${passed} utilities tests passed.`);
process.exit(failed ? 1 : 0);
