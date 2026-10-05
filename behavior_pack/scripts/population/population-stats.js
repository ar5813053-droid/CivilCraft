export function populationStats(villagers, store) {
  const people = villagers || [];
  const alive = people.filter((v) => v.alive !== false);
  const count = (stage) => alive.filter((v) => v.lifeStage === stage).length;
  return {
    total: alive.length,
    children: count("child") + count("infant"),
    teenagers: count("teenager"),
    adults: count("young_adult") + count("adult") + count("middle_aged"),
    seniors: count("senior"),
    households: store?.households?.length || 0,
    homeless: (store?.households || []).filter((h) => h.status === "homeless").length,
    averageHouseholdSize: store?.households?.length
      ? Math.round((store.households.reduce((s, h) => s + (h.size || 0), 0) / store.households.length) * 10) / 10
      : 0,
    births: store?.counters?.births || 0,
    deaths: store?.counters?.deaths || 0,
    migrationIn: store?.counters?.migrationIn || 0,
    migrationOut: store?.counters?.migrationOut || 0
  };
}
