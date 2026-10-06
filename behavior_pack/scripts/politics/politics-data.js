export const POLITICS_VERSION = 1;
export const MAX_PARTIES = 20;
export const MAX_CANDIDATES = 100;
export const MAX_ELECTIONS = 50;
export const MAX_POLITICAL_EVENTS = 200;
export const ELECTION_TERM_DAYS = 30;
export const CAMPAIGN_DAYS = 7;
export const VOTER_BATCH = 40;

export const DEFAULT_PARTIES = [
  {
    id: "civic_reform",
    name: "Civic Reform",
    economicPriority: 55,
    welfarePriority: 60,
    safetyPriority: 50,
    educationPriority: 70,
    healthcarePriority: 65,
    infrastructurePriority: 55,
    utilityPriority: 55
  },
  {
    id: "economic_growth",
    name: "Economic Growth",
    economicPriority: 80,
    welfarePriority: 40,
    safetyPriority: 50,
    educationPriority: 50,
    healthcarePriority: 45,
    infrastructurePriority: 70,
    utilityPriority: 60
  },
  {
    id: "social_welfare",
    name: "Social Welfare",
    economicPriority: 45,
    welfarePriority: 85,
    safetyPriority: 45,
    educationPriority: 75,
    healthcarePriority: 80,
    infrastructurePriority: 50,
    utilityPriority: 55
  },
  {
    id: "traditional_civic",
    name: "Traditional Civic",
    economicPriority: 50,
    welfarePriority: 45,
    safetyPriority: 75,
    educationPriority: 55,
    healthcarePriority: 50,
    infrastructurePriority: 60,
    utilityPriority: 50
  }
];

export function createDefaultPolitics() {
  return {
    version: POLITICS_VERSION,
    parties: DEFAULT_PARTIES.map((p) => ({ ...p })),
    candidates: [],
    elections: [],
    events: [],
    preferences: {},
    voterCursor: 0,
    stats: { electionsHeld: 0, votesCast: 0 }
  };
}

export function normalizePolitics(raw) {
  const base = createDefaultPolitics();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || POLITICS_VERSION,
    parties: Array.isArray(raw.parties) && raw.parties.length
      ? raw.parties.slice(0, MAX_PARTIES)
      : base.parties,
    candidates: Array.isArray(raw.candidates) ? raw.candidates.slice(-MAX_CANDIDATES) : [],
    elections: Array.isArray(raw.elections) ? raw.elections.slice(-MAX_ELECTIONS) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_POLITICAL_EVENTS) : [],
    preferences: raw.preferences && typeof raw.preferences === "object" ? raw.preferences : {},
    voterCursor: Math.max(0, Math.floor(raw.voterCursor || 0)),
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}
