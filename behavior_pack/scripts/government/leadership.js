/**
 * Leadership appointments. System/debug controlled in Phase 3.
 * No elections.
 */

import { getWorldData, markDirty } from "../core/data-store.js";
import { getVillager } from "../villagers/villager-registry.js";
import { Role } from "./government-data.js";
import { Logger } from "../core/logger.js";

/**
 * @param {string} [govId]
 * @returns {object|null}
 */
export function getGovernment(govId) {
  const store = getWorldData().government;
  if (!store) return null;
  const id = govId || store.primaryId;
  return store.governments[id] || null;
}

/**
 * @param {string} role
 * @param {string|null} villagerId
 * @param {string} [govId]
 * @returns {{ ok: boolean, error?: string }}
 */
export function appoint(role, villagerId, govId) {
  const gov = getGovernment(govId);
  if (!gov) return { ok: false, error: "no_government" };
  if (![Role.MAYOR, Role.DEPUTY_MAYOR, Role.TREASURER].includes(role)) {
    return { ok: false, error: "invalid_role" };
  }
  if (villagerId && !getVillager(villagerId)) {
    return { ok: false, error: "missing_villager" };
  }
  gov.leadership[role] = villagerId
    ? { role, villagerId, appointedAt: Date.now() }
    : null;
  gov.lastUpdated = Date.now();
  markDirty();
  Logger.info(`Appointed ${role}: ${villagerId || "vacant"}`);
  return { ok: true };
}

/**
 * @param {string} departmentId
 * @param {string|null} villagerId
 * @param {string} [govId]
 */
export function appointDepartmentHead(departmentId, villagerId, govId) {
  const gov = getGovernment(govId);
  if (!gov) return { ok: false, error: "no_government" };
  if (!gov.departments[departmentId]) return { ok: false, error: "unknown_department" };
  if (villagerId && !getVillager(villagerId)) return { ok: false, error: "missing_villager" };

  const seat = villagerId
    ? { role: Role.DEPARTMENT_HEAD, villagerId, departmentId, appointedAt: Date.now() }
    : null;
  gov.leadership.department_heads[departmentId] = seat;
  gov.departments[departmentId].headId = villagerId || null;
  gov.lastUpdated = Date.now();
  markDirty();
  return { ok: true };
}

/**
 * Clears seats whose villager no longer exists.
 * @param {string} [govId]
 */
export function reconcileLeadership(govId) {
  const gov = getGovernment(govId);
  if (!gov) return;
  for (const role of [Role.MAYOR, Role.DEPUTY_MAYOR, Role.TREASURER]) {
    const seat = gov.leadership[role];
    if (seat && !getVillager(seat.villagerId)) {
      gov.leadership[role] = null;
      Logger.warn(`Cleared vacant ${role} seat (${seat.villagerId})`);
    }
  }
  for (const [dept, seat] of Object.entries(gov.leadership.department_heads || {})) {
    if (seat && !getVillager(seat.villagerId)) {
      gov.leadership.department_heads[dept] = null;
      if (gov.departments[dept]) gov.departments[dept].headId = null;
    }
  }
  markDirty();
}

/**
 * @param {object|null} seat
 * @returns {string}
 */
export function seatLabel(seat) {
  if (!seat?.villagerId) return "vacant";
  const v = getVillager(seat.villagerId);
  return v ? v.name : `missing:${seat.villagerId}`;
}
