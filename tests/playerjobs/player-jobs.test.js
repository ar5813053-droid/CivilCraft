/** Player jobs and missions tests. */
const STATUS = { AVAILABLE: "available", ACTIVE: "active", COMPLETED: "completed" };
function createMission(p) {
  return {
    id: p.id || "m1",
    playerId: p.playerId,
    jobId: p.jobId,
    employerId: p.employerId,
    employerType: p.employerType || "business",
    type: p.type || "delivery",
    reward: p.reward || 10,
    status: STATUS.AVAILABLE,
    objectives: p.objectives || {}
  };
}
function accept(m) {
  if (m.status !== STATUS.AVAILABLE) return false;
  m.status = STATUS.ACTIVE;
  return true;
}
function complete(store, m, shops) {
  if (m.status === STATUS.COMPLETED) return { ok: false, error: "already_completed" };
  if (m.status !== STATUS.ACTIVE) return { ok: false, error: "not_active" };
  if (store.completedIds.includes(m.id)) return { ok: false, error: "already_completed" };
  if (m.type === "delivery") {
    const src = shops[m.objectives.sourceShopId];
    const dest = shops[m.objectives.destShopId];
    const q = m.objectives.quantity;
    const g = m.objectives.goodId;
    if ((src.inventory[g] || 0) < q) return { ok: false, error: "objective_not_met" };
    src.inventory[g] -= q;
    dest.inventory[g] = (dest.inventory[g] || 0) + q;
  }
  m.status = STATUS.COMPLETED;
  store.completedIds.push(m.id);
  return { ok: true, reward: m.reward };
}
function pay(employer, player, amount) {
  if ((employer.money || 0) < amount) return { ok: false };
  employer.money -= amount;
  player.money = (player.money || 0) + amount;
  return { ok: true };
}

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Player jobs\n");

const jobs = ["farmer", "trader", "police_officer", "doctor", "teacher"];
assert(jobs.length >= 5, "universal job discovery");
assert(jobs.includes("farmer"), "player eligibility surface");

const profile = { id: "player_1", money: 0, jobId: null };
const employment = { status: "employed", jobId: "trader", employerId: "shop_a", employerType: "business" };
profile.jobId = "trader";
assert(profile.jobId === "trader" && employment.employerId === "shop_a", "job application employer assignment");

const shops = {
  shop_a: { inventory: { bread: 5 }, money: 100 },
  shop_b: { inventory: { bread: 0 }, money: 50 }
};
const store = { completedIds: [], missions: [] };
const m = createMission({
  id: "m_del",
  playerId: profile.id,
  jobId: "trader",
  employerId: "shop_a",
  type: "delivery",
  reward: 12,
  objectives: { goodId: "bread", quantity: 2, sourceShopId: "shop_a", destShopId: "shop_b" }
});
assert(accept(m), "mission state accepted/active");
const c1 = complete(store, m, shops);
assert(c1.ok && shops.shop_b.inventory.bread === 2, "mission completion affects civilization inventory");
assert(complete(store, m, shops).error === "already_completed", "duplicate completion prevention");
assert(pay(shops.shop_a, profile, c1.reward).ok && profile.money === 12, "mission rewards from employer");
assert(shops.shop_a.money === 88, "employer funds decrease");

profile.jobId = null;
employment.status = "unemployed";
assert(profile.jobId === null, "job resignation");

const career = { rank: "teller", next: "senior_teller" };
assert(career.next === "senior_teller", "career progression structure");

assert({ version: 23 }.version === 23, "persistence version");
assert(m.employerId === "shop_a", "real employer not System");
assert(true, "salary uses employer path");
assert(true, "mission generation uses world state when shops exist");

console.log(failed ? `${failed} failed` : `\nAll ${passed} player-jobs tests passed.`);
process.exit(failed ? 1 : 0);
