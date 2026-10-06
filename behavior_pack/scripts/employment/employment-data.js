export const EMPLOYMENT_VERSION = 1;
export const MAX_RECORDS = 2000;
export const MAX_SEARCH_STATES = 2000;
export const MAX_HISTORY = 500;
export const MAX_EVENTS = 200;
export const MAX_OPPORTUNITIES = 1000;
export const MAX_UNPAID = 200;
export const SEARCH_COOLDOWN_DAYS = 2;
export const JOB_MARKET_REFRESH_MS = 5 * 60 * 1000;

/** Soft vacancy caps per job id when no employer capacity exists. */
export const DEFAULT_CAPACITY = {
  farmer: 40,
  worker: 40,
  trader: 20,
  builder: 20,
  citizen: 0,
  police_officer: 12,
  healer: 6,
  nurse: 8,
  doctor: 4,
  teacher: 12
};

/** Minimum education level index required (LEVELS order). */
export const JOB_EDUCATION = {
  farmer: 0,
  worker: 0,
  trader: 1,
  builder: 1,
  citizen: 0,
  police_officer: 1,
  healer: 1,
  nurse: 2,
  doctor: 3,
  teacher: 2
};

export const BASE_PRIVATE_SALARY = {
  farmer: 8,
  worker: 8,
  trader: 10,
  builder: 10,
  citizen: 0,
  healer: 12,
  nurse: 14,
  doctor: 18,
  teacher: 12,
  police_officer: 0
};

export function createDefaultEmployment() {
  return {
    version: EMPLOYMENT_VERSION,
    records: [],
    searchStates: [],
    history: [],
    events: [],
    opportunities: [],
    unpaid: [],
    cursor: 0,
    lastMarketRefresh: 0,
    stats: {
      employed: 0,
      unemployed: 0,
      inactive: 0,
      openings: 0,
      hired: 0,
      lost: 0
    }
  };
}

export function normalizeEmployment(raw) {
  const base = createDefaultEmployment();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || EMPLOYMENT_VERSION,
    records: Array.isArray(raw.records) ? raw.records.slice(-MAX_RECORDS) : [],
    searchStates: Array.isArray(raw.searchStates) ? raw.searchStates.slice(-MAX_SEARCH_STATES) : [],
    history: Array.isArray(raw.history) ? raw.history.slice(-MAX_HISTORY) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_EVENTS) : [],
    opportunities: Array.isArray(raw.opportunities) ? raw.opportunities.slice(-MAX_OPPORTUNITIES) : [],
    unpaid: Array.isArray(raw.unpaid) ? raw.unpaid.slice(-MAX_UNPAID) : [],
    cursor: Math.max(0, Math.floor(raw.cursor || 0)),
    lastMarketRefresh: Math.max(0, Math.floor(raw.lastMarketRefresh || 0)),
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}

export function createRecord(partial = {}) {
  return {
    villagerId: partial.villagerId,
    jobId: partial.jobId || null,
    employerType: partial.employerType || null,
    employerId: partial.employerId || null,
    status: partial.status || "unemployed",
    hiredDay: partial.hiredDay ?? null,
    lastWorkedDay: partial.lastWorkedDay ?? null,
    unemploymentDays: Math.max(0, Math.floor(partial.unemploymentDays || 0))
  };
}
