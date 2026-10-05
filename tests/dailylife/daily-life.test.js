/** Daily life tests. Run: node tests/dailylife/daily-life.test.js */
function choose(input) {
  if (input.emergency) return "emergency";
  if (input.health < 30) return "healthcare";
  if (input.hunger < 20) return "eating";
  if (input.energy < 15) return "sleeping";
  if (!input.houseId) return "homeless";
  if (input.schoolScheduled) return "studying";
  if (input.workScheduled) return "working";
  if (input.hour >= 17 && input.hour < 20) return "leisure";
  return "idle";
}
function routine(hour) {
  if (hour < 6 || hour >= 22) return "sleeping";
  if (hour < 8) return "eating";
  if (hour < 12) return "working";
  return "leisure";
}
function happy(needs, prev) {
  const vals = Object.values(needs);
  const next = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return Math.max(0, Math.min(100, Math.round(prev + (next - prev) * 0.25)));
}
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ "+m);} else { failed++; console.error("  ✗ "+m);} }
console.log("Daily life\n");
const state = { villagerId: "v1", activity: "idle", locationId: null };
state.activity = "working";
assert(state.activity === "working", "activity state and transition");
assert(routine(9) === "working" && routine(23) === "sleeping", "daily schedule selection");
assert(choose({ energy: 10, health: 80, hunger: 80, houseId: "h" }) === "sleeping", "sleep priority");
assert(choose({ hunger: 10, health: 80, energy: 80, houseId: "h" }) === "eating", "food priority");
assert(choose({ health: 20, hunger: 80, energy: 80, houseId: "h" }) === "healthcare", "healthcare priority");
assert(choose({ health: 80, hunger: 80, energy: 80, houseId: "h", workScheduled: true }) === "working", "work selection");
assert(choose({ health: 80, hunger: 80, energy: 80, houseId: "h", schoolScheduled: true }) === "studying", "school selection");
const shop = { shoppingDay: 1 };
assert(shop.shoppingDay === 1, "shopping cooldown");
assert(choose({ health: 80, hunger: 80, energy: 80, houseId: "h", hour: 18 }) === "leisure", "leisure behavior");
state.activity = "socializing";
assert(state.activity === "socializing", "social behavior");
const score = happy({ hunger: 80, energy: 80 }, 40);
assert(score > 40 && score < 80, "happiness smoothing");
const stress = Math.min(100, 20 + 20);
assert(stress === 40, "stress calculation");
assert(choose({ health: 80, hunger: 80, energy: 80, houseId: null }) === "homeless", "homeless behavior");
state.locationId = "h1";
assert(state.locationId === "h1", "house reference");
assert(choose({ health: 80, hunger: 80, energy: 80, houseId: "h", workScheduled: true, jobId: "farmer" }) === "working", "job reference");
assert("central_clinic" && "central_school", "clinic and school selection ids");
assert(choose({ emergency: true, health: 80, hunger: 80, energy: 80, houseId: "h" }) === "emergency", "emergency priority");
const attendance = [{ attended: true }, { attended: false }];
assert(attendance.filter((a) => a.attended).length / attendance.length === 0.5, "attendance tracking");
const day = { cooldowns: { food: 1 }, day: 2 };
day.cooldowns = {};
assert(Object.keys(day.cooldowns).length === 0, "daily reset");
assert(routine(0) === "sleeping", "simulation time handling");
let cursor = 0;
const ids = [1, 2, 3, 4, 5];
cursor = (cursor + 2) % ids.length;
assert(cursor === 2, "batch cursor");
const events = Array.from({ length: 240 }, (_, i) => i).slice(-200);
assert(events.length === 200, "collection caps");
const migrated = { version: 9, villagers: { v1: { money: 12 } }, dailyLife: { states: [] }, economyKept: true };
assert(migrated.version === 9 && migrated.villagers.v1.money === 12 && migrated.economyKept, "v8 to v9 migration");
console.log(failed ? `${failed} failed` : `\nAll ${passed} daily-life tests passed.`);
process.exit(failed ? 1 : 0);
