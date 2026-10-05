/**
 * Deterministic prosperity and development. Single factors cannot zero the score.
 */

import { clampScore } from "./settlement-data.js";
import { GROWTH_WEIGHTS } from "./settlement-types.js";

export function weightedScore(metrics, weights = GROWTH_WEIGHTS) {
  const keys = Object.keys(weights);
  let total = 0;
  let used = 0;
  for (const key of keys) {
    const value = clampScore(metrics[key] ?? 50);
    total += value * weights[key];
    used += weights[key];
  }
  return clampScore(used ? total / used : 0);
}

export function prosperityScore(metrics, previous = 40) {
  const next = weightedScore(metrics);
  const smoothed = previous + (next - previous) * 0.25;
  return clampScore(smoothed);
}

export function developmentScore(metrics, previous = 10) {
  const next = weightedScore({
    infrastructure: metrics.infrastructure,
    economy: metrics.economy,
    education: metrics.education,
    population: metrics.population,
    approval: metrics.approval,
    safety: metrics.safety
  }, {
    infrastructure: 0.25,
    economy: 0.2,
    education: 0.15,
    population: 0.15,
    approval: 0.15,
    safety: 0.1
  });
  const delta = Math.max(-2, Math.min(2, (next - previous) * 0.1));
  return clampScore(previous + delta);
}

export { GROWTH_WEIGHTS };
