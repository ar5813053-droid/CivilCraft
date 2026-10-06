import { SERVICE_KEYS, ensureNetwork } from "./utilities-data.js";

export function computeDemand(population, businessCount) {
  const pop = Math.max(0, Math.floor(population || 0));
  const biz = Math.max(0, Math.floor(businessCount || 0));
  return Math.min(100, Math.floor(pop * 0.5 + biz * 2));
}

export function computeQuality(capacity, demand, coverage) {
  const ratio = capacity / Math.max(1, demand);
  const raw = Math.floor(Math.min(100, Math.max(0, coverage * 0.4 + Math.min(100, ratio * 50) * 0.6)));
  return raw;
}

export function updateNetwork(store, settlementId, population, businessCount, infraCoverage = 50) {
  const net = ensureNetwork(store, settlementId);
  const demand = computeDemand(population, businessCount);
  for (const key of SERVICE_KEYS) {
    const svc = net[key];
    svc.demand = demand;
    svc.capacity = Math.max(10, Math.floor(infraCoverage));
    svc.coverage = Math.min(100, Math.floor(infraCoverage));
    svc.quality = computeQuality(svc.capacity, svc.demand, svc.coverage);
    svc.available = svc.quality >= 20;
  }
  return net;
}

export function averageQuality(net) {
  if (!net) return 50;
  const vals = SERVICE_KEYS.map((k) => net[k]?.quality ?? 50);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** Small operating modifier for businesses/services: 0.9–1.05 */
export function utilityModifier(quality) {
  const q = Math.max(0, Math.min(100, quality ?? 50));
  return Math.max(0.9, Math.min(1.05, 0.9 + q / 500));
}
