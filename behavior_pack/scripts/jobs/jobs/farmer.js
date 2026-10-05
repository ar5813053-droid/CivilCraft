/**
 * Farmer job definition.
 * Phase 1: identity + schedule only. Actual crop interaction comes later.
 */

import { registerJob } from "../job-registry.js";

export function registerFarmerJob() {
  registerJob({
    id: "farmer",
    displayName: "Farmer",
    description: "Works fields and tends crops.",
    scheduleId: "default",
    tags: ["economy", "production", "agriculture"]
  });
}
