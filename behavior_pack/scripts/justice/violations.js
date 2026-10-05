/**
 * Explicit violation reports. No entity scans and no automatic crime generation.
 */

import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { getLaw } from "./law-registry.js";
import { MAX_VIOLATIONS, ViolationStatus, DEFAULT_JURISDICTION } from "./justice-data.js";
import { pushJusticeEvent } from "./justice-events.js";

function cooldownKey(villagerId, lawId) {
  return `${villagerId}:${lawId}`;
}

/**
 * @param {object} store
 * @param {object} input
 * @returns {{ ok: boolean, error?: string, violation?: object }}
 */
export function reportViolation(store, input) {
  if (!store) return { ok: false, error: "no_justice" };
  const law = getLaw(input?.lawId);
  if (!law || law.enabled === false) return { ok: false, error: "unknown_law" };
  if (!input?.offenderVillagerId) return { ok: false, error: "missing_offender" };

  const key = cooldownKey(input.offenderVillagerId, law.id);
  const last = store.cooldowns?.[key] || 0;
  const now = Date.now();
  if (law.cooldownMs > 0 && now - last < law.cooldownMs) {
    return { ok: false, error: "cooldown" };
  }

  const violation = {
    id: generateId("vio"),
    lawId: law.id,
    offenderVillagerId: input.offenderVillagerId,
    victimVillagerId: input.victimVillagerId || null,
    location: input.location || null,
    occurredAt: input.occurredAt || now,
    detectedAt: now,
    severity: law.severity,
    status: ViolationStatus.REPORTED,
    evidenceIds: Array.isArray(input.evidenceIds) ? input.evidenceIds.slice(0, 8) : [],
    notes: typeof input.notes === "string" ? input.notes.slice(0, 200) : "",
    resolvedAt: null,
    caseId: null,
    jurisdiction: input.jurisdiction || law.jurisdiction || DEFAULT_JURISDICTION
  };

  store.violations.push(violation);
  if (store.violations.length > MAX_VIOLATIONS) {
    store.violations = store.violations.slice(-MAX_VIOLATIONS);
  }
  store.cooldowns[key] = now;
  pushJusticeEvent(store, "violation_reported", `${law.id} by ${input.offenderVillagerId}`, {
    violationId: violation.id
  });
  markDirty();
  return { ok: true, violation };
}

export function countPriorOffenses(store, villagerId, lawId) {
  if (!store) return 0;
  return store.violations.filter(
    (v) =>
      v.offenderVillagerId === villagerId &&
      v.lawId === lawId &&
      v.status !== "dismissed"
  ).length;
}
