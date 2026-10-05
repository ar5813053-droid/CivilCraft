/**
 * Justice persistence shapes, bounds, and migration-safe normalize.
 */

export const JUSTICE_DATA_VERSION = 1;
export const DEFAULT_JURISDICTION = "municipal_main";
export const MAX_VIOLATIONS = 100;
export const MAX_CASES = 100;
export const MAX_PENALTIES = 100;
export const MAX_JUSTICE_EVENTS = 100;
export const MAX_FINE = 200;

export const ViolationStatus = Object.freeze({
  REPORTED: "reported",
  UNDER_REVIEW: "under_review",
  CONFIRMED: "confirmed",
  DISMISSED: "dismissed",
  RESOLVED: "resolved"
});

export const CaseStatus = Object.freeze({
  OPEN: "open",
  INVESTIGATING: "investigating",
  HEARING: "hearing",
  CONVICTED: "convicted",
  DISMISSED: "dismissed",
  CLOSED: "closed"
});

export const PenaltyType = Object.freeze({
  WARNING: "warning",
  FINE: "fine",
  COMMUNITY_SERVICE: "community_service",
  TEMPORARY_BAN: "temporary_ban"
});

export const LegalStatus = Object.freeze({
  CLEAN: "clean",
  WARNED: "warned",
  FINED: "fined",
  WANTED: "wanted",
  RESTRICTED: "restricted"
});

export function createDefaultJustice() {
  return {
    version: JUSTICE_DATA_VERSION,
    jurisdiction: DEFAULT_JURISDICTION,
    violations: [],
    cases: [],
    penalties: [],
    events: [],
    cooldowns: {},
    lawOverrides: {},
    stats: {
      totalViolations: 0,
      openCases: 0,
      resolvedCases: 0,
      convictions: 0,
      dismissals: 0,
      finesIssued: 0,
      finesCollected: 0,
      outstandingFines: 0,
      warnings: 0,
      wanted: 0,
      averageResolutionMs: 0
    }
  };
}

function clampInt(value, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function boundList(list, max) {
  return Array.isArray(list) ? list.slice(-max) : [];
}

/**
 * @param {object|null|undefined} raw
 */
export function normalizeJustice(raw) {
  const base = createDefaultJustice();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: typeof raw.version === "number" ? raw.version : JUSTICE_DATA_VERSION,
    jurisdiction:
      typeof raw.jurisdiction === "string" && raw.jurisdiction
        ? raw.jurisdiction
        : DEFAULT_JURISDICTION,
    violations: boundList(raw.violations, MAX_VIOLATIONS).map(normalizeViolation),
    cases: boundList(raw.cases, MAX_CASES).map(normalizeCase),
    penalties: boundList(raw.penalties, MAX_PENALTIES).map(normalizePenalty),
    events: boundList(raw.events, MAX_JUSTICE_EVENTS),
    cooldowns: raw.cooldowns && typeof raw.cooldowns === "object" ? raw.cooldowns : {},
    lawOverrides: raw.lawOverrides && typeof raw.lawOverrides === "object" ? raw.lawOverrides : {},
    statusOverrides:
      raw.statusOverrides && typeof raw.statusOverrides === "object" ? raw.statusOverrides : {},
    stats: { ...base.stats, ...(raw.stats && typeof raw.stats === "object" ? raw.stats : {}) }
  };
}

export function normalizeViolation(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      id: "invalid",
      lawId: "unknown",
      offenderVillagerId: null,
      victimVillagerId: null,
      location: null,
      occurredAt: 0,
      detectedAt: 0,
      severity: 1,
      status: ViolationStatus.REPORTED,
      evidenceIds: [],
      notes: "",
      resolvedAt: null,
      caseId: null
    };
  }
  return {
    id: String(raw.id || "invalid"),
    lawId: String(raw.lawId || "unknown"),
    offenderVillagerId: raw.offenderVillagerId || null,
    victimVillagerId: raw.victimVillagerId || null,
    location: raw.location || null,
    occurredAt: clampInt(raw.occurredAt, 0, Number.MAX_SAFE_INTEGER),
    detectedAt: clampInt(raw.detectedAt, 0, Number.MAX_SAFE_INTEGER),
    severity: clampInt(raw.severity ?? 1, 1, 5),
    status: Object.values(ViolationStatus).includes(raw.status)
      ? raw.status
      : ViolationStatus.REPORTED,
    evidenceIds: Array.isArray(raw.evidenceIds) ? raw.evidenceIds.slice(0, 8) : [],
    notes: typeof raw.notes === "string" ? raw.notes.slice(0, 200) : "",
    resolvedAt: raw.resolvedAt || null,
    caseId: raw.caseId || null
  };
}

export function normalizeCase(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      caseId: "invalid",
      violationIds: [],
      defendantVillagerId: null,
      victimVillagerId: null,
      status: CaseStatus.OPEN,
      openedAt: 0,
      closedAt: null,
      judgement: null,
      penalty: null,
      fineAmount: 0,
      notes: ""
    };
  }
  return {
    caseId: String(raw.caseId || raw.id || "invalid"),
    violationIds: Array.isArray(raw.violationIds) ? raw.violationIds.slice(0, 12) : [],
    defendantVillagerId: raw.defendantVillagerId || null,
    victimVillagerId: raw.victimVillagerId || null,
    status: Object.values(CaseStatus).includes(raw.status) ? raw.status : CaseStatus.OPEN,
    openedAt: clampInt(raw.openedAt, 0, Number.MAX_SAFE_INTEGER),
    closedAt: raw.closedAt || null,
    judgement: raw.judgement || null,
    penalty: raw.penalty || null,
    fineAmount: clampInt(raw.fineAmount, 0, MAX_FINE),
    notes: typeof raw.notes === "string" ? raw.notes.slice(0, 200) : ""
  };
}

export function normalizePenalty(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      id: "invalid",
      type: PenaltyType.WARNING,
      villagerId: null,
      caseId: null,
      amount: 0,
      paid: 0,
      issuedAt: 0,
      expiresAt: null,
      status: "outstanding",
      reason: ""
    };
  }
  return {
    id: String(raw.id || "invalid"),
    type: Object.values(PenaltyType).includes(raw.type) ? raw.type : PenaltyType.WARNING,
    villagerId: raw.villagerId || null,
    caseId: raw.caseId || null,
    amount: clampInt(raw.amount, 0, MAX_FINE),
    paid: clampInt(raw.paid, 0, MAX_FINE),
    issuedAt: clampInt(raw.issuedAt, 0, Number.MAX_SAFE_INTEGER),
    expiresAt: raw.expiresAt || null,
    status: raw.status === "paid" || raw.status === "expired" ? raw.status : "outstanding",
    reason: typeof raw.reason === "string" ? raw.reason.slice(0, 160) : ""
  };
}
