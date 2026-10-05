/** Settlement types and configurable thresholds. No automatic downgrade. */

export const SETTLEMENT_TYPES = ["village", "town", "city", "metro"];

export const TYPE_THRESHOLDS = [
  { type: "village", minPopulation: 0, baselineCapacity: 100 },
  { type: "town", minPopulation: 100, baselineCapacity: 300 },
  { type: "city", minPopulation: 300, baselineCapacity: 1000 },
  { type: "metro", minPopulation: 1000, baselineCapacity: 5000 }
];

export const GROWTH_WEIGHTS = {
  population: 0.2,
  economy: 0.15,
  infrastructure: 0.15,
  healthcare: 0.1,
  education: 0.1,
  safety: 0.1,
  employment: 0.1,
  approval: 0.1
};

export function typeForPopulation(population, currentType = "village") {
  const pop = Math.max(0, Math.floor(population || 0));
  let next = "village";
  for (const row of TYPE_THRESHOLDS) {
    if (pop >= row.minPopulation) next = row.type;
  }
  const order = SETTLEMENT_TYPES;
  if (order.indexOf(currentType) > order.indexOf(next)) return currentType;
  return next;
}

export function baselineCapacity(type) {
  return TYPE_THRESHOLDS.find((t) => t.type === type)?.baselineCapacity || 100;
}
