/**
 * Justice orchestrator. Interval aggregate refresh only — no crime generation.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultJustice, normalizeJustice } from "./justice-data.js";
import { initializeLaws, getAllLaws, getLaw } from "./law-registry.js";
import { reportViolation } from "./violations.js";
import { openCase, setCaseStatus } from "./cases.js";
import { issueFine, issueWarning, payFine } from "./penalties.js";
import { getLegalStatus } from "./legal-status.js";

export const JUSTICE_INTERVAL_TICKS = 800;

let initialized = false;

export function initializeJustice() {
  if (initialized) return;
  initialized = true;
  initializeLaws();
  const data = getWorldData();
  data.justice = data.justice ? normalizeJustice(data.justice) : createDefaultJustice();
  markDirty();
  system.runInterval(() => {
    try {
      refreshJusticeStats(data.justice);
      markDirty();
    } catch (e) {
      Logger.error("Justice tick failed", e);
    }
  }, JUSTICE_INTERVAL_TICKS);
  Logger.info("Justice manager initialized.");
}

export function getJustice() {
  const data = getWorldData();
  if (!data.justice) data.justice = createDefaultJustice();
  return data.justice;
}

export function refreshJusticeStats(store) {
  if (!store) return;
  const cases = store.cases || [];
  const penalties = store.penalties || [];
  const open = cases.filter((c) => !["closed", "dismissed", "convicted"].includes(c.status));
  const closed = cases.filter((c) => c.closedAt);
  const durations = closed
    .map((c) => (c.closedAt || 0) - (c.openedAt || 0))
    .filter((n) => n > 0);
  const wanted = new Set(
    (store.violations || [])
      .filter((v) => v.severity >= 3 && v.status !== "dismissed" && v.status !== "resolved")
      .map((v) => v.offenderVillagerId)
  );
  store.stats = {
    totalViolations: (store.violations || []).length,
    openCases: open.length,
    resolvedCases: cases.filter((c) => c.status === "closed" || c.status === "convicted").length,
    convictions: cases.filter((c) => c.status === "convicted" || c.judgement === "convicted").length,
    dismissals: cases.filter((c) => c.status === "dismissed").length,
    finesIssued: penalties.filter((p) => p.type === "fine").length,
    finesCollected: store.stats?.finesCollected || 0,
    outstandingFines: penalties
      .filter((p) => p.type === "fine" && p.status === "outstanding")
      .reduce((s, p) => s + Math.max(0, (p.amount || 0) - (p.paid || 0)), 0),
    warnings: penalties.filter((p) => p.type === "warning").length,
    wanted: wanted.size,
    averageResolutionMs:
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0
  };
}

export function formatJusticeLines() {
  const store = getJustice();
  const s = store.stats || {};
  return [
    "§6CivilCraft Justice§r",
    `Jurisdiction: ${store.jurisdiction}`,
    `Laws: ${getAllLaws().length}`,
    `Violations: ${s.totalViolations}  Open cases: ${s.openCases}`,
    `Convictions: ${s.convictions}  Dismissals: ${s.dismissals}`,
    `Fines collected: ${s.finesCollected}  Outstanding: ${s.outstandingFines}`,
    `Warnings: ${s.warnings}  Wanted: ${s.wanted}`
  ];
}

export {
  reportViolation,
  openCase,
  setCaseStatus,
  issueFine,
  issueWarning,
  payFine,
  getLegalStatus,
  getAllLaws,
  getLaw
};
