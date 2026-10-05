/**
 * Deterministic government tests (Node, no Minecraft).
 * Run: node tests/government/government.test.js
 */

function sanitizeMoney(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function computeIncomeTax(income, policy) {
  const earned = sanitizeMoney(income);
  const threshold = sanitizeMoney(policy?.threshold);
  let rate = policy?.ratePercent;
  if (typeof rate !== "number" || !Number.isFinite(rate)) rate = 0;
  rate = Math.max(0, Math.min(50, Math.floor(rate)));
  const maxTax = sanitizeMoney(policy?.maxTax);
  if (earned <= threshold || rate === 0) return { tax: 0, taxable: 0 };
  const taxable = earned - threshold;
  let tax = Math.floor((taxable * rate) / 100);
  if (maxTax > 0) tax = Math.min(tax, maxTax);
  return { tax: Math.max(0, tax), taxable };
}

function computeApproval(input) {
  const wealth = Number.isFinite(input.averageWealth) ? input.averageWealth : 0;
  const unemployment = Number.isFinite(input.unemploymentRate) ? input.unemploymentRate : 0;
  const taxRate = Number.isFinite(input.taxRatePercent) ? input.taxRatePercent : 0;
  const spending = Number.isFinite(input.spendingRatio) ? input.spendingRatio : 0;
  const food = Number.isFinite(input.foodSupply) ? input.foodSupply : 0;
  const economic = Math.max(-15, Math.min(15, Math.round((wealth - 40) / 10)));
  const foodMod = food >= 20 ? 5 : food >= 5 ? 0 : -8;
  const taxMod = Math.round(taxRate * 0.4);
  const unempMod = Math.round(unemployment * 25);
  const spendMod = Math.max(0, Math.min(10, Math.round(spending * 8)));
  return Math.max(0, Math.min(100, 60 + economic + foodMod - taxMod - unempMod + spendMod));
}

function credit(holder, amount) {
  const add = sanitizeMoney(amount);
  if (add <= 0) return { ok: false };
  holder.money = sanitizeMoney(holder.money) + add;
  return { ok: true, credited: add };
}
function debit(holder, amount) {
  const cost = sanitizeMoney(amount);
  if (sanitizeMoney(holder.money) < cost) return { ok: false, error: "insufficient_funds" };
  holder.money -= cost;
  return { ok: true, debited: cost };
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

const policy = { ratePercent: 10, threshold: 20, maxTax: 50 };

console.log("Taxation\n");
assert(computeIncomeTax(0, policy).tax === 0, "0 income");
assert(computeIncomeTax(20, policy).tax === 0, "exactly threshold");
assert(computeIncomeTax(19, policy).tax === 0, "below threshold");
assert(computeIncomeTax(100, policy).tax === 8, "above threshold taxes only excess (80*10%)");
assert(computeIncomeTax(1000, policy).tax === 50, "maximum tax cap");
assert(computeIncomeTax(100, { ratePercent: -5, threshold: 0, maxTax: 50 }).tax === 0, "invalid negative rate clamped");
assert(computeIncomeTax(100, { ratePercent: 200, threshold: 0, maxTax: 0 }).tax <= 50, "rate clamped to 50%");

console.log("\nTreasury\n");
const treasury = { money: 0 };
assert(credit(treasury, 100).ok && treasury.money === 100, "deposit");
assert(debit(treasury, 40).ok && treasury.money === 60, "expense");
assert(!debit(treasury, 100).ok && treasury.money === 60, "insufficient funds");
assert(sanitizeMoney(-20) === 0, "negative values sanitized");

console.log("\nBudget\n");
const budget = { public_works: 50, administration: 20, reserve: 10 };
const treas = { money: 80 };
function spend(category, amount) {
  const cost = sanitizeMoney(amount);
  if (budget[category] < cost) return { ok: false, error: "budget_insufficient" };
  if (treas.money < cost) return { ok: false, error: "treasury_insufficient" };
  budget[category] -= cost;
  treas.money -= cost;
  return { ok: true };
}
assert(spend("public_works", 30).ok && budget.public_works === 20 && treas.money === 50, "allocation spend");
assert(!spend("public_works", 40).ok, "overspend category blocked");
assert(!spend("administration", 100).ok && treas.money === 50, "overspend does not reduce treasury");

console.log("\nApproval\n");
const normal = computeApproval({
  averageWealth: 50,
  unemploymentRate: 0.1,
  taxRatePercent: 10,
  spendingRatio: 0.4,
  foodSupply: 30
});
const highUnemp = computeApproval({
  averageWealth: 50,
  unemploymentRate: 0.8,
  taxRatePercent: 10,
  spendingRatio: 0.4,
  foodSupply: 30
});
const highTax = computeApproval({
  averageWealth: 50,
  unemploymentRate: 0.1,
  taxRatePercent: 40,
  spendingRatio: 0.4,
  foodSupply: 30
});
const goodSpend = computeApproval({
  averageWealth: 50,
  unemploymentRate: 0.1,
  taxRatePercent: 10,
  spendingRatio: 1.5,
  foodSupply: 30
});
assert(normal > 50 && normal < 90, `normal economy in range (${normal})`);
assert(highUnemp < normal, `high unemployment lowers approval (${highUnemp} < ${normal})`);
assert(highTax < normal, `high tax lowers approval (${highTax} < ${normal})`);
assert(goodSpend >= normal, `public spending does not lower approval (${goodSpend} >= ${normal})`);
assert(computeApproval({ averageWealth: -100, unemploymentRate: 5, taxRatePercent: 100, spendingRatio: 0, foodSupply: 0 }) >= 0, "approval floor");
assert(computeApproval({ averageWealth: 9999, unemploymentRate: 0, taxRatePercent: 0, spendingRatio: 5, foodSupply: 100 }) <= 100, "approval cap");

console.log(failed === 0 ? `\nAll ${passed} government tests passed.` : `\n${failed} failed, ${passed} passed.`);
process.exit(failed === 0 ? 0 : 1);
