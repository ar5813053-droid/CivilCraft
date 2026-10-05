export const HEALTHCARE_VERSION = 1;
export const MAX_HEALTH_RECORDS = 500;
export const MAX_CLINICS = 20;
export const MAX_STAFF = 100;
export const MAX_BILLS = 100;
export const MAX_HEALTH_EVENTS = 100;

export const CONDITIONS = {
  minor_illness: { id: "minor_illness", name: "Minor Illness", severity: 1, healthImpact: 10, productivityImpact: 10, treatmentCost: 8, recoveryTime: 1, enabled: true },
  injury: { id: "injury", name: "Injury", severity: 2, healthImpact: 20, productivityImpact: 20, treatmentCost: 15, recoveryTime: 2, enabled: true },
  serious_illness: { id: "serious_illness", name: "Serious Illness", severity: 3, healthImpact: 35, productivityImpact: 40, treatmentCost: 30, recoveryTime: 3, enabled: true },
  exhaustion: { id: "exhaustion", name: "Exhaustion", severity: 1, healthImpact: 8, productivityImpact: 15, treatmentCost: 5, recoveryTime: 1, enabled: true },
  infection: { id: "infection", name: "Infection", severity: 3, healthImpact: 30, productivityImpact: 35, treatmentCost: 25, recoveryTime: 3, enabled: true }
};

export function getCondition(id) {
  return CONDITIONS[id] || null;
}

export function createDefaultHealthcare() {
  return {
    version: HEALTHCARE_VERSION,
    jurisdiction: "municipal_main",
    records: [],
    clinics: [],
    staff: [],
    bills: [],
    events: [],
    stats: { covered: 0, healthy: 0, sick: 0, injured: 0, critical: 0, staff: 0, treatments: 0, expenses: 0, unpaid: 0, quality: 50 }
  };
}

function clampHealth(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return 80;
  return Math.max(0, Math.min(100, Math.floor(n)));
}

export function normalizeHealthcare(raw) {
  const base = createDefaultHealthcare();
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    version: raw.version || HEALTHCARE_VERSION,
    records: Array.isArray(raw.records) ? raw.records.slice(-MAX_HEALTH_RECORDS).map((r) => ({ ...r, health: clampHealth(r.health) })) : [],
    clinics: Array.isArray(raw.clinics) ? raw.clinics.slice(-MAX_CLINICS) : [],
    staff: Array.isArray(raw.staff) ? raw.staff.slice(-MAX_STAFF) : [],
    bills: Array.isArray(raw.bills) ? raw.bills.slice(-MAX_BILLS) : [],
    events: Array.isArray(raw.events) ? raw.events.slice(-MAX_HEALTH_EVENTS) : [],
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}

export function statusFromHealth(health) {
  if (health >= 80) return "healthy";
  if (health >= 60) return "recovering";
  if (health >= 40) return "minor_illness";
  if (health >= 25) return "injured";
  if (health >= 10) return "seriously_ill";
  return "critical";
}

export function productivityModifier(health) {
  const h = clampHealth(health);
  if (h >= 80) return 1;
  if (h >= 60) return 0.9;
  if (h >= 40) return 0.75;
  if (h >= 20) return 0.5;
  return 0.25;
}

export function healthcareQuality(store) {
  const staff = store?.staff?.length || 0;
  const capacity = (store?.clinics || []).reduce((s, c) => s + (c.capacity || 0), 0);
  const funding = Math.min(20, Math.floor((store?.stats?.expenses || 0) / 50));
  return Math.max(0, Math.min(100, 40 + staff * 5 + Math.min(20, capacity) + funding));
}
