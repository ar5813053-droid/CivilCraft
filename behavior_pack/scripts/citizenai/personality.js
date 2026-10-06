/**
 * Deterministic personality traits from citizen ID.
 */

export const TRAITS = Object.freeze([
  "sociability",
  "ambition",
  "riskTolerance",
  "frugality",
  "generosity",
  "discipline",
  "curiosity",
  "independence",
  "civicDuty",
  "familyFocus"
]);

export function hashId(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Same ID → same traits; values 0–100 */
export function generatePersonality(citizenId) {
  const traits = {};
  for (let i = 0; i < TRAITS.length; i++) {
    const t = TRAITS[i];
    const raw = hashId(`${citizenId}::${t}`) % 101;
    traits[t] = raw;
  }
  return traits;
}

export function clampTrait(n) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}
