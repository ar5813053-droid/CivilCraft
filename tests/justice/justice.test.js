/**
 * Deterministic justice tests (Node, no Minecraft).
 * Run: node tests/justice/justice.test.js
 */

const MAX_FINE = 200;
const MAX_EVENTS = 100;

function computeFine(law, offenseCount, cap = MAX_FINE) {
  const count = Math.max(1, Math.floor(offenseCount || 1));
  const multiplier = Math.max(1, Math.min(2, law.repeatOffenseMultiplier || 1));
  const scaled = Math.floor(law.fine * Math.pow(multiplier, count - 1));
  return Math.max(0, Math.min(Math.min(MAX_FINE, cap), scaled));
}

const laws = new Map();
function registerLaw(def) {
  laws.set(def.id, { enabled: true, jurisdiction: "municipal_main", cooldownMs: 60000, ...def });
}
function getLaw(id) { return laws.get(id); }

registerLaw({ id: "theft", name: "Theft", category: "property", severity: 2, fine: 25, repeatOffenseMultiplier: 1.5 });
registerLaw({ id: "tax_evasion", name: "Tax Evasion", category: "finance", severity: 2, fine: 20, jurisdiction: "municipal_main" });

function reportViolation(store, input, now) {
  const law = getLaw(input.lawId);
  if (!law || law.enabled === false) return { ok: false, error: "unknown_law" };
  const key = `${input.offenderVillagerId}:${law.id}`;
  if (law.cooldownMs > 0 && now - (store.cooldowns[key] || 0) < law.cooldownMs) {
    return { ok: false, error: "cooldown" };
  }
  const violation = { id: "v" + store.violations.length, lawId: law.id, status: "reported", offenderVillagerId: input.offenderVillagerId };
  store.violations.push(violation);
  store.cooldowns[key] = now;
  store.events.push({ type: "violation_reported" });
  return { ok: true, violation };
}

const transitions = {
  open: ["investigating", "dismissed"],
  investigating: ["hearing", "convicted"],
  hearing: ["convicted", "dismissed"],
  convicted: ["closed"],
  dismissed: ["closed"],
  closed: []
};
function setCaseStatus(legalCase, status) {
  if (!transitions[legalCase.status].includes(status)) return { ok: false, error: "invalid_transition" };
  legalCase.status = status;
  return { ok: true };
}

function pay(villager, treasury, amount) {
  if (amount <= 0) return { ok: false, error: "invalid" };
  if (villager.money < amount) return { ok: false, error: "insufficient_funds", outstanding: amount };
  villager.money -= amount;
  treasury.balance += amount;
  return { ok: true, paid: amount };
}

function derive(store, id) {
  let rank = 0;
  for (const p of store.penalties) {
    if (p.villagerId !== id) continue;
    if (p.type === "temporary_ban" && p.status !== "expired") rank = Math.max(rank, 4);
    if (p.type === "fine" && p.status === "outstanding") rank = Math.max(rank, 2);
    if (p.type === "warning") rank = Math.max(rank, 1);
  }
  for (const v of store.violations) {
    if (v.offenderVillagerId === id && v.severity >= 3 && v.status !== "dismissed") rank = Math.max(rank, 3);
  }
  return ["clean", "warned", "fined", "wanted", "restricted"][rank];
}

function normalizeJustice(raw) {
  const base = { version: 1, jurisdiction: "municipal_main", violations: [], cases: [], penalties: [], events: [], villagersKept: true };
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    version: raw.version || 1,
    jurisdiction: raw.jurisdiction || "municipal_main",
    violations: Array.isArray(raw.violations) ? raw.violations.slice(-100) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-100) : [],
    economyKept: raw.economyKept !== false,
    governmentKept: raw.governmentKept !== false
  };
}

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log("Laws\n");
assert(getLaw("theft").name === "Theft", "law lookup");
assert(!getLaw("nope"), "missing law");
assert(getLaw("tax_evasion").jurisdiction === "municipal_main", "jurisdiction");

console.log("\nViolations\n");
const store = { violations: [], cooldowns: {}, events: [], penalties: [], cases: [] };
const a = reportViolation(store, { lawId: "theft", offenderVillagerId: "v1" }, 1_000_000);
assert(a.ok, "violation created");
assert(!reportViolation(store, { lawId: "theft", offenderVillagerId: "v1" }, 1_010_000).ok, "cooldown blocks duplicate");
assert(reportViolation(store, { lawId: "theft", offenderVillagerId: "v1" }, 1_000_000 + 60000).ok, "cooldown expires");

console.log("\nCases\n");
const legalCase = { status: "open" };
assert(setCaseStatus(legalCase, "investigating").ok, "open to investigating");
assert(!setCaseStatus(legalCase, "closed").ok, "invalid skip rejected");
assert(setCaseStatus(legalCase, "convicted").ok, "investigating to convicted");

console.log("\nFines\n");
assert(computeFine(getLaw("theft"), 1) === 25, "first offense 25");
assert(computeFine(getLaw("theft"), 2) === 37, "second offense 37");
assert(computeFine(getLaw("theft"), 3) === 56, "third offense 56");
assert(computeFine({ fine: 100, repeatOffenseMultiplier: 2 }, 8) === 200, "fine cap");

const villager = { money: 30 };
const treasury = { balance: 10 };
const paid = pay(villager, treasury, 25);
assert(paid.ok && villager.money === 5 && treasury.balance === 35, "fine payment reaches treasury");
const poor = { money: 5 };
assert(!pay(poor, treasury, 25).ok && poor.money === 5, "insufficient funds leaves wallet");
assert(pay(poor, treasury, 25).outstanding === 25, "outstanding fine preserved");

console.log("\nStatus\n");
store.penalties.push({ villagerId: "v1", type: "warning", status: "outstanding" });
assert(derive(store, "v1") === "warned", "warned");
store.penalties.push({ villagerId: "v1", type: "fine", status: "outstanding" });
assert(derive(store, "v1") === "fined", "fined beats warned");
store.violations.push({ offenderVillagerId: "v1", severity: 3, status: "confirmed" });
assert(derive(store, "v1") === "wanted", "wanted from severe open violation");
store.penalties.push({ villagerId: "v1", type: "temporary_ban", status: "outstanding", expiresAt: 9e15 });
assert(derive(store, "v1") === "restricted", "restricted highest");
assert(derive(store, "other") === "clean", "clean default");

console.log("\nPersistence\n");
const migrated = normalizeJustice({ version: 3, violations: [{ id: 1 }], economyKept: true, governmentKept: true });
assert(migrated.violations.length === 1 && migrated.economyKept && migrated.governmentKept, "migration keeps prior data");
const events = Array.from({ length: 140 }, (_, i) => i);
assert(normalizeJustice({ events }).events.length === 100, "event history bounded");

console.log(failed === 0 ? `\nAll ${passed} justice tests passed.` : `\n${failed} failed, ${passed} passed.`);
process.exit(failed === 0 ? 0 : 1);
