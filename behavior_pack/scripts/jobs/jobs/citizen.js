/**
 * Citizen — default / unassigned job.
 * No special workplace behavior in Phase 1.
 */

import { registerJob } from "../job-registry.js";

export function registerCitizenJob() {
  registerJob({
    id: "citizen",
    displayName: "Citizen",
    description: "A resident without a specialized profession.",
    scheduleId: "default",
    tags: ["civilian"]
  });
}
