export function capacityFromHousing(baseline, housingCapacity) {
  const base = Math.max(1, baseline || 100);
  const houses = Math.max(0, housingCapacity || 0);
  return Math.max(base, houses);
}
