/**
 * Trader job definition.
 * Phase 2: linked to shops via businesses.js (ownership + dividends).
 */

import { registerJob } from "../job-registry.js";

export function registerTraderJob() {
  registerJob({
    id: "trader",
    displayName: "Trader",
    description: "Handles local commerce and operates a shop.",
    scheduleId: "default",
    tags: ["commerce", "service", "economy"]
  });
}
