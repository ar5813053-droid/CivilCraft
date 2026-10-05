/**
 * Police foundation tests. Run: node tests/police/police.test.js
 */

const ranks = {
  recruit: { salaryMultiplier: 1, authorityLevel: 1 },
  officer: { salaryMultiplier: 1.2 },
  chief: { salaryMultiplier: 2.2 }
};
function salaryFor(rank, base = 12) {
  return Math.max(1, Math.floor(base * (ranks[rank]?.salaryMultiplier || 1)));
}
function hire(store, villagerId, rank = "recruit") {
  if (!ranks[rank]) return { ok: false, error: "invalid_rank" };
  if (store.officers.some((o) => o.villagerId === villagerId)) return { ok: false, error: "duplicate_officer" };
  const officer = { officerId: "o" + store.officers.length, villagerId, rank, status: "available", stationId: "central_station" };
  store.officers.push(officer);
  return { ok: true, officer };
}
function reportCrime(store, justice, input) {
  const officer = store.officers.find((o) => o.officerId === input.officerId);
  if (!officer) return { ok: false, error: "missing_officer" };
  if (!input.lawId) return { ok: false, error: "unknown_law" };
  justice.violations.push({ lawId: input.lawId, offenderVillagerId: input.offenderVillagerId, severity: input.lawId === "assault" ? 3 : 2 });
  if (input.lawId === "assault") justice.status = "wanted";
  return { ok: true };
}
function pay(treasury, amount) {
  if (treasury.balance < amount) return { ok: false, unpaid: amount };
  treasury.balance -= amount;
  return { ok: true, paid: amount };
}

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }

console.log("Police\n");
const store = { officers: [], stations: [{ stationId: "central_station" }], arrests: [], unpaidSalaries: [] };
assert(hire(store, "v1").ok, "officer registration");
assert(!hire(store, "v1").ok, "duplicate prevention");
assert(salaryFor("officer") === 14, "rank salary");
assert(!hire(store, "v2", "admiral").ok, "invalid rank");
const officer = store.officers[0];
officer.stationId = "central_station";
assert(officer.stationId === "central_station", "station assignment");
const patrol = { status: "scheduled" };
patrol.status = "active";
assert(patrol.status === "active", "patrol status");
const justice = { violations: [], status: "clean" };
assert(reportCrime(store, justice, { officerId: officer.officerId, lawId: "theft", offenderVillagerId: "v9" }).ok, "crime reporting");
assert(justice.violations.length === 1, "justice API integration");
store.arrests.push({ status: "arrested", villagerId: "v9" });
assert(store.arrests[0].status === "arrested", "arrest creation");
reportCrime(store, justice, { officerId: officer.officerId, lawId: "assault", offenderVillagerId: "v9" });
assert(justice.status === "wanted", "wanted status integration");
assert(salaryFor("chief", 12) === 26, "salary calculation");
const treasury = { balance: 5 };
assert(!pay(treasury, 12).ok && treasury.balance === 5, "insufficient government funds");
store.unpaidSalaries.push({ amount: 12 });
assert(store.unpaidSalaries[0].amount === 12, "unpaid salary preserved");
store.officers = Array.from({ length: 120 }, (_, i) => i).slice(-100);
assert(store.officers.length === 100, "bounded records");

console.log(failed === 0 ? `\nAll ${passed} police tests passed.` : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
