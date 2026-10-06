/**
 * Interactive court session loop using existing justice cases + capital courthouse.
 */

import { getWorldData, markDirty } from "../core/data-store.js";
import { getFacility } from "../worldgen/capital-builder.js";
import { publish } from "../events/event-bus.js";
import { rememberCivilization } from "../memory/memory-manager.js";

export function openCourtSession(caseId) {
  const data = getWorldData();
  const justice = data.justice;
  if (!justice) return { ok: false, error: "no_justice" };
  const c = (justice.cases || []).find((x) => x.id === caseId);
  if (!c) return { ok: false, error: "case_not_found" };
  if (c.status === "closed") return { ok: false, error: "closed" };
  c.status = "in_court";
  c.courtOpenedAt = Date.now();
  const loc = getFacility("courthouse");
  c.courtLocation = loc;
  markDirty();
  publish("COURT_SESSION_OPENED", { source: "justice", metadata: { caseId } });
  return { ok: true, case: c, location: loc };
}

export function deliverVerdict(caseId, verdict) {
  const data = getWorldData();
  const c = (data.justice?.cases || []).find((x) => x.id === caseId);
  if (!c) return { ok: false, error: "case_not_found" };
  if (!["guilty", "not_guilty", "dismissed"].includes(verdict)) {
    return { ok: false, error: "invalid_verdict" };
  }
  c.verdict = verdict;
  c.status = verdict === "guilty" ? "convicted" : "closed";
  c.closedAt = Date.now();
  markDirty();
  publish("COURT_VERDICT", { source: "justice", metadata: { caseId, verdict } });
  try {
    rememberCivilization("court_verdict", { caseId, verdict });
  } catch {
    /* */
  }
  return { ok: true, case: c };
}

export function listOpenCourtCases() {
  const cases = getWorldData().justice?.cases || [];
  return cases.filter((c) => ["open", "investigating", "in_court"].includes(c.status)).slice(0, 20);
}
