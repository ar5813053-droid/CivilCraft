export function refreshEmploymentStats(store) {
  let employed = 0;
  let unemployed = 0;
  let inactive = 0;
  for (const rec of store.records || []) {
    if (rec.status === "employed") employed += 1;
    else if (rec.status === "inactive") inactive += 1;
    else unemployed += 1;
  }
  store.stats.employed = employed;
  store.stats.unemployed = unemployed;
  store.stats.inactive = inactive;
  store.stats.openings = (store.opportunities || []).reduce((s, o) => s + (o.open || 0), 0);
  return store.stats;
}

export function getEmploymentProductivityModifier(store, villagerId) {
  const rec = (store?.records || []).find((r) => r.villagerId === villagerId);
  if (!rec || rec.status !== "employed") return 0.5;
  return 1.0;
}
