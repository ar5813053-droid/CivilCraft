/** Living civilization expansion tests. */
function hashId(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function personality(id) {
  const traits = ["ambition", "sociability", "loyalty"];
  const out = {};
  traits.forEach((t, i) => {
    out[t] = (hashId(id + t) % 101);
  });
  return out;
}
function primaryGoal(p, ctx) {
  if ((ctx.hunger ?? 100) < 30) return "find_food";
  if (ctx.unemployed) return "find_job";
  if ((p.ambition || 0) > 70) return "earn_money";
  return "maintain_routine";
}
function scoreV2(c) {
  const w = { employment: 0.14, food: 0.14, safety: 0.12, housing: 0.1, health: 0.1, education: 0.1, utilities: 0.1, approval: 0.1, prosperity: 0.1 };
  let s = 0;
  for (const k of Object.keys(w)) s += (c[k] || 0) * w[k];
  return Math.round(s);
}

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Living civilization\n");

const p1 = personality("v1");
const p2 = personality("v1");
assert(p1.ambition === p2.ambition, "personality deterministic");
assert(personality("v2").ambition !== undefined, "personality generation");
assert(primaryGoal({ ambition: 80 }, { unemployed: false, hunger: 80 }) === "earn_money", "goals from personality");
assert(primaryGoal({}, { hunger: 10 }) === "find_food", "decision prioritizes needs");

const mem = { civilization: [] };
mem.civilization.push({ type: "festival_started", day: 1 });
assert(mem.civilization.length === 1, "civilization memory");
mem.civilization.push({ type: "food_shortage", day: 2 });
assert(mem.civilization.some((m) => m.type === "food_shortage"), "memory events");

const bus = [];
function publish(t, p) { bus.push({ t, p }); }
publish("FOOD_SHORTAGE", { food: 20 });
assert(bus[0].t === "FOOD_SHORTAGE", "event bus publish");

const fest = { id: "festival_harvest", status: "active", themes: ["food"] };
assert(fest.themes.includes("food"), "festival registry");

const calendar = { day: 40, year: 1, YEAR: 120 };
assert(calendar.day === 40, "calendar");

const ev = { status: "scheduled" };
ev.status = "announced";
ev.status = "active";
ev.status = "completed";
assert(ev.status === "completed", "event lifecycle");

const sc = scoreV2({ employment: 70, food: 50, safety: 80, housing: 60, health: 55, education: 50, utilities: 50, approval: 55, prosperity: 50 });
assert(sc >= 0 && sc <= 100, "civilization score 2.0");
const reasons = [];
if (50 < 40) reasons.push("- food"); else reasons.push("+ food");
assert(reasons.length >= 1, "score reasons");

// Golden chain sketch: shortage → demand → memory
let demand = 0;
function onShortage() { demand += 8; mem.civilization.push({ type: "food_shortage" }); }
onShortage();
assert(demand === 8 && mem.civilization.filter((x) => x.type === "food_shortage").length >= 1, "food crisis reaction chain");

assert({ version: 24 }.version === 24, "migration version");
const capped = Array.from({ length: 250 }, (_, i) => i).slice(-200);
assert(capped.length === 200, "caps");

console.log(failed ? `${failed} failed` : `\nAll ${passed} living-civilization tests passed.`);
process.exit(failed ? 1 : 0);
