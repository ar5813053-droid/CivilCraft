/**
 * Trader job definition.
 * Phase 1: identity only. Trade tables / shops come in Economy phase.
 */

import { registerJob } from "../job-registry.js";

export function registerTraderJob() {
  registerJob({
    id: "trader",
    displayName: "Trader",
    description: "Handles local commerce and exchange.",
    scheduleId: "default",
    tags: ["commerce", "service"]
  });
}
