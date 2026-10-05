/**
 * Department records. Finance and Public Works are active; others are reserved.
 */

import { getGovernment } from "./leadership.js";
import { markDirty } from "../core/data-store.js";

/**
 * @param {string} [govId]
 * @returns {object[]}
 */
export function listDepartments(govId) {
  const gov = getGovernment(govId);
  if (!gov) return [];
  return Object.values(gov.departments);
}

/**
 * @param {string} departmentId
 * @param {boolean} enabled
 * @param {string} [govId]
 */
export function setDepartmentEnabled(departmentId, enabled, govId) {
  const gov = getGovernment(govId);
  if (!gov || !gov.departments[departmentId]) return { ok: false, error: "unknown_department" };
  gov.departments[departmentId].enabled = !!enabled;
  gov.lastUpdated = Date.now();
  markDirty();
  return { ok: true };
}
