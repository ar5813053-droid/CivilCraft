/**
 * Authoritative event type definitions. Engine does not hardcode effects elsewhere.
 */

export const CATEGORIES = Object.freeze([
  "festival", "election", "government", "community", "market", "education",
  "healthcare", "emergency", "business", "infrastructure", "social", "family",
  "sports", "entertainment", "national", "international", "charity", "civilization"
]);

/** @type {Record<string, object>} */
export const EVENT_DEFINITIONS = {
  harvest_festival: {
    id: "harvest_festival",
    type: "harvest_festival",
    name: "Harvest Festival",
    category: "festival",
    durationDays: 3,
    preparationDays: 1,
    cooldownDays: 100,
    maxParticipants: 40,
    activities: ["market_visit", "celebration", "food_stall"],
    effects: { happiness: 5, demandBread: 8, demandWheat: 4, opinion: 2 },
    recurringDayOfYear: 40
  },
  festival_of_lights: {
    id: "festival_of_lights",
    type: "festival_of_lights",
    name: "Festival of Lights",
    category: "festival",
    durationDays: 4,
    preparationDays: 1,
    cooldownDays: 100,
    maxParticipants: 40,
    activities: ["celebration", "community_meeting", "market_visit"],
    effects: { happiness: 6, demandBread: 5, opinion: 3 },
    recurringDayOfYear: 70
  },
  community_market: {
    id: "community_market",
    type: "community_market",
    name: "Community Market Day",
    category: "market",
    durationDays: 1,
    preparationDays: 0,
    cooldownDays: 14,
    maxParticipants: 30,
    activities: ["market_visit", "business_activity"],
    effects: { demandBread: 4, demandWheat: 2, happiness: 2 },
    recurringDayOfYear: null
  },
  election_day: {
    id: "election_day",
    type: "election_day",
    name: "Election Day",
    category: "election",
    durationDays: 1,
    preparationDays: 3,
    cooldownDays: 30,
    maxParticipants: 100,
    activities: ["speech", "rally", "government_announcement"],
    effects: { opinion: 1, civic: true },
    recurringDayOfYear: null
  },
  infrastructure_opening: {
    id: "infrastructure_opening",
    type: "infrastructure_opening",
    name: "Infrastructure Opening",
    category: "infrastructure",
    durationDays: 1,
    preparationDays: 0,
    cooldownDays: 7,
    maxParticipants: 25,
    activities: ["government_announcement", "celebration"],
    effects: { happiness: 4, opinion: 4 },
    recurringDayOfYear: null
  },
  emergency_response: {
    id: "emergency_response",
    type: "emergency_response",
    name: "Emergency Response",
    category: "emergency",
    durationDays: 1,
    preparationDays: 0,
    cooldownDays: 3,
    maxParticipants: 20,
    activities: ["emergency"],
    effects: { stress: -3, opinion: 2 },
    recurringDayOfYear: null
  },
  food_crisis_response: {
    id: "food_crisis_response",
    type: "food_crisis_response",
    name: "Food Crisis Response",
    category: "civilization",
    durationDays: 2,
    preparationDays: 0,
    cooldownDays: 10,
    maxParticipants: 30,
    activities: ["community_meeting", "charity", "market_visit"],
    effects: { demandBread: 10, stress: 5, opinion: -3 },
    recurringDayOfYear: null
  },
  school_day: {
    id: "school_day",
    type: "school_day",
    name: "School Community Day",
    category: "education",
    durationDays: 1,
    preparationDays: 0,
    cooldownDays: 20,
    maxParticipants: 35,
    activities: ["education_activity"],
    effects: { happiness: 2 },
    recurringDayOfYear: null
  }
};

export function getDefinition(typeId) {
  return EVENT_DEFINITIONS[typeId] || null;
}

export function listDefinitions() {
  return Object.values(EVENT_DEFINITIONS);
}
