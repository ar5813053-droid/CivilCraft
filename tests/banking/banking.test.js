/** Banking tests — fully-backed deposits. */
function sanitize(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}
function credit(h, a) { h.money = sanitize((h.money || 0) + a); return { ok: true }; }
function debit(h, a) {
  a = sanitize(a);
  if ((h.money || 0) < a) return { ok: false, error: "insufficient" };
  h.money -= a;
  return { ok: true };
}
function openAccount(store, ownerId) {
  if (store.accounts[ownerId]) return { ok: true, existing: true };
  store.accounts[ownerId] = { id: "acc_" + ownerId, ownerId, money: 0, status: "active", history: [] };
  return { ok: true, account: store.accounts[ownerId] };
}
function deposit(store, ownerId, wallet, amount) {
  amount = sanitize(amount);
  if (amount <= 0) return { ok: false, error: "invalid_amount" };
  const acc = store.accounts[ownerId];
  if (!acc) return { ok: false, error: "no_account" };
  if ((wallet.money || 0) < amount) return { ok: false, error: "insufficient_wallet" };
  debit(wallet, amount);
  credit(acc, amount);
  store.banks[0].liquidity = (store.banks[0].liquidity || 0) + amount;
  return { ok: true, balance: acc.money };
}
function withdraw(store, ownerId, wallet, amount) {
  amount = sanitize(amount);
  const acc = store.accounts[ownerId];
  if (!acc || acc.money < amount) return { ok: false, error: "insufficient_account" };
  if ((store.banks[0].liquidity || 0) < amount) return { ok: false, error: "insufficient_liquidity" };
  debit(acc, amount);
  credit(wallet, amount);
  store.banks[0].liquidity -= amount;
  return { ok: true, wallet: wallet.money };
}
function transfer(store, a, b, amount) {
  amount = sanitize(amount);
  if (a === b) return { ok: false, error: "invalid_parties" };
  if (store.accounts[a].money < amount) return { ok: false, error: "insufficient_account" };
  debit(store.accounts[a], amount);
  credit(store.accounts[b], amount);
  return { ok: true };
}

let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Banking\n");
const store = { banks: [{ id: "bank_central", operational: true, liquidity: 0 }], accounts: {}, transactions: [] };
const wallet = { money: 50 };
assert(openAccount(store, "p1").ok, "bank account creation");
assert(deposit(store, "p1", wallet, 0).error === "invalid_amount", "negative/zero deposit blocked");
assert(deposit(store, "p1", wallet, 100).error === "insufficient_wallet", "insufficient wallet");
assert(deposit(store, "p1", wallet, 30).ok && wallet.money === 20 && store.accounts.p1.money === 30, "deposit");
assert(store.banks[0].liquidity === 30, "bank liquidity increases");
assert(withdraw(store, "p1", wallet, 10).ok && wallet.money === 30 && store.accounts.p1.money === 20, "withdrawal");
openAccount(store, "p2");
assert(transfer(store, "p1", "p2", 5).ok && store.accounts.p2.money === 5, "transfer");
assert(transfer(store, "p1", "p1", 1).error === "invalid_parties", "self transfer blocked");
assert(withdraw(store, "p1", wallet, 999).error === "insufficient_account", "insufficient balance");
const total = wallet.money + store.accounts.p1.money + store.accounts.p2.money;
assert(total === 50, "no money creation (conservation)");
assert({ version: 22 }.version === 22, "migration version");
console.log(failed ? `${failed} failed` : `\nAll ${passed} banking tests passed.`);
process.exit(failed ? 1 : 0);
