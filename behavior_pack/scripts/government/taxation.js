/**
 * Income tax. Pure formula plus collection against taxableIncome.
 *
 * Taxable income is incremented only when grantIncome records it.
 * Collection zeros taxableIncome so the same earnings are not taxed again.
 */

import { getAllVillagers } from "../villagers/villager-registry.js";
import { debit, sanitizeMoney } from "../economy/wallet.js";
import { transferMoney, TxType } from "../economy/transactions.js";
import { markDirty } from "../core/data-store.js";
import { Logger } from "../core/logger.js";
import { getGovernment } from "./leadership.js";
import { depositToTreasury, hydrateTreasury } from "./treasury.js";
import { MAX_TAX_HISTORY } from "./government-data.js";

/**
 * Computes income tax for one collection period.
 * Tax applies only to income above the threshold, capped by maxTax.
 *
 * @param {number} income
 * @param {{ ratePercent: number, threshold: number, maxTax: number }} policy
 * @returns {{ tax: number, taxable: number }}
 */
export function computeIncomeTax(income, policy) {
  const earned = sanitizeMoney(income);
  const threshold = sanitizeMoney(policy?.threshold);
  let rate = policy?.ratePercent;
  if (typeof rate !== "number" || !Number.isFinite(rate)) rate = 0;
  rate = Math.max(0, Math.min(50, Math.floor(rate)));
  const maxTax = sanitizeMoney(policy?.maxTax);

  if (earned <= threshold || rate === 0) {
    return { tax: 0, taxable: 0 };
  }
  const taxable = earned - threshold;
  let tax = Math.floor((taxable * rate) / 100);
  if (maxTax > 0) tax = Math.min(tax, maxTax);
  return { tax: Math.max(0, tax), taxable };
}

/**
 * Records newly earned income as not-yet-taxed.
 * Called from grantIncome. Starting wallet seeds must not call this.
 * @param {{ taxableIncome?: number }} villager
 * @param {number} amount
 */
export function recordTaxableIncome(villager, amount) {
  if (!villager) return;
  const add = sanitizeMoney(amount);
  if (add <= 0) return;
  villager.taxableIncome = sanitizeMoney((villager.taxableIncome || 0) + add);
  markDirty();
}

/**
 * Collects income tax once for all villagers against the primary municipal government.
 * @param {string} [govId]
 * @returns {{ collected: number, payers: number }}
 */
export function collectIncomeTax(govId) {
  const gov = getGovernment(govId);
  if (!gov || !gov.active) return { collected: 0, payers: 0 };
  hydrateTreasury(gov.treasury);

  let collected = 0;
  let payers = 0;

  for (const villager of getAllVillagers()) {
    try {
      const earned = sanitizeMoney(villager.taxableIncome);
      if (earned <= 0) continue;

      const { tax } = computeIncomeTax(earned, gov.taxPolicy);
      // Always consume the taxable bucket so this income is not re-taxed.
      villager.taxableIncome = 0;

      if (tax <= 0) continue;

      const payable = Math.min(tax, sanitizeMoney(villager.money));
      if (payable <= 0) continue;

      const result = transferMoney(
        villager,
        gov.treasury,
        payable,
        TxType.TAX,
        "income_tax"
      );
      if (!result.ok) {
        const deb = debit(villager, payable);
        if (!deb.ok) continue;
        depositToTreasury(gov.treasury, payable, "income_tax");
      } else {
        gov.treasury.income = sanitizeMoney((gov.treasury.income || 0) + payable);
      }
      collected += payable;
      payers += 1;
    } catch (e) {
      Logger.debug("Tax collection skipped villager", e);
    }
  }

  if (collected > 0) {
    gov.taxCollected = sanitizeMoney((gov.taxCollected || 0) + collected);
    gov.taxHistory.push({
      amount: collected,
      payers,
      ratePercent: gov.taxPolicy.ratePercent,
      timestamp: Date.now()
    });
    if (gov.taxHistory.length > MAX_TAX_HISTORY) {
      gov.taxHistory = gov.taxHistory.slice(-MAX_TAX_HISTORY);
    }
  }
  gov.lastUpdated = Date.now();
  markDirty();
  return { collected, payers };
}
