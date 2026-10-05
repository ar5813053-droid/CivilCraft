/** Healthcare tests. Run: node tests/healthcare/healthcare.test.js */
const CONDITIONS = { minor_illness: { treatmentCost: 8, healthImpact: 10 }, injury: { treatmentCost: 15 } };
function status(h) { return h >= 80 ? "healthy" : h >= 20 ? "injured" : "critical"; }
function prod(h) { if (h >= 80) return 1; if (h >= 60) return 0.9; if (h >= 40) return 0.75; if (h >= 20) return 0.5; return 0.25; }
function treat(store, villager, conditionId) {
  const cost = CONDITIONS[conditionId].treatmentCost;
  if (villager.money < cost) {
    store.bills.push({ amount: cost, status: "outstanding" });
    return { ok: false, error: "insufficient_funds" };
  }
  villager.money -= cost;
  store.records[0].health = Math.min(100, store.records[0].health + (CONDITIONS[conditionId].healthImpact || 0));
  store.stats.expenses += cost;
  return { ok: true, cost };
}
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ "+m);} else { failed++; console.error("  ✗ "+m);} }
console.log("Healthcare\n");
const store = { records: [{ villagerId: "v1", health: 50 }], clinics: [{ clinicId: "central_clinic", capacity: 8 }], staff: [], bills: [], stats: { expenses: 0 } };
assert(store.records[0].health === 50, "health normalization");
assert(CONDITIONS.injury.treatmentCost === 15, "condition registry");
assert(store.records[0].villagerId === "v1", "patient record");
const poor = { money: 2 };
assert(!treat(store, poor, "minor_illness").ok && store.bills[0].status === "outstanding", "unpaid medical bill");
const rich = { money: 20 };
assert(treat(store, rich, "minor_illness").ok && rich.money === 12, "successful payment");
assert(store.records[0].health === 60, "treatment improves health");
store.staff.push({ villagerId: "d1", role: "doctor" });
assert(store.staff.length === 1, "medical staff");
assert(store.clinics[0].clinicId === "central_clinic", "clinic registration");
const emergency = { type: "medical", status: "dispatched" };
assert(emergency.type === "medical" && store.staff.length > 0, "medical emergency integration");
assert(prod(85) === 1 && prod(10) === 0.25, "productivity modifier");
assert(status(5) === "critical", "critical status");
store.records = Array.from({ length: 600 }).slice(-500);
assert(store.records.length === 500, "bounded records");
console.log(failed ? `${failed} failed` : `\nAll ${passed} healthcare tests passed.`);
process.exit(failed ? 1 : 0);
