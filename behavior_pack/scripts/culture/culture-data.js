export const CULTURE_VERSION = 1;
export const MAX_FESTIVALS = 40;

/** In-game year length in simulation days */
export const YEAR_LENGTH = 120;

export const FESTIVAL_DEFS = Object.freeze([
  {
    id: "festival_new_year",
    nameKey: "new_year",
    dayOfYear: 1,
    duration: 2,
    themes: ["community", "market"]
  },
  {
    id: "festival_harvest",
    nameKey: "harvest_festival",
    dayOfYear: 40,
    duration: 3,
    themes: ["food", "agriculture", "market"]
  },
  {
    id: "festival_lights",
    nameKey: "festival_of_lights",
    dayOfYear: 70,
    duration: 4,
    themes: ["lights", "market", "family"]
  },
  {
    id: "festival_colors",
    nameKey: "festival_of_colors",
    dayOfYear: 90,
    duration: 2,
    themes: ["social", "colors"]
  },
  {
    id: "festival_reflection",
    nameKey: "month_of_reflection",
    dayOfYear: 100,
    duration: 10,
    themes: ["community", "charity", "family"]
  },
  {
    id: "festival_celebration",
    nameKey: "celebration_day",
    dayOfYear: 111,
    duration: 2,
    themes: ["community", "market", "family"]
  }
]);

export function createDefaultCulture() {
  return {
    version: CULTURE_VERSION,
    calendarDay: 0,
    year: 1,
    activeFestivals: [],
    history: [],
    stats: { festivalsHeld: 0 }
  };
}

export function normalizeCulture(raw) {
  const base = createDefaultCulture();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || CULTURE_VERSION,
    calendarDay: Math.max(0, Math.floor(raw.calendarDay || 0)),
    year: Math.max(1, Math.floor(raw.year || 1)),
    activeFestivals: Array.isArray(raw.activeFestivals) ? raw.activeFestivals.slice(-MAX_FESTIVALS) : [],
    history: Array.isArray(raw.history) ? raw.history.slice(-MAX_FESTIVALS) : [],
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}
