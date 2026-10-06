/**
 * Centralized economic transaction validation and application.
 *
 * All money/goods movement that crosses parties should go through here.
 */

import { generateId } from "../core/utils.js";
import { Logger } from "../core/logger.js";
import { markDirty, getWorldData } from "../core/data-store.js";
import { getGood } from "./goods-registry.js";
import { getBalance, credit, debit, transfer, sanitizeMoney } from "./wallet.js";
import { getQty, addItem, removeItem, ensureInventory } from "./inventory.js";
import { MAX_RECENT_TRANSACTIONS } from "./economy-data.js";

/** @typedef {import("./economy-data.js").TransactionRecord} TransactionRecord */

/**
 * Transaction type constants.
 */
export const TxType = Object.freeze({
  SALARY: "salary",
  PURCHASE: "purchase",
  SALE: "sale",
  PRODUCTION_INCOME: "production_income",
  TRADE: "trade",
  TRANSFER: "transfer",
  CONSUMPTION: "consumption",
  RESTOCK: "restock",
  TAX: "tax",
  GOVERNMENT_EXPENSE: "government_expense",
  BUDGET_TRANSFER: "budget_transfer",
  LEGAL_FINE: "legal_fine",
  GOVERNMENT_SALARY: "government_salary",
  EMPLOYMENT_SALARY: "employment_salary",
  POLICE_EXPENSE: "police_expense",
  EMERGENCY_EXPENSE: "emergency_expense",
  MEDICAL_EXPENSE: "medical_expense",
  GOVERNMENT_HEALTHCARE: "government_healthcare_expense",
  EDUCATION_EXPENSE: "education_expense",
  GOVERNMENT_EDUCATION: "government_education_expense",
  HOUSING_RENT: "housing_rent",
  HOUSING_PURCHASE: "housing_purchase"
});

/**
 * Pushes a record into the capped recent-transactions ring buffer.
 * @param {TransactionRecord} record
 */
function recordTransaction(record) {
  try {
    const data = getWorldData();
    if (!data.economy) return;
    const list = data.economy.recentTransactions;
    list.push(record);
    if (list.length > MAX_RECENT_TRANSACTIONS) {
      data.economy.recentTransactions = list.slice(-MAX_RECENT_TRANSACTIONS);
    }
    data.economy.totals.transactionCount =
      (data.economy.totals.transactionCount || 0) + 1;
    markDirty();
  } catch (e) {
    Logger.debug("Failed to record transaction", e);
  }
}

/**
 * Builds a transaction record.
 * @param {object} partial
 * @returns {TransactionRecord}
 */
function makeRecord(partial) {
  return {
    id: generateId("tx"),
    type: partial.type || TxType.TRADE,
    buyerId: partial.buyerId ?? null,
    sellerId: partial.sellerId ?? null,
    goodId: partial.goodId ?? null,
    quantity: Math.max(0, Math.floor(partial.quantity || 0)),
    unitPrice: sanitizeMoney(partial.unitPrice || 0),
    total: sanitizeMoney(partial.total || 0),
    reason: partial.reason || partial.type || "unknown",
    timestamp: Date.now()
  };
}

/**
 * Pure money transfer with ledger entry.
 * @param {{ money?: number, id?: string }} from
 * @param {{ money?: number, id?: string }} to
 * @param {number} amount
 * @param {string} type
 * @param {string} [reason]
 * @returns {{ ok: boolean, error?: string, record?: TransactionRecord }}
 */
export function transferMoney(from, to, amount, type, reason) {
  const result = transfer(from, to, amount);
  if (!result.ok) return { ok: false, error: result.error };

  const record = makeRecord({
    type,
    buyerId: to?.id ?? null,
    sellerId: from?.id ?? null,
    quantity: 0,
    unitPrice: 0,
    total: result.amount,
    reason: reason || type
  });
  recordTransaction(record);
  markDirty();
  return { ok: true, record };
}

/**
 * Credits a holder (e.g. production income) with ledger entry.
 * Source of funds is "system" / production — only call when goods were produced.
 * @param {{ money?: number, id?: string }} to
 * @param {number} amount
 * @param {string} type
 * @param {string} [reason]
 * @returns {{ ok: boolean, error?: string, record?: TransactionRecord }}
 */
export function grantIncome(to, amount, type, reason) {
  const cre = credit(to, amount);
  if (!cre.ok) return { ok: false, error: cre.error };

  // Income tax base. Starting seeds use setBalance and do not pass through here.
  if (to && cre.credited > 0) {
    to.taxableIncome = sanitizeMoney((to.taxableIncome || 0) + cre.credited);
  }

  const record = makeRecord({
    type: type || TxType.PRODUCTION_INCOME,
    buyerId: to?.id ?? null,
    sellerId: null,
    quantity: 0,
    unitPrice: 0,
    total: cre.credited,
    reason: reason || type
  });
  recordTransaction(record);
  markDirty();
  return { ok: true, record };
}

/**
 * Purchase goods: buyer pays seller, goods move seller → buyer inventory.
 *
 * @param {object} opts
 * @param {{ money?: number, id?: string, inventory?: object }} opts.buyer
 * @param {{ money?: number, id?: string, inventory?: object }} opts.seller
 * @param {string} opts.goodId
 * @param {number} opts.quantity
 * @param {number} opts.unitPrice
 * @param {string} [opts.type]
 * @param {string} [opts.reason]
 * @returns {{ ok: boolean, error?: string, record?: TransactionRecord, total?: number }}
 */
export function purchaseGoods(opts) {
  const { buyer, seller, goodId, quantity, unitPrice } = opts;
  const qty = Math.floor(quantity);
  const price = sanitizeMoney(unitPrice);

  if (!buyer || !seller) return { ok: false, error: "missing_party" };
  if (!getGood(goodId)) return { ok: false, error: "unknown_good" };
  if (qty <= 0) return { ok: false, error: "invalid_quantity" };
  if (price <= 0) return { ok: false, error: "invalid_price" };

  const sellerInv = ensureInventory(seller);
  if (!removeItem(sellerInv, goodId, qty)) {
    return { ok: false, error: "insufficient_stock" };
  }

  const total = price * qty;
  const deb = debit(buyer, total);
  if (!deb.ok) {
    // Rollback stock
    addItem(sellerInv, goodId, qty);
    return { ok: false, error: deb.error };
  }

  const cre = credit(seller, total);
  if (!cre.ok) {
    credit(buyer, total);
    addItem(sellerInv, goodId, qty);
    return { ok: false, error: cre.error || "credit_failed" };
  }

  const buyerInv = ensureInventory(buyer);
  addItem(buyerInv, goodId, qty);

  const record = makeRecord({
    type: opts.type || TxType.PURCHASE,
    buyerId: buyer.id ?? null,
    sellerId: seller.id ?? null,
    goodId,
    quantity: qty,
    unitPrice: price,
    total,
    reason: opts.reason || "purchase"
  });
  recordTransaction(record);

  // Aggregate counters + shop revenue accounting
  try {
    const eco = getWorldData().economy;
    if (eco) {
      eco.totals.totalPurchases = (eco.totals.totalPurchases || 0) + total;
      eco.totals.totalSales = (eco.totals.totalSales || 0) + total;
    }
    if (seller && typeof seller.revenue === "number") {
      seller.revenue = Math.max(0, Math.floor((seller.revenue || 0) + total));
    } else if (seller && seller.type && typeof seller.balance === "number") {
      seller.revenue = Math.max(0, Math.floor(total));
    }
  } catch {
    /* ignore */
  }

  markDirty();
  return { ok: true, record, total };
}

/**
 * Consume goods from own inventory (no money movement).
 * @param {{ id?: string, inventory?: object }} holder
 * @param {string} goodId
 * @param {number} quantity
 * @param {string} [reason]
 * @returns {{ ok: boolean, error?: string }}
 */
export function consumeOwnGoods(holder, goodId, quantity, reason) {
  const qty = Math.floor(quantity);
  if (!holder || qty <= 0) return { ok: false, error: "invalid" };
  if (!getGood(goodId)) return { ok: false, error: "unknown_good" };

  const inv = ensureInventory(holder);
  if (!removeItem(inv, goodId, qty)) {
    return { ok: false, error: "insufficient_stock" };
  }

  const record = makeRecord({
    type: TxType.CONSUMPTION,
    buyerId: holder.id ?? null,
    sellerId: null,
    goodId,
    quantity: qty,
    unitPrice: 0,
    total: 0,
    reason: reason || "consumption"
  });
  recordTransaction(record);

  try {
    const eco = getWorldData().economy;
    if (eco) {
      eco.totals.totalConsumption = (eco.totals.totalConsumption || 0) + qty;
    }
  } catch {
    /* ignore */
  }

  markDirty();
  return { ok: true };
}

/**
 * Returns recent transactions (copy).
 * @param {number} [limit=10]
 * @returns {TransactionRecord[]}
 */
export function getRecentTransactions(limit = 10) {
  try {
    const list = getWorldData().economy?.recentTransactions ?? [];
    return list.slice(-limit);
  } catch {
    return [];
  }
}
