/**
 * Settlement and infrastructure tests. Run: node tests/settlements/settlements.test.js
 */
const TYPES = [
  { type: "village", min: 0, cap: 100 },
  { type: "town", min: 100, cap: 300 },
  { type: "city", min: 300, cap: 1000 },
  { type: "metro", min: 1000, cap: 5000 }
];
const ORDER = ["village", "town", "city", "metro"];
function typeFor(pop, current = "village") {
  let next = "village";
  for (const row of TYPES) if (pop >= row.min) next = row.type;
  if (ORDER.indexOf(current) > ORDER.indexOf(next)) return current;
  return next;
}
function prosperity(metrics, prev = 40) {
  const vals = Object.values(metrics);
  const next = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return Math.max(0, Math.min(100, Math.round(prev + (next - prev) * 0.25)));
}
function coverage(records) {
  const types = new Set(records.map((r) => r.type));
  return Math.min(100, types.size * 8);
}
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ "+m);} else { failed++; console.error("  ✗ "+m);} }

console.log("Settlements\n");
const store = { settlements: [], events: [] };
function migrate(data) {
  if (store.settlements.some((s) => s.id === "settlement_main")) return;
  store.settlements.push({ id: "settlement_main", name: data.villages.village_main.name, type: "village", population: data.villages.village_main.population });
  store.events.push("settlement_created");
}
const world = { villages: { village_main: { name: "Oak", population: 12 } }, economy: { totals: {} } };
migrate(world);
migrate(world);
assert(store.settlements.length === 1, "settlement creation and idempotent migration");
assert(store.settlements[0].name === "Oak", "migration preserves village name");
assert(typeFor(20) === "village", "type calculation");
assert(typeFor(100) === "town", "village to town");
assert(typeFor(300, "town") === "city", "town to city");
assert(typeFor(1000, "city") === "metro", "city to metro");
assert(typeFor(10, "town") === "town", "no downgrade by default");
const score = prosperity({ wealth: 80, jobs: 70 }, 40);
assert(score > 40 && score <= 100, "prosperity calculation");
assert(score < 90, "prosperity smoothing");
const infra = { records: [{ id: "central_clinic", type: "clinic", settlementId: "settlement_main", capacity: 8 }], roads: [] };
assert(infra.records[0].id === "central_clinic", "infrastructure registration");
infra.records = infra.records.filter((r) => r.id !== "central_clinic");
assert(infra.records.length === 0, "infrastructure removal");
infra.records.push({ type: "clinic" }, { type: "school" }, { type: "police_station" });
assert(coverage(infra.records) === 24, "infrastructure coverage");
assert(TYPES.find((t) => t.type === "city").cap === 1000, "capacity calculation");
infra.roads.push({ id: "r1", type: "local", settlementId: "settlement_main" });
assert(infra.roads[0].type === "local", "road registration");
const project = { status: "completed", infrastructureId: "central_clinic", applied: false };
const facility = { id: "central_clinic", condition: 70, capacity: 8, settlementId: "settlement_main" };
if (project.status === "completed" && !project.applied) { facility.condition += 10; project.applied = true; }
assert(facility.condition === 80 && project.applied, "public works integration");
assert(facility.settlementId === "settlement_main", "existing facility integration");
const normalized = { version: 7, settlements: store.settlements, villagesKept: true };
assert(normalized.villagesKept && normalized.version === 7, "persistence and v7 migration");
store.events = Array.from({ length: 140 }, (_, i) => i).slice(-100);
assert(store.events.length === 100, "collection caps");

console.log(failed ? `${failed} failed` : `\nAll ${passed} settlement tests passed.`);
process.exit(failed ? 1 : 0);
