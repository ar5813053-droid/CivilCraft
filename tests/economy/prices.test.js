/**
 * Price formula unit tests (Node).
 * Run: node tests/economy/prices.test.js
 */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function nextPrice(base, minP, maxP, current, supply, demand, alpha = 0.15) {
  const ratio = demand / Math.max(supply, 1);
  const factor = clamp(0.5 + 0.5 * ratio, 0.5, 2.0);
  const target = base * factor;
  const lerped = current + (target - current) * alpha;
  return Math.round(clamp(lerped, minP, maxP));
}

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

console.log("Price formula tests\n");

const base = 10;
// High supply, low demand → price trends down toward 0.5 * base = 5
let p = 10;
for (let i = 0; i < 40; i++) p = nextPrice(base, 1, 40, p, 100, 0);
assert(p < 10 && p >= 5, `high supply lowers price (got ${p})`);

// Low supply, high demand → price trends up toward 2 * base = 20
p = 10;
for (let i = 0; i < 40; i++) p = nextPrice(base, 1, 40, p, 1, 50);
assert(p > 10 && p <= 20, `high demand raises price (got ${p})`);

// Never exceeds max
p = 39;
p = nextPrice(base, 1, 40, p, 0, 1000);
assert(p <= 40, `respects maxPrice (got ${p})`);

// Never below min
p = 2;
p = nextPrice(base, 1, 40, p, 10000, 0);
assert(p >= 1, `respects minPrice (got ${p})`);

// Gradual: single step should not jump full distance
const before = 10;
const after = nextPrice(base, 1, 40, before, 1, 100);
assert(Math.abs(after - before) < 10, `single step is gradual (delta ${after - before})`);

console.log(failed === 0 ? `\nAll ${passed} price tests passed.` : `\n${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
