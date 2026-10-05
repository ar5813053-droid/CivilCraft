/**
 * Government performance metric and bounded event log.
 * Not political AI.
 */

/**
 * @param {object} input
 * @param {number} input.averageWealth
 * @param {number} input.unemploymentRate  // 0–1
 * @param {number} input.taxRatePercent
 * @param {number} input.spendingRatio     // expenses / max(income, 1), capped
 * @param {number} input.foodSupply
 * @returns {number} 0–100
 */
export function computeApproval(input) {
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

  const raw = 60 + economic + foodMod - taxMod - unempMod + spendMod;
  return Math.max(0, Math.min(100, raw));
}

/**
 * @param {object} gov
 * @param {string} type
 * @param {string} message
 */
export function pushGovernmentEvent(gov, type, message) {
  if (!gov) return;
  if (!Array.isArray(gov.events)) gov.events = [];
  gov.events.push({ type, message, timestamp: Date.now() });
  if (gov.events.length > 20) gov.events = gov.events.slice(-20);
}
