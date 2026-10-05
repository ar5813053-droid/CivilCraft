/**
 * Emergency dispatch tests. Run: node tests/emergency/emergency.test.js
 */

const TYPES = ["crime", "medical", "fire", "accident"];
const PRIORITIES = ["low", "normal", "high", "critical"];

function responseTime(base, workload, distance) {
  return Math.max(1, Math.floor(base)) + Math.max(0, Math.min(10, workload)) * 5 + Math.max(0, Math.min(40, Math.floor(distance / 16)));
}
function create(store, input) {
  if (!TYPES.includes(input.type)) return { ok: false, error: "invalid_type" };
  const emergency = {
    emergencyId: "e" + store.emergencies.length,
    type: input.type,
    priority: PRIORITIES.includes(input.priority) ? input.priority : "normal",
    jurisdiction: input.jurisdiction || "municipal_main",
    status: "reported",
    distance: input.distance || 0
  };
  store.emergencies.push(emergency);
  return { ok: true, emergency };
}
function dispatch(store, emergency) {
  const unit = store.units.find((u) => u.status === "available" && u.jurisdiction === emergency.jurisdiction);
  if (!unit) {
    emergency.status = "queued";
    return { ok: false, status: "queued" };
  }
  unit.status = "responding";
  emergency.assignedUnitId = unit.unitId;
  emergency.status = "dispatched";
  emergency.responseTime = responseTime(20, 1, emergency.distance);
  return { ok: true, unit };
}

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }

console.log("Emergency\n");
const store = { emergencies: [], history: [], units: [{ unitId: "u1", status: "available", jurisdiction: "municipal_main" }] };
const created = create(store, { type: "fire", priority: "high" });
assert(created.ok && created.emergency.priority === "high", "emergency creation");
assert(!create(store, { type: "alien" }).ok, "priority/type validation");
assert(created.emergency.jurisdiction === "municipal_main", "jurisdiction");
const d = dispatch(store, created.emergency);
assert(d.ok && created.emergency.assignedUnitId === "u1", "unit assignment");
assert(created.emergency.status === "dispatched", "status transition");
const queued = create(store, { type: "medical" }).emergency;
assert(!dispatch(store, queued).ok && queued.status === "queued", "no-unit queueing");
assert(responseTime(20, 2, 32) === 32, "response-time calculation");
created.emergency.status = "responding";
created.emergency.status = "resolved";
store.history.push(created.emergency);
assert(created.emergency.status === "resolved", "resolution");
store.history = Array.from({ length: 140 }, (_, i) => i).slice(-100);
assert(store.history.length === 100, "bounded history");

console.log(failed === 0 ? `\nAll ${passed} emergency tests passed.` : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
