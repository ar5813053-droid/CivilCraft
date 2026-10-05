export function demandPressure(stats, homelessHouseholds) {
  const vacant = stats?.vacant || 0;
  const demand = Math.max(0, (homelessHouseholds || 0) - vacant);
  return Math.max(0, Math.min(100, demand * 10));
}
