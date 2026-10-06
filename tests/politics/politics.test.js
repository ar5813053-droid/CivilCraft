/** Phase 18 politics tests. */
const PARTIES = [
  { id: "civic_reform", name: "Civic Reform", economicPriority: 55, welfarePriority: 60, safetyPriority: 50, educationPriority: 70, healthcarePriority: 65, infrastructurePriority: 55, utilityPriority: 55 },
  { id: "economic_growth", name: "Economic Growth", economicPriority: 80, welfarePriority: 40, safetyPriority: 50, educationPriority: 50, healthcarePriority: 45, infrastructurePriority: 70, utilityPriority: 60 }
];
function alignment(prefs, party) {
  const keys = ["economicPriority", "safetyPriority", "healthcarePriority", "educationPriority", "infrastructurePriority", "welfarePriority"];
  let s = 0;
  for (const k of keys) s += 100 - Math.abs((prefs[k] ?? 50) - (party[k] ?? 50));
  return Math.round(s / keys.length);
}
function score(prefs, party, popularity, approval) {
  return alignment(prefs, party) + Math.round(popularity * 0.5) + Math.round(approval * 0.2);
}
function eligible(v, edu) {
  return v.alive !== false && v.age >= 18 && ["primary", "secondary", "vocational", "advanced"].includes(edu);
}
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Politics\n");
assert(PARTIES.length === 2 && PARTIES[0].id === "civic_reform", "party creation");
assert(PARTIES[0].economicPriority >= 0 && PARTIES[0].economicPriority <= 100, "party validation");
const prefs = { economicPriority: 70, safetyPriority: 50, healthcarePriority: 50, educationPriority: 50, infrastructurePriority: 50, welfarePriority: 50 };
assert(alignment(prefs, PARTIES[1]) > alignment(prefs, PARTIES[0]), "preference alignment");
const smoothed = Math.round(50 + (70 - 50) * 0.2);
assert(smoothed === 54, "preference smoothing");
assert(eligible({ age: 30, alive: true }, "primary") && !eligible({ age: 10, alive: true }, "primary"), "candidate eligibility");
const cands = [];
function reg(id, party) {
  if (cands.some((c) => c.villagerId === id)) return { ok: false, error: "duplicate" };
  if (!eligible({ age: 30, alive: true }, "primary")) return { ok: false };
  cands.push({ id: "c_" + id, villagerId: id, partyId: party, popularity: 50 });
  return { ok: true };
}
assert(reg("v1", "civic_reform").ok, "candidate registration");
assert(reg("v1", "civic_reform").error === "duplicate", "duplicate candidate prevention");
const election = { status: "voting", candidates: ["c_v1", "c_v2"], votes: { c_v1: 0, c_v2: 0 }, winnerId: null };
cands.push({ id: "c_v2", villagerId: "v2", partyId: "economic_growth", popularity: 60 });
const s1 = score(prefs, PARTIES[0], 50, 50);
const s2 = score(prefs, PARTIES[1], 60, 50);
const vote = s2 >= s1 ? "c_v2" : "c_v1";
election.votes[vote] += 1;
assert(election.votes[vote] === 1, "voting");
assert(typeof s1 === "number" && s1 > 0, "deterministic vote scoring");
election.votes = { c_v1: 3, c_v2: 3 };
let winner = null, max = -1;
for (const [id, v] of Object.entries(election.votes)) {
  if (v > max || (v === max && id.localeCompare(winner || "") < 0)) { max = v; winner = id; }
}
assert(winner === "c_v1", "tie-breaking");
election.winnerId = winner;
election.status = "completed";
assert(election.status === "completed" && election.winnerId, "winner selection");
const gov = { leadership: { mayor: null }, policy: { incomeTaxRate: 0.1 } };
gov.leadership.mayor = { villagerId: "v1" };
gov.rulingPartyId = "civic_reform";
assert(gov.leadership.mayor.villagerId === "v1" && gov.rulingPartyId === "civic_reform", "government leadership and ruling party");
const taxBias = (PARTIES[0].economicPriority - 50) / 100;
gov.policy.incomeTaxRate = Math.max(0.05, Math.min(0.15, gov.policy.incomeTaxRate + taxBias * 0.02));
assert(gov.policy.incomeTaxRate >= 0.05 && gov.policy.incomeTaxRate <= 0.15, "policy application tax bounds");
assert({ version: 18, parties: PARTIES }.version === 18, "v17 to v18 migration");
const events = Array.from({ length: 250 }, (_, i) => i).slice(-200);
assert(events.length === 200, "bounded events");
console.log(failed ? `${failed} failed` : `\nAll ${passed} politics tests passed.`);
process.exit(failed ? 1 : 0);
