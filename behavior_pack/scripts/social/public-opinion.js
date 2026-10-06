import { smooth } from "./social-data.js";

export function computeOpinionTargets(inputs) {
  return {
    economicConfidence: clamp(50 + (inputs.employmentRate || 0) * 20 - (inputs.pricePressure || 0) * 10),
    safetyConfidence: clamp(50 + (inputs.policeCoverage || 0) * 15 - (inputs.crimeRate || 0) * 20),
    healthcareConfidence: clamp(40 + (inputs.healthcareQuality || 50) * 0.5),
    educationConfidence: clamp(40 + (inputs.educationQuality || 50) * 0.5),
    utilityConfidence: clamp(inputs.utilityQuality || 50),
    communityTrust: clamp(50 + (inputs.socialParticipation || 0) * 10),
    governmentApproval: clamp(
      0.3 * (inputs.employmentRate || 0.5) * 100 +
        0.2 * (inputs.utilityQuality || 50) +
        0.2 * (inputs.healthcareQuality || 50) +
        0.15 * (inputs.educationQuality || 50) +
        0.15 * (50 - (inputs.crimeRate || 0) * 50)
    )
  };
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function applyOpinion(store, targets) {
  const o = store.opinion;
  for (const key of Object.keys(targets)) {
    o[key] = smooth(o[key] ?? 50, targets[key]);
  }
  return o;
}
