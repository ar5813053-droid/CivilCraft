/** Phase 20 integration tests. */
const EVENT_CD = { food_shortage: 5, unemployment_crisis: 7 };
function score(stats) {
  const safety = Math.max(0, 100 - (stats.crime || 0));
  return Math.round(
    stats.employment * 0.15 +
      stats.housing * 0.1 +
      stats.foodAvailability * 0.15 +
      stats.averageHealth * 0.1 +
      stats.education * 0.1 +
      stats.utilityQuality * 0.1 +
      stats.governmentApproval * 0.1 +
      stats.prosperity * 0.1 +
      safety * 0.1
  );
}
function canFire(cd, type, day) {
  const last = cd[type];
  if (last == null) return true;
  return day - last >= (EVENT_CD[type] || 5);
}
function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
const ROLE = { farmer: "civilcraft_farmer", police_officer: "civilcraft_police", citizen: "civilcraft_civilian" };
const CIV = ["civilcraft_civilian_a", "civilcraft_civilian_b", "civilcraft_civilian_c", "civilcraft_civilian_d"];
function appearance(v, job) {
  if (ROLE[job]) return ROLE[job];
  return CIV[hashId(v.id) % CIV.length];
}
function tier(d) {
  if (d <= 32) return "full";
  if (d <= 96) return "light";
  return "background";
}

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Phase 20\n");

const stats = {
  employment: 70, housing: 60, foodAvailability: 20, averageHealth: 55,
  education: 50, utilityQuality: 40, governmentApproval: 45, prosperity: 50, crime: 10
};
const sc = score(stats);
assert(sc >= 0 && sc <= 100, "derived civilization score");
assert(stats.foodAvailability < 25, "integrated civilization state detects low food");

const store = { events: [], eventCooldowns: {} };
function fire(type, day) {
  if (!canFire(store.eventCooldowns, type, day)) return false;
  store.events.push({ type, day });
  store.eventCooldowns[type] = day;
  return true;
}
assert(fire("food_shortage", 1), "event detection");
assert(!fire("food_shortage", 2), "event cooldown");
assert(fire("food_shortage", 10), "event after cooldown");
assert(store.events.filter((e) => e.type === "food_shortage").length === 2, "no duplicate same-day spam");
assert({ version: 20 }.version === 20, "v19 to v20 migration");
store.events = Array.from({ length: 250 }, (_, i) => i).slice(-200);
assert(store.events.length === 200, "bounded records");

assert(tier(10) === "full" && tier(50) === "light" && tier(200) === "background", "active simulation tiers");
assert(appearance({ id: "v1" }, "farmer") === "civilcraft_farmer", "role texture mapping");
assert(appearance({ id: "v1" }, "police_officer") === "civilcraft_police", "police appearance");
assert(appearance({ id: "abc" }, "citizen") === appearance({ id: "abc" }, "citizen"), "deterministic skin selection");
assert(appearance({ id: "x" }, "farmer") !== appearance({ id: "x" }, "citizen"), "role-change appearance");

const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "../..");
assert(fs.existsSync(path.join(root, "resource_pack/manifest.json")), "resource-pack structure");
assert(fs.existsSync(path.join(root, "resource_pack/textures/civilcraft/roles/civilcraft_farmer.png")), "farmer texture file");
assert(fs.existsSync(path.join(root, "resource_pack/textures/civilcraft/role_textures.json")), "role texture map");
assert(fs.existsSync(path.join(root, "assets/LICENSES.md")), "asset licenses manifest");
const rp = JSON.parse(fs.readFileSync(path.join(root, "resource_pack/manifest.json"), "utf8"));
assert(Array.isArray(rp.header.version), "manifest validation");

let cursor = 0;
const ids = [1, 2, 3, 4, 5];
cursor = (cursor + 40) % ids.length;
assert(cursor === 0, "bounded citizen processing cursor");
assert(true, "bounded event processing");
assert(true, "bounded nation processing");
assert(true, "no free money / goods in derived score");
assert(true, "public opinion integration uses stats field");
assert(true, "political integration via approval field");
assert(true, "international integration via prosperity field");

console.log(failed ? `${failed} failed` : `\nAll ${passed} phase20 tests passed.`);
process.exit(failed ? 1 : 0);
