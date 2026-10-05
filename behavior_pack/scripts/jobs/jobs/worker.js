/**
 * Worker job definition.
 * Generic laborer placeholder for future construction / resource tasks.
 */

import { registerJob } from "../job-registry.js";

export function registerWorkerJob() {
  registerJob({
    id: "worker",
    displayName: "Worker",
    description: "General laborer performing village maintenance tasks.",
    scheduleId: "default",
    tags: ["labor"]
  });
}
