/** Links existing facility ids to a settlement without copying their records. */

export function bindFacilities(settlement, ids) {
  if (!settlement) return { ok: false, error: "missing_settlement" };
  const next = Array.isArray(ids) ? ids.filter(Boolean) : [];
  for (const id of next) {
    if (!settlement.facilityIds.includes(id)) settlement.facilityIds.push(id);
  }
  settlement.facilityIds = settlement.facilityIds.slice(-200);
  return { ok: true, facilityIds: settlement.facilityIds };
}
