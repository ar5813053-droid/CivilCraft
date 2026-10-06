export const SOCIAL_VERSION = 1;
export const MAX_MEDIA = 200;
export const MAX_SOCIAL_EVENTS = 200;
export const MAX_OPINION_HISTORY = 100;

export function createDefaultSocial() {
  return {
    version: SOCIAL_VERSION,
    media: [],
    events: [],
    opinion: {
      governmentApproval: 50,
      economicConfidence: 50,
      safetyConfidence: 50,
      healthcareConfidence: 50,
      educationConfidence: 50,
      utilityConfidence: 50,
      communityTrust: 50
    },
    stats: { interactions: 0, mediaEvents: 0 },
    cursor: 0
  };
}

export function normalizeSocial(raw) {
  const base = createDefaultSocial();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || SOCIAL_VERSION,
    media: Array.isArray(raw.media) ? raw.media.slice(-MAX_MEDIA) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_SOCIAL_EVENTS) : [],
    opinion: { ...base.opinion, ...(raw.opinion || {}) },
    stats: { ...base.stats, ...(raw.stats || {}) },
    cursor: Math.max(0, Math.floor(raw.cursor || 0))
  };
}

export function smooth(prev, next, factor = 0.25) {
  return Math.max(0, Math.min(100, Math.round(prev + (next - prev) * factor)));
}
