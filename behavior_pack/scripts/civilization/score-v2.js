/**
 * Civilization Score 2.0 — derived breakdown with reasons.
 */

import { computeCivilizationStats } from "./civilization-score.js";

export function computeScoreV2(data) {
  const stats = computeCivilizationStats(data);
  const safety = Math.max(0, 100 - (stats.crime || 0));
  const components = {
    employment: stats.employment || 0,
    housing: stats.housing || 0,
    food: stats.foodAvailability || 0,
    health: stats.averageHealth || 0,
    education: stats.education || 0,
    utilities: stats.utilityQuality || 0,
    approval: stats.governmentApproval || 0,
    prosperity: stats.prosperity || 0,
    safety
  };
  const weights = {
    employment: 0.14,
    housing: 0.1,
    food: 0.14,
    health: 0.1,
    education: 0.1,
    utilities: 0.1,
    approval: 0.1,
    prosperity: 0.1,
    safety: 0.12
  };
  let score = 0;
  for (const k of Object.keys(weights)) {
    score += (components[k] || 0) * weights[k];
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Cultural activity bonus (capped)
  const fest = data.culture?.activeFestivals?.length || 0;
  if (fest > 0) score = Math.min(100, score + 1);

  const reasons = [];
  if (components.employment >= 60) reasons.push(`+ employment ${components.employment}`);
  else reasons.push(`- employment ${components.employment}`);
  if (components.food < 40) reasons.push(`- food ${components.food}`);
  else reasons.push(`+ food ${components.food}`);
  if (components.housing < 50) reasons.push(`- housing ${components.housing}`);
  if (components.approval >= 60) reasons.push(`+ approval ${components.approval}`);
  if (fest > 0) reasons.push(`+ festival active`);

  return { score, components, reasons: reasons.slice(0, 8), stats };
}
