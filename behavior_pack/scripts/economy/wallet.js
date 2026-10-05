/**
 * Wallet operations for villagers (and reusable for shops).
 *
 * Money is stored as non-negative integers (CivilCoins).
 * All mutations go through validated helpers — never assign balances ad hoc.
 */

import { clamp } from "../core/utils.js";
import { Logger } from "../core/logger.js";

/** Starting balance for newly registered villagers (bootstrap seed, finite). */
export const STARTING_BALANCE = 50;

/**
 * Sanitizes a money value to a safe non-negative integer.
 * @param {*} value
 * @returns {number}
 */
export function sanitizeMoney(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/**
 * Reads balance from a wallet-like object ({ money: number }).
 * @param {{ money?: number }|null|undefined} holder
 * @returns {number}
 */
export function getBalance(holder) {
  if (!holder) return 0;
  return sanitizeMoney(holder.money);
}

/**
 * Sets balance (clamped). Caller is responsible for markDirty / persistence.
 * @param {{ money?: number }} holder
 * @param {number} amount
 * @returns {number} new balance
 */
export function setBalance(holder, amount) {
  const next = sanitizeMoney(amount);
  holder.money = next;
  return next;
}

/**
 * Credits money. Returns actual amount credited.
 * @param {{ money?: number }} holder
 * @param {number} amount
 * @returns {{ ok: boolean, credited: number, balance: number, error?: string }}
 */
export function credit(holder, amount) {
  if (!holder) {
    return { ok: false, credited: 0, balance: 0, error: "missing_holder" };
  }
  const add = sanitizeMoney(amount);
  if (add <= 0) {
    return { ok: false, credited: 0, balance: getBalance(holder), error: "invalid_amount" };
  }
  // Soft cap to avoid runaway balances from bugs (10 million CC)
  const HARD_CAP = 10_000_000;
  const current = getBalance(holder);
  const next = Math.min(HARD_CAP, current + add);
  const credited = next - current;
  holder.money = next;
  return { ok: credited > 0, credited, balance: next };
}

/**
 * Debits money if funds are sufficient.
 * @param {{ money?: number }} holder
 * @param {number} amount
 * @returns {{ ok: boolean, debited: number, balance: number, error?: string }}
 */
export function debit(holder, amount) {
  if (!holder) {
    return { ok: false, debited: 0, balance: 0, error: "missing_holder" };
  }
  const cost = sanitizeMoney(amount);
  if (cost <= 0) {
    return { ok: false, debited: 0, balance: getBalance(holder), error: "invalid_amount" };
  }
  const current = getBalance(holder);
  if (current < cost) {
    return { ok: false, debited: 0, balance: current, error: "insufficient_funds" };
  }
  holder.money = current - cost;
  return { ok: true, debited: cost, balance: holder.money };
}

/**
 * Transfers money from one holder to another atomically (best-effort).
 * Rolls back credit if debit fails (should not happen if checked first).
 * @param {{ money?: number }} from
 * @param {{ money?: number }} to
 * @param {number} amount
 * @returns {{ ok: boolean, amount: number, error?: string }}
 */
export function transfer(from, to, amount) {
  const value = sanitizeMoney(amount);
  if (value <= 0) return { ok: false, amount: 0, error: "invalid_amount" };
  if (!from || !to) return { ok: false, amount: 0, error: "missing_party" };
  if (from === to) return { ok: false, amount: 0, error: "same_party" };

  const deb = debit(from, value);
  if (!deb.ok) return { ok: false, amount: 0, error: deb.error };

  const cre = credit(to, value);
  if (!cre.ok) {
    // Rollback
    credit(from, value);
    Logger.warn("Transfer credit failed; rolled back debit.");
    return { ok: false, amount: 0, error: cre.error || "credit_failed" };
  }
  return { ok: true, amount: value };
}

/**
 * Formats money for display.
 * @param {number} amount
 * @param {string} [symbol="₡"]
 * @returns {string}
 */
export function formatMoney(amount, symbol = "₡") {
  const n = sanitizeMoney(amount);
  return `${n.toLocaleString("en-US")} ${symbol}`;
}
