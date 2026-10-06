export const PLAYER_JOB_VERSION = 1;
export const MAX_MISSIONS = 50;
export const MAX_COMPLETED_IDS = 200;
export const MISSION_STATUSES = Object.freeze({
  AVAILABLE: "available",
  ACCEPTED: "accepted",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  EXPIRED: "expired"
});

export function createDefaultPlayerJobs() {
  return {
    version: PLAYER_JOB_VERSION,
    missions: [],
    completedIds: [],
    performance: {},
    lastPayday: {},
    stats: { missionsCompleted: 0, salariesPaid: 0 }
  };
}

export function normalizePlayerJobs(raw) {
  const base = createDefaultPlayerJobs();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || PLAYER_JOB_VERSION,
    missions: Array.isArray(raw.missions) ? raw.missions.slice(-MAX_MISSIONS) : [],
    completedIds: Array.isArray(raw.completedIds) ? raw.completedIds.slice(-MAX_COMPLETED_IDS) : [],
    performance: raw.performance && typeof raw.performance === "object" ? raw.performance : {},
    lastPayday: raw.lastPayday && typeof raw.lastPayday === "object" ? raw.lastPayday : {},
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}

/** Base daily salary hints by job family (employer still pays via Economy). */
export const SALARY_HINT = Object.freeze({
  farmer: 12,
  worker: 14,
  builder: 15,
  trader: 16,
  police_officer: 18,
  healer: 17,
  nurse: 18,
  doctor: 22,
  teacher: 17,
  citizen: 8
});
