/** Coverage from registered capacities. No pathfinding. */

const SERVICE_TYPES = ["police_station", "clinic", "school", "shop", "government_building", "public_building", "market", "emergency_station"];

export function coverageScore(store, settlementId) {
  if (!store) return 0;
  const records = (store.records || []).filter((r) => r.settlementId === settlementId);
  const present = new Set(records.map((r) => r.type));
  const covered = SERVICE_TYPES.filter((t) => present.has(t)).length;
  const capacity = records.reduce((s, r) => s + Math.min(20, r.capacity || 0), 0);
  const roads = (store.roads || []).filter((r) => r.settlementId === settlementId).length;
  return Math.max(0, Math.min(100, covered * 8 + Math.min(30, capacity) + Math.min(10, roads * 2)));
}

export function capacityBonus(store, settlementId) {
  const records = (store?.records || []).filter((r) => r.settlementId === settlementId);
  return records.reduce((s, r) => s + Math.floor((r.capacity || 0) / 2), 0);
}
