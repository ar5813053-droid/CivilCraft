/**
 * Lightweight legal cases. Status changes are explicit APIs for future courts.
 */

import { generateId } from "../core/utils.js";
import { markDirty } from "../core/data-store.js";
import { CaseStatus, MAX_CASES } from "./justice-data.js";
import { pushJusticeEvent } from "./justice-events.js";

const ALLOWED = {
  open: ["investigating", "hearing", "dismissed", "closed"],
  investigating: ["hearing", "dismissed", "convicted", "closed"],
  hearing: ["convicted", "dismissed", "closed"],
  convicted: ["closed"],
  dismissed: ["closed"],
  closed: []
};

export function openCase(store, input) {
  if (!store) return { ok: false, error: "no_justice" };
  if (!input?.defendantVillagerId) return { ok: false, error: "missing_defendant" };
  const legalCase = {
    caseId: generateId("case"),
    violationIds: Array.isArray(input.violationIds) ? input.violationIds.slice(0, 12) : [],
    defendantVillagerId: input.defendantVillagerId,
    victimVillagerId: input.victimVillagerId || null,
    status: CaseStatus.OPEN,
    openedAt: Date.now(),
    closedAt: null,
    judgement: null,
    penalty: null,
    fineAmount: 0,
    notes: typeof input.notes === "string" ? input.notes.slice(0, 200) : ""
  };
  for (const id of legalCase.violationIds) {
    const violation = store.violations.find((v) => v.id === id);
    if (violation) {
      violation.caseId = legalCase.caseId;
      violation.status = "under_review";
    }
  }
  store.cases.push(legalCase);
  if (store.cases.length > MAX_CASES) store.cases = store.cases.slice(-MAX_CASES);
  pushJusticeEvent(store, "case_opened", legalCase.caseId, { caseId: legalCase.caseId });
  markDirty();
  return { ok: true, case: legalCase };
}

export function setCaseStatus(store, caseId, status, extra = {}) {
  if (!store) return { ok: false, error: "no_justice" };
  const legalCase = store.cases.find((c) => c.caseId === caseId);
  if (!legalCase) return { ok: false, error: "missing_case" };
  const next = ALLOWED[legalCase.status] || [];
  if (!next.includes(status)) return { ok: false, error: "invalid_transition" };
  legalCase.status = status;
  if (extra.judgement) legalCase.judgement = extra.judgement;
  if (extra.penalty) legalCase.penalty = extra.penalty;
  if (typeof extra.fineAmount === "number") legalCase.fineAmount = Math.max(0, Math.floor(extra.fineAmount));
  if (status === "closed" || status === "dismissed" || status === "convicted") {
    legalCase.closedAt = legalCase.closedAt || Date.now();
  }
  if (status === "closed") {
    pushJusticeEvent(store, "case_closed", caseId, { caseId });
  } else {
    pushJusticeEvent(store, "status_changed", `${caseId} → ${status}`, { caseId });
  }
  markDirty();
  return { ok: true, case: legalCase };
}
