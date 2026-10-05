/**
 * Deterministic wallet unit tests (Node, no Minecraft).
 * Run: node tests/economy/wallet.test.js
 */

function sanitizeMoney(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function credit(holder, amount) {
  const add = sanitizeMoney(amount);
  if (add <= 0) return { ok: false, credited: 0, balance: sanitizeMoney(holder.money) };
  const HARD_CAP = 10_000_000;
  const current = sanitizeMoney(holder.money);
  const next = Math.min(HARD_CAP, current + add);
  const credited = next - current;
  holder.money = next;
  return { ok: credited > 0, credited, balance: next };
}

function debit(holder, amount) {
  const cost = sanitizeMoney(amount);
  if (cost <= 0) return { ok: false, debited: 0, balance: sanitizeMoney(holder.money) };
  const current = sanitizeMoney(holder.money);
  if (current < cost) return { ok: false, debited: 0, balance: current, error: "insufficient_funds" };
  holder.money = current - cost;
  return { ok: true, debited: cost, balance: holder.money };
}

function transfer(from, to, amount) {
  const value = sanitizeMoney(amount);
  if (value <= 0) return { ok: false };
  const d = debit(from, value);
  if (!d.ok) return { ok: false, error: d.error };
  credit(to, value);
  return { ok: true, amount: value };
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

console.log("Wallet tests\n");

const a = { money: 100 };
assert(credit(a, 50).ok && a.money === 150, "credit 50");
assert(!debit(a, 200).ok && a.money === 150, "debit rejects overspend");
assert(debit(a, 50).ok && a.money === 100, "debit 50");
assert(sanitizeMoney(-5) === 0, "sanitize negative");
assert(sanitizeMoney(3.9) === 3, "sanitize floor");
assert(sanitizeMoney(NaN) === 0, "sanitize NaN");
assert(sanitizeMoney(Infinity) === 0, "sanitize Infinity");

const b = { money: 0 };
assert(transfer(a, b, 40).ok && a.money === 60 && b.money === 40, "transfer 40");
assert(!transfer(b, a, 100).ok, "transfer insufficient fails");

const c = { money: 10_000_000 };
credit(c, 100);
assert(c.money === 10_000_000, "hard cap respected");

console.log(failed === 0 ? `\nAll ${passed} wallet tests passed.` : `\n${failed} failed, ${passed} passed.`);
process.exit(failed === 0 ? 0 : 1);
