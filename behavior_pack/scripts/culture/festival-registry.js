/**
 * Data-driven festival definitions. Schedules via world-events calendar (dayOfYear).
 * Does not own economy/money/calendar clock.
 */

export const FESTIVAL_CATEGORIES = Object.freeze([
  "religious", "seasonal", "national", "community", "harvest", "market",
  "family", "cultural", "educational", "sports", "music", "food"
]);

/**
 * @typedef {object} FestivalDef
 */

export const FESTIVAL_REGISTRY = Object.freeze({
  christmas: {
    id: "christmas",
    name: "Christmas",
    category: "family",
    season: "Winter",
    dayOfYear: 110,
    durationDays: 3,
    preparationDays: 5,
    closingDays: 1,
    cooldownDays: 100,
    recurrence: "YEARLY",
    maxParticipants: 45,
    activities: ["family_gathering", "gift_shopping", "festival_food", "community_gathering", "decoration", "cleanup"],
    preferredGoods: ["bread", "wheat"],
    effects: { happiness: 7, stress: -4, demandBread: 10, demandWheat: 6, opinion: 3 },
    mediaKey: "christmas_celebration",
    memoryImportance: "major",
    missionHints: ["deliver_gifts", "market_work", "community_support"]
  },
  diwali: {
    id: "diwali",
    name: "Diwali",
    category: "cultural",
    season: "Autumn",
    dayOfYear: 55,
    durationDays: 3,
    preparationDays: 5,
    closingDays: 1,
    cooldownDays: 100,
    recurrence: "YEARLY",
    maxParticipants: 45,
    activities: ["decoration", "market_visit", "family_gathering", "gift_shopping", "festival_food", "community_gathering"],
    preferredGoods: ["bread", "wheat"],
    effects: { happiness: 8, stress: -3, demandBread: 9, demandWheat: 5, opinion: 4 },
    mediaKey: "diwali_celebrations_begin",
    memoryImportance: "major",
    missionHints: ["deliver_supplies", "decorate", "market_work", "food_delivery"]
  },
  holi: {
    id: "holi",
    name: "Holi",
    category: "community",
    season: "Spring",
    dayOfYear: 20,
    durationDays: 2,
    preparationDays: 3,
    closingDays: 1,
    cooldownDays: 100,
    recurrence: "YEARLY",
    maxParticipants: 40,
    activities: ["community_gathering", "festival_food", "socializing", "music", "cleanup"],
    preferredGoods: ["bread"],
    effects: { happiness: 9, stress: -5, demandBread: 7, opinion: 3 },
    mediaKey: "holi_brings_community_together",
    memoryImportance: "major",
    missionHints: ["food_delivery", "gathering_prep", "cleanup"]
  },
  ramadan: {
    id: "ramadan",
    name: "Ramadan",
    category: "cultural",
    season: "Summer",
    dayOfYear: 70,
    durationDays: 10,
    preparationDays: 3,
    closingDays: 1,
    cooldownDays: 100,
    recurrence: "YEARLY",
    maxParticipants: 35,
    activities: ["charity", "family_gathering", "community_gathering", "festival_food", "market_visit"],
    preferredGoods: ["bread", "wheat"],
    effects: { happiness: 4, stress: -2, demandBread: 6, demandWheat: 4, opinion: 2 },
    mediaKey: "ramadan_evening_markets",
    memoryImportance: "major",
    missionHints: ["food_delivery", "charity", "evening_market"],
    // Preference-based observance; not forced on all citizens
    fastingAware: true,
    eveningActivityBoost: true
  },
  eid: {
    id: "eid",
    name: "Eid",
    category: "family",
    season: "Summer",
    dayOfYear: 80,
    durationDays: 3,
    preparationDays: 2,
    closingDays: 1,
    cooldownDays: 100,
    recurrence: "YEARLY",
    maxParticipants: 45,
    activities: ["family_gathering", "community_gathering", "festival_food", "gift_shopping", "market_visit"],
    preferredGoods: ["bread", "wheat"],
    effects: { happiness: 8, stress: -4, demandBread: 10, demandWheat: 5, opinion: 4 },
    mediaKey: "eid_community_celebration",
    memoryImportance: "major",
    missionHints: ["food_delivery", "market_work", "community_support"],
    linkedFestival: "ramadan"
  },
  harvest_festival: {
    id: "harvest_festival",
    name: "Harvest Festival",
    category: "harvest",
    season: "Autumn",
    dayOfYear: 40,
    durationDays: 3,
    preparationDays: 1,
    closingDays: 1,
    cooldownDays: 100,
    recurrence: "YEARLY",
    maxParticipants: 40,
    activities: ["market_visit", "festival_food", "community_gathering"],
    preferredGoods: ["wheat", "bread"],
    effects: { happiness: 5, demandBread: 8, demandWheat: 8, opinion: 2 },
    mediaKey: "harvest_festival",
    memoryImportance: "normal",
    missionHints: ["market_work", "food_delivery"]
  }
});

export function getFestival(id) {
  return FESTIVAL_REGISTRY[id] || null;
}

export function listFestivals() {
  return Object.values(FESTIVAL_REGISTRY);
}

export function festivalsForDayOfYear(doy) {
  return listFestivals().filter((f) => f.dayOfYear === doy);
}
