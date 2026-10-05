/** Settlement stats from cached aggregates. No entity scans. */

export function buildStats(input = {}) {
  const population = Math.max(0, Math.floor(input.population || 0));
  const employed = Math.max(0, Math.min(population, Math.floor(input.employed || 0)));
  return {
    population,
    employed,
    unemployed: population - employed,
    averageWealth: Math.max(0, Math.floor(input.averageWealth || 0)),
    economicActivity: Math.max(0, Math.floor(input.economicActivity || 0)),
    food: Math.max(0, Math.floor(input.food || 0)),
    averageHealth: Math.max(0, Math.min(100, Math.floor(input.averageHealth || 0))),
    educationQuality: Math.max(0, Math.min(100, Math.floor(input.educationQuality || 0))),
    publicSafety: Math.max(0, Math.min(100, Math.floor(input.publicSafety || 0))),
    infrastructureCoverage: Math.max(0, Math.min(100, Math.floor(input.infrastructureCoverage || 0))),
    approval: Math.max(0, Math.min(100, Math.floor(input.approval || 0))),
    prosperity: Math.max(0, Math.min(100, Math.floor(input.prosperity || 0))),
    developmentLevel: Math.max(0, Math.min(100, Math.floor(input.developmentLevel || 0)))
  };
}

export function metricsFromStats(stats) {
  return {
    population: Math.min(100, stats.population),
    economy: Math.min(100, Math.floor(stats.averageWealth / 2) + Math.min(30, stats.economicActivity)),
    infrastructure: stats.infrastructureCoverage,
    healthcare: stats.averageHealth,
    education: stats.educationQuality,
    safety: stats.publicSafety,
    employment: stats.population ? Math.round((stats.employed / stats.population) * 100) : 50,
    approval: stats.approval
  };
}
