/**
 * Government treasury. Not a villager wallet.
 * Uses the same integer money helpers as the economy.
 */

import { sanitizeMoney, credit, debit } from "../economy/wallet.js";
import { markDirty } from "../core/data-store.js";
import { getGovernment } from "./leadership.js";
import { MAX_GOV_TRANSACTIONS } from "./government-data.js";

/**
 * Hydrates treasury so wallet helpers can use `.money`.
 * @param {object} treasury
 */
export function hydrateTreasury(treasury) {
  if (!treasury) return treasury;
  treasury.balance = sanitizeMoney(treasury.balance);
  if (!Object.getOwnPropertyDescriptor(treasury, "money")?.get) {
    Object.defineProperty(treasury, "money", {
      get() {
        return this.balance;
      },
      set(v) {
        this.balance = sanitizeMoney(v);
      },
      enumerable: false,
      configurable: true
    });
  }
  return treasury;
}

function pushTx(treasury, entry) {
  if (!Array.isArray(treasury.lastTransactions)) treasury.lastTransactions = [];
  treasury.lastTransactions.push(entry);
  if (treasury.lastTransactions.length > MAX_GOV_TRANSACTIONS) {
    treasury.lastTransactions = treasury.lastTransactions.slice(-MAX_GOV_TRANSACTIONS);
  }
}

/**
 * @param {object} treasury
 * @param {number} amount
 * @param {string} reason
 * @returns {{ ok: boolean, amount?: number, error?: string }}
 */
export function depositToTreasury(treasury, amount, reason) {
  hydrateTreasury(treasury);
  const result = credit(treasury, amount);
  if (!result.ok) return { ok: false, error: result.error || "deposit_failed" };
  treasury.income = sanitizeMoney((treasury.income || 0) + result.credited);
  pushTx(treasury, {
    type: "deposit",
    amount: result.credited,
    reason: reason || "deposit",
    timestamp: Date.now()
  });
  markDirty();
  return { ok: true, amount: result.credited };
}

/**
 * @param {object} treasury
 * @param {number} amount
 * @param {string} reason
 * @returns {{ ok: boolean, amount?: number, error?: string, balance?: number }}
 */
export function expenseFromTreasury(treasury, amount, reason) {
  hydrateTreasury(treasury);
  const result = debit(treasury, amount);
  if (!result.ok) {
    return { ok: false, error: result.error || "insufficient_funds", balance: treasury.balance };
  }
  treasury.expenses = sanitizeMoney((treasury.expenses || 0) + result.debited);
  pushTx(treasury, {
    type: "expense",
    amount: result.debited,
    reason: reason || "expense",
    timestamp: Date.now()
  });
  markDirty();
  return { ok: true, amount: result.debited, balance: treasury.balance };
}

/**
 * @param {string} [govId]
 */
export function getTreasury(govId) {
  const gov = getGovernment(govId);
  if (!gov) return null;
  return hydrateTreasury(gov.treasury);
}
