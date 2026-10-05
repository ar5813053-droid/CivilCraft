export function housingStats(store) {
  const houses = store?.houses || [];
  const units = houses.length;
  const occupied = houses.filter((h) => h.status === "occupied" || h.status === "partially_occupied").length;
  const vacant = houses.filter((h) => h.status === "vacant").length;
  const capacity = houses.reduce((s, h) => s + (h.capacity || 0), 0);
  const used = houses.reduce((s, h) => s + (h.occupants || 0), 0);
  const rent = units ? Math.round(houses.reduce((s, h) => s + (h.rent || 0), 0) / units) : 0;
  const value = units ? Math.round(houses.reduce((s, h) => s + (h.value || 0), 0) / units) : 0;
  const quality = units ? Math.round(houses.reduce((s, h) => s + (h.quality || 0), 0) / units) : 0;
  return { units, occupied, vacant, capacity, used, rent, value, quality };
}

export function housingDemand(households, availableUnits) {
  return Math.max(0, (households || 0) - (availableUnits || 0));
}
