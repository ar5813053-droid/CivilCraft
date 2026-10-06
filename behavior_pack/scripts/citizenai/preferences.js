/**
 * Compact preferences derived from personality (not a second source of truth).
 */

export function derivePreferences(personality) {
  const p = personality || {};
  return {
    workIntensity: Math.round(((p.discipline || 50) + (p.ambition || 50)) / 2),
    careerAmbition: p.ambition || 50,
    savingPreference: p.frugality || 50,
    spendingPreference: Math.max(0, 100 - (p.frugality || 50)),
    riskPreference: p.riskTolerance || 50,
    socialActivity: p.sociability || 50,
    familyPreference: p.familyFocus || 50,
    communityParticipation: Math.round(((p.civicDuty || 50) + (p.sociability || 50)) / 2),
    politicalParticipation: p.civicDuty || 50,
    housingQuality: Math.round(((p.frugality || 50) + (p.ambition || 50)) / 2)
  };
}

export function getPoliticalParticipationScore(personality) {
  return Math.max(0, Math.min(100, personality?.civicDuty ?? 50));
}
