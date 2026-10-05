/**
 * Government data shapes, defaults, and migration-safe normalize.
 * Supports multiple government records (nations later). Phase 3 activates municipal only.
 */

export const GOVERNMENT_DATA_VERSION = 1;

export const GovType = Object.freeze({
  MUNICIPAL: "municipal",
  REGIONAL: "regional",
  NATIONAL: "national"
});

export const Role = Object.freeze({
  MAYOR: "mayor",
  DEPUTY_MAYOR: "deputy_mayor",
  TREASURER: "treasurer",
  DEPARTMENT_HEAD: "department_head"
});

export const DeptId = Object.freeze({
  FINANCE: "finance",
  PUBLIC_WORKS: "public_works",
  HEALTH: "health",
  EDUCATION: "education",
  PUBLIC_SAFETY: "public_safety"
});

export const BudgetCategory = Object.freeze({
  PUBLIC_WORKS: "public_works",
  ADMINISTRATION: "administration",
  RESERVE: "reserve"
});

export const MAX_GOV_TRANSACTIONS = 40;
export const MAX_PROJECTS = 30;
export const MAX_TAX_HISTORY = 20;

export const DEFAULT_TAX_POLICY = Object.freeze({
  ratePercent: 10,
  threshold: 20,
  maxTax: 50
});

/**
 * @returns {object}
 */
export function createDefaultGovernment(id = "municipal_main") {
  return {
    id,
    type: GovType.MUNICIPAL,
    name: "CivilCraft Municipal Government",
    active: true,
    leadership: {
      mayor: null,
      deputy_mayor: null,
      treasurer: null,
      department_heads: {}
    },
    departments: {
      finance: {
        id: "finance",
        name: "Finance",
        headId: null,
        budgetAllocation: 0,
        enabled: true
      },
      public_works: {
        id: "public_works",
        name: "Public Works",
        headId: null,
        budgetAllocation: 0,
        enabled: true
      },
      health: {
        id: "health",
        name: "Health",
        headId: null,
        budgetAllocation: 0,
        enabled: false
      },
      education: {
        id: "education",
        name: "Education",
        headId: null,
        budgetAllocation: 0,
        enabled: false
      },
      public_safety: {
        id: "public_safety",
        name: "Public Safety",
        headId: null,
        budgetAllocation: 0,
        enabled: false
      }
    },
    treasury: {
      balance: 0,
      income: 0,
      expenses: 0,
      lastTransactions: []
    },
    taxPolicy: { ...DEFAULT_TAX_POLICY },
    taxCollected: 0,
    taxHistory: [],
    budget: {
      public_works: 0,
      administration: 0,
      reserve: 0
    },
    projects: [],
    approval: 60,
    statistics: {
      population: 0,
      employed: 0,
      unemployed: 0,
      averageWealth: 0,
      taxRate: 10,
      approval: 60,
      budgetUtilization: 0
    },
    createdAt: Date.now(),
    lastUpdated: Date.now()
  };
}

/**
 * @returns {object}
 */
export function createDefaultGovernmentStore() {
  const primary = createDefaultGovernment("municipal_main");
  return {
    version: GOVERNMENT_DATA_VERSION,
    governments: { [primary.id]: primary },
    primaryId: primary.id
  };
}

function clampPercent(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return 10;
  return Math.max(0, Math.min(50, Math.floor(n)));
}

function clampMoney(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

/**
 * @param {object|null|undefined} raw
 * @returns {object}
 */
export function normalizeGovernmentStore(raw) {
  const base = createDefaultGovernmentStore();
  if (!raw || typeof raw !== "object") return base;

  const governments = {};
  const source = raw.governments && typeof raw.governments === "object" ? raw.governments : {};
  for (const [id, gov] of Object.entries(source)) {
    governments[id] = normalizeGovernment(id, gov);
  }
  if (Object.keys(governments).length === 0) {
    governments[base.primaryId] = base.governments[base.primaryId];
  }
  const primaryId = governments[raw.primaryId] ? raw.primaryId : Object.keys(governments)[0];
  return {
    version: typeof raw.version === "number" ? raw.version : GOVERNMENT_DATA_VERSION,
    governments,
    primaryId
  };
}

/**
 * @param {string} id
 * @param {object} gov
 */
export function normalizeGovernment(id, gov) {
  const base = createDefaultGovernment(id);
  if (!gov || typeof gov !== "object") return base;
  const type = [GovType.MUNICIPAL, GovType.REGIONAL, GovType.NATIONAL].includes(gov.type)
    ? gov.type
    : GovType.MUNICIPAL;

  return {
    ...base,
    ...gov,
    id,
    type,
    name: typeof gov.name === "string" && gov.name ? gov.name : base.name,
    active: gov.active !== false && type === GovType.MUNICIPAL,
    leadership: {
      mayor: gov.leadership?.mayor || null,
      deputy_mayor: gov.leadership?.deputy_mayor || null,
      treasurer: gov.leadership?.treasurer || null,
      department_heads:
        gov.leadership?.department_heads && typeof gov.leadership.department_heads === "object"
          ? gov.leadership.department_heads
          : {}
    },
    departments: { ...base.departments, ...(gov.departments || {}) },
    treasury: {
      balance: clampMoney(gov.treasury?.balance),
      income: clampMoney(gov.treasury?.income),
      expenses: clampMoney(gov.treasury?.expenses),
      lastTransactions: Array.isArray(gov.treasury?.lastTransactions)
        ? gov.treasury.lastTransactions.slice(-MAX_GOV_TRANSACTIONS)
        : []
    },
    taxPolicy: {
      ratePercent: clampPercent(gov.taxPolicy?.ratePercent ?? 10),
      threshold: clampMoney(gov.taxPolicy?.threshold ?? 20),
      maxTax: clampMoney(gov.taxPolicy?.maxTax ?? 50)
    },
    taxCollected: clampMoney(gov.taxCollected),
    taxHistory: Array.isArray(gov.taxHistory) ? gov.taxHistory.slice(-MAX_TAX_HISTORY) : [],
    budget: {
      public_works: clampMoney(gov.budget?.public_works),
      administration: clampMoney(gov.budget?.administration),
      reserve: clampMoney(gov.budget?.reserve)
    },
    projects: Array.isArray(gov.projects) ? gov.projects.slice(-MAX_PROJECTS) : [],
    approval: clampMoney(gov.approval ?? 60) > 100 ? 100 : clampMoney(gov.approval ?? 60),
    statistics: { ...base.statistics, ...(gov.statistics || {}) },
    createdAt: gov.createdAt || base.createdAt,
    lastUpdated: Date.now()
  };
}
