/**
 * Police officer job. Uses the police shift schedule.
 */

import { registerJob } from "../job-registry.js";

export function registerPoliceJob() {
  registerJob({
    id: "police_officer",
    displayName: "Police Officer",
    description: "Public safety officer on a shift schedule.",
    scheduleId: "police",
    tags: ["public_safety", "service"]
  });
}
