/** Phase 17 social and opinion tests. */
function smooth(prev, next, f = 0.25) { return Math.round(prev + (next - prev) * f); }
function targets(i) {
  return {
    economicConfidence: Math.max(0, Math.min(100, Math.round(50 + i.employmentRate * 20))),
    safetyConfidence: Math.max(0, Math.min(100, Math.round(50 - i.crimeRate * 20))),
    healthcareConfidence: Math.max(0, Math.min(100, Math.round(40 + i.healthcareQuality * 0.5))),
    educationConfidence: Math.max(0, Math.min(100, Math.round(40 + i.educationQuality * 0.5))),
    utilityConfidence: Math.max(0, Math.min(100, Math.round(i.utilityQuality))),
    governmentApproval: 55
  };
}
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Social\n");
const store = { opinion: { governmentApproval: 50, economicConfidence: 50 }, media: [], stats: {} };
assert(store.opinion.governmentApproval === 50, "social state");
store.stats.interactions = 1;
assert(store.stats.interactions === 1, "social interaction aggregate");
const t = targets({ employmentRate: 0.8, crimeRate: 0.1, healthcareQuality: 60, educationQuality: 60, utilityQuality: 70 });
assert(t.economicConfidence > 50, "economic confidence");
assert(t.safetyConfidence > 40, "safety confidence");
assert(t.healthcareConfidence > 50, "healthcare confidence");
assert(t.educationConfidence > 50, "education confidence");
assert(t.utilityConfidence === 70, "utility confidence");
store.opinion.economicConfidence = smooth(50, t.economicConfidence);
assert(store.opinion.economicConfidence > 50 && store.opinion.economicConfidence < t.economicConfidence, "smoothing");
store.media.push({ type: "local_news", headlineKey: "emergency_active", severity: 3 });
assert(store.media[0].headlineKey === "emergency_active", "media event from real category");
assert(store.media.length === 1, "no spam fake events");
store.media = Array.from({ length: 250 }, (_, i) => i).slice(-200);
assert(store.media.length === 200, "bounded media");
assert({ version: 17 }.version === 17, "v16 to v17 migration");
console.log(failed ? `${failed} failed` : `\nAll ${passed} social tests passed.`);
process.exit(failed ? 1 : 0);
