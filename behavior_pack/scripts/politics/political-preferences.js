export function defaultPreferences() {
  return {
    economicPriority: 50,
    safetyPriority: 50,
    healthcarePriority: 50,
    educationPriority: 50,
    infrastructurePriority: 50,
    welfarePriority: 50
  };
}

export function initPreferences(villager, context = {}) {
  const prefs = defaultPreferences();
  if (!villager) return prefs;
  if (villager.profession === "citizen" || !villager.profession) prefs.economicPriority = 60;
  if ((context.unemployment || 0) > 0.3) prefs.economicPriority = Math.min(100, prefs.economicPriority + 10);
  if ((context.crime || 0) > 0.2) prefs.safetyPriority = Math.min(100, prefs.safetyPriority + 15);
  if ((context.healthcareQuality || 50) < 40) prefs.healthcarePriority = Math.min(100, prefs.healthcarePriority + 10);
  if ((context.educationQuality || 50) < 40) prefs.educationPriority = Math.min(100, prefs.educationPriority + 10);
  return prefs;
}

export function smoothPreferences(prev, next, factor = 0.2) {
  const out = { ...prev };
  for (const key of Object.keys(next)) {
    const a = prev[key] ?? 50;
    const b = next[key] ?? 50;
    out[key] = Math.max(0, Math.min(100, Math.round(a + (b - a) * factor)));
  }
  return out;
}

export function alignmentScore(prefs, party) {
  if (!prefs || !party) return 0;
  const keys = [
    ["economicPriority", "economicPriority"],
    ["safetyPriority", "safetyPriority"],
    ["healthcarePriority", "healthcarePriority"],
    ["educationPriority", "educationPriority"],
    ["infrastructurePriority", "infrastructurePriority"],
    ["welfarePriority", "welfarePriority"]
  ];
  let score = 0;
  for (const [pk, partyKey] of keys) {
    const diff = Math.abs((prefs[pk] ?? 50) - (party[partyKey] ?? 50));
    score += 100 - diff;
  }
  return Math.round(score / keys.length);
}
