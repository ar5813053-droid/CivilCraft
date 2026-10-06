/**
 * Derived civilization health score 0–100. Does not mutate money or population.
 */

export function computeCivilizationStats(data) {
  const villagers = Object.values(data.villagers || {}).filter((v) => v.alive !== false);
  const population = villagers.length;
  const emp = data.employment?.stats || {};
  const employed = emp.employed || 0;
  const unemployed = emp.unemployed || 0;
  const labor = Math.max(1, employed + unemployed);
  const employmentRate = employed / labor;
  const houses = data.housing?.houses?.length || Object.keys(data.housing?.records || {}).length || 0;
  const housingScore = population ? Math.min(100, Math.round((houses / Math.max(1, population / 3)) * 100)) : 50;
  const shops = data.economy?.shops ? Object.keys(data.economy.shops).length : 0;
  const utilQ = data.utilities?.stats?.averageQuality ?? 50;
  const healthQ = data.healthcare?.stats?.quality ?? 50;
  const eduQ = data.education?.stats?.quality ?? 50;
  const approval = data.social?.opinion?.governmentApproval ?? data.government?.approval ?? 50;
  const crime = Math.min(100, (data.justice?.violations?.length || 0));
  const foodAvail = estimateFood(data);
  return {
    population,
    employment: Math.round(employmentRate * 100),
    unemployment: Math.round((unemployed / labor) * 100),
    housing: housingScore,
    foodAvailability: foodAvail,
    averageHealth: healthQ,
    education: eduQ,
    businesses: shops,
    utilityQuality: utilQ,
    crime,
    governmentApproval: approval,
    prosperity: data.nations?.nations?.find((n) => n.id === "nation_main")?.prosperity ?? 50
  };
}

function estimateFood(data) {
  const shops = Object.values(data.economy?.shops || {});
  let bread = 0;
  for (const s of shops) bread += s.inventory?.bread || 0;
  if (!shops.length) return 40;
  return Math.min(100, Math.round(bread * 5));
}

export function computeCivilizationScore(stats) {
  const weights = {
    employment: 0.15,
    housing: 0.1,
    foodAvailability: 0.15,
    averageHealth: 0.1,
    education: 0.1,
    utilityQuality: 0.1,
    governmentApproval: 0.1,
    prosperity: 0.1,
    safety: 0.1
  };
  const safety = Math.max(0, 100 - (stats.crime || 0));
  const parts = [
    (stats.employment || 0) * weights.employment,
    (stats.housing || 0) * weights.housing,
    (stats.foodAvailability || 0) * weights.foodAvailability,
    (stats.averageHealth || 0) * weights.averageHealth,
    (stats.education || 0) * weights.education,
    (stats.utilityQuality || 0) * weights.utilityQuality,
    (stats.governmentApproval || 0) * weights.governmentApproval,
    (stats.prosperity || 0) * weights.prosperity,
    safety * weights.safety
  ];
  return Math.max(0, Math.min(100, Math.round(parts.reduce((a, b) => a + b, 0))));
}
