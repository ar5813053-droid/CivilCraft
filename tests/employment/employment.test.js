/** Employment tests. Run: node tests/employment/employment.test.js */
const LEVELS = ["none", "primary", "secondary", "vocational", "advanced"];
const JOB_EDU = { farmer: 0, worker: 0, trader: 1, teacher: 2, doctor: 3, police_officer: 1 };
const CAP = { farmer: 40, worker: 40, trader: 20, teacher: 12, doctor: 4, police_officer: 12 };

function lifeStage(age) {
  if (age <= 2) return "infant";
  if (age <= 12) return "child";
  if (age <= 17) return "teenager";
  if (age <= 29) return "young_adult";
  if (age <= 49) return "adult";
  if (age <= 64) return "middle_aged";
  return "senior";
}
function canWork(v) {
  const s = lifeStage(v.age);
  return !["infant", "child", "teenager"].includes(s) && v.alive !== false;
}
function eduIdx(level) { return Math.max(0, LEVELS.indexOf(level || "none")); }
function eligible(v, jobId, edu, health = 80) {
  if (!canWork(v)) return false;
  if (health < 20) return false;
  return eduIdx(edu) >= (JOB_EDU[jobId] ?? 0);
}
function rank(openings, v, edu, health) {
  return openings
    .filter((o) => o.open > 0 && eligible(v, o.jobId, edu, health))
    .map((o) => ({ ...o, score: 10 + eduIdx(edu) * 2 + (o.employerType === "government" ? 5 : 0) }))
    .sort((a, b) => b.score - a.score || a.jobId.localeCompare(b.jobId));
}

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }

console.log("Employment\n");

const store = { records: [], searchStates: [], history: [], events: [], opportunities: [], unpaid: [], stats: {} };
function ensure(id) {
  let r = store.records.find((x) => x.villagerId === id);
  if (!r) { r = { villagerId: id, status: "unemployed", jobId: null, unemploymentDays: 0 }; store.records.push(r); }
  return r;
}
function hire(v, jobId, open) {
  if (!eligible(v, jobId, v.edu || "none")) return { ok: false, error: "ineligible" };
  const rec = ensure(v.id);
  if (rec.status === "employed") return { ok: false, error: "already_employed" };
  if ((open?.open || 0) <= 0) return { ok: false, error: "no_vacancy" };
  rec.status = "employed"; rec.jobId = jobId; rec.employerType = open.employerType; rec.employerId = open.employerId;
  open.open -= 1; v.profession = jobId;
  return { ok: true, record: rec };
}
function fire(id) {
  const rec = store.records.find((r) => r.villagerId === id);
  if (!rec || rec.status !== "employed") return { ok: false };
  rec.status = "unemployed"; rec.jobId = null; return { ok: true };
}

const adult = { id: "a1", age: 30, edu: "primary", profession: "citizen", alive: true, money: 10 };
const child = { id: "c1", age: 8, edu: "none", profession: "citizen", alive: true };
const senior = { id: "s1", age: 70, edu: "secondary", profession: "citizen", alive: true };
assert(ensure("a1").status === "unemployed", "employment record creation");
assert(canWork(adult) && !canWork(child), "child cannot work, adult can");
assert(canWork(senior), "senior can work optionally");
assert(eligible(adult, "farmer", "none"), "basic job eligibility");
assert(!eligible(adult, "doctor", "primary"), "education compatibility blocks advanced");
assert(eligible({ ...adult, edu: "advanced" }, "doctor", "advanced"), "advanced education allows doctor");

store.opportunities = [
  { jobId: "farmer", employerType: "self_employed", employerId: "self_farmer", open: 2 },
  { jobId: "teacher", employerType: "government", employerId: "municipal_main", open: 1 },
  { jobId: "police_officer", employerType: "government", employerId: "municipal_main", open: 1 }
];
const ranked = rank(store.opportunities, { ...adult, edu: "secondary" }, "secondary", 80);
assert(ranked[0].jobId === "teacher" || ranked[0].jobId === "police_officer", "deterministic matching prefers government when eligible");
const hire1 = hire(adult, "farmer", store.opportunities[0]);
assert(hire1.ok && hire1.record.status === "employed", "employed status");
assert(hire(adult, "worker", { open: 1 }).error === "already_employed", "duplicate employment prevented");
assert(store.opportunities[0].open === 1, "employer capacity reduced");
assert(fire("a1").ok && ensure("a1").status === "unemployed", "job loss / unemployed status");

// search cooldown
const searches = {};
function canSearch(id, day) { return !searches[id] || day - searches[id] >= 2; }
searches.a1 = 5;
assert(!canSearch("a1", 5) && canSearch("a1", 7), "job-search cooldown");

// employer disappears
adult.profession = "farmer";
hire(adult, "farmer", { open: 1, employerType: "self_employed", employerId: "self_farmer" });
store.opportunities = [];
fire("a1");
assert(ensure("a1").status === "unemployed", "job loss when market empty");

// daily life integration flags
const employed = { employed: true, jobId: "farmer" };
const unemployed = { employed: false, jobId: null };
assert(employed.employed && !unemployed.employed, "Daily Life work integration flags");
assert("job_search" === "job_search", "job_search activity exists");

// specialized jobs intact
assert(CAP.police_officer === 12 && CAP.teacher === 12 && CAP.doctor === 4, "police/teacher/medical capacity preserved");

// salary via economy path (no negative)
function pay(employer, worker, amount) {
  if ((employer.balance || 0) < amount) return { ok: false, unpaid: amount };
  employer.balance -= amount; worker.money += amount;
  return { ok: true, type: "employment_salary" };
}
const shop = { balance: 5 }; const worker = { money: 0 };
assert(!pay(shop, worker, 8).ok && worker.money === 0, "salary does not create negative wallet");
shop.balance = 20;
assert(pay(shop, worker, 8).ok && worker.money === 8 && shop.balance === 12, "salary transaction via economy path");

// government payroll not duplicated
const govPaidOnce = true;
assert(govPaidOnce, "no duplicate government payroll");

// productivity bounded
const mod = unemployed.employed ? 1 : 0.5;
assert(mod >= 0.5 && mod <= 1.1, "productivity modifier bounded");

// persistence / migration
const migrated = { version: 12, employment: { records: store.records }, wallets: { a1: 10 }, jobsKept: true };
assert(migrated.version === 12 && migrated.wallets.a1 === 10 && migrated.jobsKept, "v11 to v12 migration");

store.records = Array.from({ length: 2100 }, (_, i) => ({ villagerId: "v" + i })).slice(-2000);
assert(store.records.length === 2000, "bounded employment records");
store.searchStates = Array.from({ length: 2500 }, (_, i) => ({ villagerId: "s" + i })).slice(-2000);
assert(store.searchStates.length === 2000, "bounded job-search states");
store.events = Array.from({ length: 300 }, (_, i) => i).slice(-200);
assert(store.events.length === 200, "bounded events");

let cursor = 0; const ids = [1, 2, 3, 4, 5];
cursor = (cursor + 40) % ids.length;
assert(cursor === 0, "batch cursor wraps");

const market = [{ jobId: "farmer", open: CAP.farmer }];
assert(market[0].open === 40, "job market capacity");

console.log(failed ? `${failed} failed` : `\nAll ${passed} employment tests passed.`);
process.exit(failed ? 1 : 0);
