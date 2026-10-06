export const PERSONALITY_TRAITS = [
  "ambition",
  "sociability",
  "riskTolerance",
  "generosity",
  "discipline",
  "curiosity",
  "loyalty",
  "stressTolerance",
  "financialCaution",
  "politicalEngagement",
  "communityParticipation"
];

export function hashId(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 0–100 traits from citizen id */
export function generatePersonality(citizenId) {
  const base = hashId(citizenId);
  const traits = {};
  PERSONALITY_TRAITS.forEach((t, i) => {
    traits[t] = ((base >>> (i * 3)) % 101 + (hashId(citizenId + t) % 40)) % 101;
  });
  return traits;
}
