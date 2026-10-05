/**
 * Crime reports go through Phase 4. Arrests are records only.
 */

import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { reportViolation } from "../justice/violations.js";
import { getJustice } from "../justice/justice-manager.js";
import { setLegalStatus } from "../justice/legal-status.js";
import { getLaw } from "../justice/law-registry.js";
import { MAX_ARRESTS } from "./police-data.js";
import { pushPoliceEvent } from "./police-events.js";

export function reportCrime(store, input) {
  if (!store) return { ok: false, error: "no_police" };
  const officer = store.officers.find((o) => o.officerId === input?.officerId || o.villagerId === input?.officerId);
  if (!officer) return { ok: false, error: "missing_officer" };
  if (!getLaw(input?.lawId)) return { ok: false, error: "unknown_law" };
  if (!input?.offenderVillagerId) return { ok: false, error: "missing_offender" };

  const justice = getJustice();
  const result = reportViolation(justice, {
    lawId: input.lawId,
    offenderVillagerId: input.offenderVillagerId,
    victimVillagerId: input.victimVillagerId || null,
    location: input.location || null,
    notes: `reported_by:${officer.officerId}`,
    jurisdiction: officer.jurisdiction
  });
  if (!result.ok) return result;
  officer.violationsReported += 1;
  store.stats.violationsReported = (store.stats.violationsReported || 0) + 1;
  if (result.violation.severity >= 3) {
    setLegalStatus(justice, input.offenderVillagerId, "wanted");
  }
  pushPoliceEvent(store, "crime_reported", result.violation.id);
  markDirty();
  return { ok: true, violation: result.violation, officer };
}

export function createArrest(store, input) {
  if (!store) return { ok: false, error: "no_police" };
  const officer = store.officers.find((o) => o.officerId === input?.officerId);
  if (!officer) return { ok: false, error: "missing_officer" };
  if (!input?.villagerId) return { ok: false, error: "missing_villager" };
  const arrest = {
    arrestId: generateId("arr"),
    officerId: officer.officerId,
    villagerId: input.villagerId,
    caseId: input.caseId || null,
    reason: input.reason || "arrest",
    status: "arrested",
    arrestedAt: Date.now(),
    releasedAt: null,
    notes: ""
  };
  store.arrests.push(arrest);
  if (store.arrests.length > MAX_ARRESTS) store.arrests = store.arrests.slice(-MAX_ARRESTS);
  officer.arrests += 1;
  const justice = getJustice();
  setLegalStatus(justice, input.villagerId, "wanted");
  pushPoliceEvent(store, "arrest", arrest.arrestId);
  markDirty();
  return { ok: true, arrest };
}

export function setArrestStatus(arrest, status) {
  if (!arrest) return { ok: false, error: "missing_arrest" };
  if (!["released", "transferred", "pending"].includes(status)) return { ok: false, error: "invalid_status" };
  arrest.status = status;
  if (status === "released") arrest.releasedAt = Date.now();
  return { ok: true, arrest };
}
