import { MAX_ACCOUNTS, MAX_BANK_TX, MAX_STATEMENT } from "./banking-data.js";
import { sanitizeMoney, getBalance, setBalance, credit, debit } from "../economy/wallet.js";
import { markDirty } from "../core/data-store.js";

export function getAccount(store, ownerId) {
  return store.accounts?.[ownerId] || null;
}

export function openAccount(store, ownerId, bankId = "bank_central") {
  if (!ownerId) return { ok: false, error: "invalid_owner" };
  if (store.accounts[ownerId]) return { ok: true, account: store.accounts[ownerId], existing: true };
  if (Object.keys(store.accounts).length >= MAX_ACCOUNTS) return { ok: false, error: "capacity" };
  const bank = (store.banks || []).find((b) => b.id === bankId);
  if (!bank || !bank.operational) return { ok: false, error: "bank_closed" };
  const account = {
    id: `acc_${ownerId}`,
    ownerId,
    bankId,
    money: 0,
    status: "active",
    createdDay: Math.floor(Date.now() / 86400000),
    lastActivity: Date.now(),
    history: []
  };
  store.accounts[ownerId] = account;
  markDirty();
  return { ok: true, account };
}

function pushTx(store, tx) {
  store.transactions.push(tx);
  if (store.transactions.length > MAX_BANK_TX) {
    store.transactions = store.transactions.slice(-MAX_BANK_TX);
  }
}

function pushHistory(account, entry) {
  account.history = account.history || [];
  account.history.push(entry);
  if (account.history.length > MAX_STATEMENT) {
    account.history = account.history.slice(-MAX_STATEMENT);
  }
}

/**
 * Deposit from personal wallet (cash holder) into bank account.
 */
export function deposit(store, ownerId, cashHolder, amount) {
  const amt = sanitizeMoney(amount);
  if (amt <= 0) return { ok: false, error: "invalid_amount" };
  const account = getAccount(store, ownerId);
  if (!account || account.status !== "active") return { ok: false, error: "no_account" };
  const bank = (store.banks || []).find((b) => b.id === account.bankId);
  if (!bank?.operational) return { ok: false, error: "bank_closed" };
  if (getBalance(cashHolder) < amt) return { ok: false, error: "insufficient_wallet" };
  const d = debit(cashHolder, amt);
  if (!d.ok) return { ok: false, error: d.error || "debit_failed" };
  credit(account, amt);
  bank.liquidity = sanitizeMoney((bank.liquidity || 0) + amt);
  const tx = {
    id: `btx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: "deposit",
    ownerId,
    amount: amt,
    timestamp: Date.now()
  };
  pushTx(store, tx);
  pushHistory(account, tx);
  account.lastActivity = Date.now();
  store.stats.deposits = (store.stats.deposits || 0) + 1;
  markDirty();
  return { ok: true, balance: getBalance(account), wallet: getBalance(cashHolder) };
}

export function withdraw(store, ownerId, cashHolder, amount) {
  const amt = sanitizeMoney(amount);
  if (amt <= 0) return { ok: false, error: "invalid_amount" };
  const account = getAccount(store, ownerId);
  if (!account || account.status !== "active") return { ok: false, error: "no_account" };
  const bank = (store.banks || []).find((b) => b.id === account.bankId);
  if (!bank?.operational) return { ok: false, error: "bank_closed" };
  if (getBalance(account) < amt) return { ok: false, error: "insufficient_account" };
  if ((bank.liquidity || 0) < amt) return { ok: false, error: "insufficient_liquidity" };
  const d = debit(account, amt);
  if (!d.ok) return { ok: false, error: d.error || "debit_failed" };
  credit(cashHolder, amt);
  bank.liquidity = sanitizeMoney((bank.liquidity || 0) - amt);
  const tx = {
    id: `btx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: "withdraw",
    ownerId,
    amount: amt,
    timestamp: Date.now()
  };
  pushTx(store, tx);
  pushHistory(account, tx);
  account.lastActivity = Date.now();
  store.stats.withdrawals = (store.stats.withdrawals || 0) + 1;
  markDirty();
  return { ok: true, balance: getBalance(account), wallet: getBalance(cashHolder) };
}

export function transfer(store, fromOwnerId, toOwnerId, amount) {
  const amt = sanitizeMoney(amount);
  if (amt <= 0) return { ok: false, error: "invalid_amount" };
  if (!fromOwnerId || !toOwnerId || fromOwnerId === toOwnerId) return { ok: false, error: "invalid_parties" };
  const from = getAccount(store, fromOwnerId);
  const to = getAccount(store, toOwnerId);
  if (!from || from.status !== "active") return { ok: false, error: "sender_no_account" };
  if (!to || to.status !== "active") return { ok: false, error: "receiver_no_account" };
  if (getBalance(from) < amt) return { ok: false, error: "insufficient_account" };
  debit(from, amt);
  credit(to, amt);
  const tx = {
    id: `btx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: "transfer",
    fromOwnerId,
    toOwnerId,
    amount: amt,
    timestamp: Date.now()
  };
  pushTx(store, tx);
  pushHistory(from, { ...tx, direction: "out" });
  pushHistory(to, { ...tx, direction: "in" });
  from.lastActivity = Date.now();
  to.lastActivity = Date.now();
  store.stats.transfers = (store.stats.transfers || 0) + 1;
  markDirty();
  return { ok: true, fromBalance: getBalance(from), toBalance: getBalance(to) };
}

export function statementLines(account) {
  if (!account) return ["No account"];
  const lines = [
    `Account ${account.id}`,
    `Bank ${account.bankId}`,
    `Balance ${getBalance(account)} ₡`,
    `Status ${account.status}`
  ];
  for (const h of (account.history || []).slice(-10)) {
    lines.push(`${h.type} ${h.amount} (${h.id})`);
  }
  return lines;
}
