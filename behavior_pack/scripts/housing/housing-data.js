export const HOUSING_VERSION = 1;
export const MAX_HOUSES = 1000;
export const MAX_HOUSING_EVENTS = 200;
export const MAX_UNPAID_RENT = 200;

export function createDefaultHousing() {
  return { version: HOUSING_VERSION, houses: [], events: [], unpaidRent: [], stats: {} };
}

export function normalizeHousing(raw) {
  const base = createDefaultHousing();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || HOUSING_VERSION,
    houses: Array.isArray(raw.houses) ? raw.houses.slice(-MAX_HOUSES) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_HOUSING_EVENTS) : [],
    unpaidRent: Array.isArray(raw.unpaidRent) ? raw.unpaidRent.slice(-MAX_UNPAID_RENT) : [],
    stats: raw.stats && typeof raw.stats === "object" ? raw.stats : {}
  };
}

export function housingQuality(house, development = 40) {
  if (!house) return 0;
  const typeQuality = house.quality || 40;
  const condition = Math.max(0, Math.min(100, house.condition || 0));
  const crowd = house.capacity ? Math.min(100, Math.round((house.occupants / house.capacity) * 100)) : 0;
  const crowdMod = crowd > 100 ? -10 : 0;
  return Math.max(0, Math.min(100, Math.round(typeQuality * 0.4 + condition * 0.4 + Math.min(20, development / 5) + crowdMod)));
}
