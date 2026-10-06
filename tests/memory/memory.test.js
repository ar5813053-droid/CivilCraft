/** Milestone 1 — Memory tests (pure logic mirrors). */
const MAX_CITIZEN = 30;
const MAX_CIV = 200;

function createStore() {
  return { citizens: {}, civilization: [], stats: { citizenEntries: 0, civEntries: 0 } };
}

function addCitizen(store, id, type, meta = {}) {
  if (!id || !type) return { ok: false, error: "invalid" };
  if (!store.citizens[id]) store.citizens[id] = [];
  const day = 1;
  const list = store.citizens[id];
  if (list.some((m) => m.type === type && m.day === day)) return { ok: false, error: "duplicate" };
  list.push({ type, day, detail: meta });
  if (list.length > MAX_CITIZEN) store.citizens[id] = list.slice(-MAX_CITIZEN);
  store.stats.citizenEntries++;
  return { ok: true };
}

function addCiv(store, type, meta = {}) {
  if (!type) return { ok: false, error: "invalid" };
  store.civilization.push({ id: "c" + store.civilization.length, type, day: 1, metadata: meta });
  if (store.civilization.length > MAX_CIV) store.civilization = store.civilization.slice(-MAX_CIV);
  store.stats.civEntries++;
  return { ok: true };
}

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Memory\n");

const store = createStore();
assert(store.citizens && store.civilization, "initialization");
assert(addCitizen(store, "p1", "PLAYER_JOB_STARTED", { jobId: "farmer" }).ok, "add citizen memory");
assert(addCitizen(store, "p1", "PLAYER_JOB_STARTED", { jobId: "farmer" }).error === "duplicate", "duplicate prevention");
assert(addCitizen(store, null, "x").error === "invalid", "invalid input handling");
for (let i = 0; i < 40; i++) addCitizen(store, "p2", "m" + i, {});
assert(store.citizens.p2.length === MAX_CITIZEN, "bounded citizen history");
assert(addCiv(store, "ELECTION_COMPLETED", { winner: "c1" }).ok, "civilization memory");
assert(addCiv(store, "FOOD_SHORTAGE").ok, "food crisis memory");
assert(store.citizens.p1[0].type === "PLAYER_JOB_STARTED", "player memory");
assert(store.civilization.some((m) => m.type === "ELECTION_COMPLETED"), "election memory record");

console.log(failed ? `${failed} failed` : `\nAll ${passed} memory tests passed.`);
process.exit(failed ? 1 : 0);
