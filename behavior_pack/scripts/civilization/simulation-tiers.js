/**
 * Orchestration tiers for citizen simulation intensity.
 * FULL / LIGHT / BACKGROUND — does not replace Daily Life.
 */

export const TIER = Object.freeze({
  FULL: "full",
  LIGHT: "light",
  BACKGROUND: "background"
});

/**
 * Deterministic tier from distance proxy (0 = near).
 * @param {number} distanceScore 0 near, higher farther
 */
export function tierForDistance(distanceScore = 0) {
  if (distanceScore <= 32) return TIER.FULL;
  if (distanceScore <= 96) return TIER.LIGHT;
  return TIER.BACKGROUND;
}

export function processTierBatch(ids, start, batchSize, handler) {
  if (!ids.length) return start;
  const s = start % ids.length;
  for (let i = 0; i < Math.min(batchSize, ids.length); i++) {
    handler(ids[(s + i) % ids.length], i);
  }
  return (s + batchSize) % ids.length;
}
