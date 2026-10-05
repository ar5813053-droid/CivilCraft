/**
 * Police persistence shapes and bounds.
 */

export const POLICE_DATA_VERSION = 1;
export const MAX_OFFICERS = 100;
export const MAX_STATIONS = 20;
export const MAX_PATROLS = 50;
export const MAX_ARRESTS = 100;
export const MAX_POLICE_EVENTS = 100;
export const MAX_UNPAID = 50;
export const BASE_SALARY = 12;

export function createDefaultPolice() {
  return {
    version: POLICE_DATA_VERSION,
    jurisdiction: "municipal_main",
    departmentId: "public_safety",
    officers: [],
    stations: [],
    patrols: [],
    arrests: [],
    events: [],
    unpaidSalaries: [],
    stats: {
      activeOfficers: 0,
      availableOfficers: 0,
      onPatrol: 0,
      responding: 0,
      openIncidents: 0,
      arrests: 0,
      violationsReported: 0,
      emergencyResponses: 0,
      averageResponseTime: 0,
      unpaidSalary: 0
    }
  };
}

function bound(list, max) {
  return Array.isArray(list) ? list.slice(-max) : [];
}

export function normalizePolice(raw) {
  const base = createDefaultPolice();
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    version: typeof raw.version === "number" ? raw.version : POLICE_DATA_VERSION,
    jurisdiction: raw.jurisdiction || "municipal_main",
    officers: bound(raw.officers, MAX_OFFICERS),
    stations: bound(raw.stations, MAX_STATIONS),
    patrols: bound(raw.patrols, MAX_PATROLS),
    arrests: bound(raw.arrests, MAX_ARRESTS),
    events: bound(raw.events, MAX_POLICE_EVENTS),
    unpaidSalaries: bound(raw.unpaidSalaries, MAX_UNPAID),
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}
