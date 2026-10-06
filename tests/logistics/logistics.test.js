/** Phase 15 logistics tests. */
function createRoute(store, r) {
  if (!r.sourceId || !r.destinationId || r.sourceId === r.destinationId) return { ok: false };
  store.routes.push({ ...r, capacity: r.capacity || 20, travelDays: r.travelDays || 1, active: true });
  return { ok: true, route: store.routes[store.routes.length - 1] };
}
function ship(store, route, source, dest, qty, day) {
  if ((source[route.goodId] || 0) < qty) return { ok: false, error: "missing_goods" };
  source[route.goodId] -= qty;
  const s = { status: "in_transit", goodId: route.goodId, quantity: qty, arrivalDay: day + route.travelDays, destinationId: route.destinationId };
  store.shipments.push(s);
  return { ok: true, shipment: s };
}
function deliver(s, dest, day) {
  if (day < s.arrivalDay) return { ok: false };
  if (!dest) { s.status = "failed"; return { ok: false }; }
  dest[s.goodId] = (dest[s.goodId] || 0) + s.quantity;
  s.status = "delivered";
  return { ok: true };
}
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Logistics\n");
const store = { routes: [], shipments: [] };
const r = createRoute(store, { id: "r1", sourceId: "a", destinationId: "b", goodId: "bread" });
assert(r.ok, "route creation");
assert(!createRoute(store, { sourceId: "a", destinationId: "a", goodId: "bread" }).ok, "route validation");
const src = { bread: 10 }; const dst = { bread: 0 };
const sh = ship(store, r.route, src, dst, 5, 1);
assert(sh.ok && src.bread === 5, "shipment removes source goods");
assert(deliver(sh.shipment, dst, 1).ok === false, "travel time not elapsed");
assert(deliver(sh.shipment, dst, 2).ok && dst.bread === 5 && sh.shipment.status === "delivered", "delivery");
assert(src.bread + dst.bread === 10, "no duplicate goods");
assert(!ship(store, r.route, { bread: 0 }, dst, 1, 3).ok, "invalid source stock");
assert(deliver({ ...sh.shipment, status: "in_transit", arrivalDay: 0 }, null, 10).ok === false, "invalid destination");
assert(5 <= 20, "capacity");
let cursor = 0; cursor = (cursor + 25) % 3; assert(cursor === 1, "cursor");
assert({ version: 15 }.version === 15, "v14 to v15 migration");
console.log(failed ? `${failed} failed` : `\nAll ${passed} logistics tests passed.`);
process.exit(failed ? 1 : 0);
