/**
 * Builder job definition.
 * Phase 1: identity only. Construction systems come later.
 */

import { registerJob } from "../job-registry.js";

export function registerBuilderJob() {
  registerJob({
    id: "builder",
    displayName: "Builder",
    description: "Constructs and repairs village structures.",
    scheduleId: "default",
    tags: ["economy", "construction", "labor"]
  });
}
