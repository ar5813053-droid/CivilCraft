/**
 * Job system bootstrap.
 */

import { registerCitizenJob } from "./jobs/citizen.js";
import { registerFarmerJob } from "./jobs/farmer.js";
import { registerWorkerJob } from "./jobs/worker.js";
import { registerTraderJob } from "./jobs/trader.js";
import { registerBuilderJob } from "./jobs/builder.js";
import { registerPoliceJob } from "./jobs/police-officer.js";
import { registerHealerJob, registerNurseJob, registerDoctorJob } from "./jobs/medical.js";
import { registerTeacherJob } from "./jobs/teacher.js";
import { Logger } from "../core/logger.js";

/**
 * Registers all Phase 1 jobs. Call once during addon startup.
 */
export function initializeJobs() {
  registerCitizenJob();
  registerFarmerJob();
  registerWorkerJob();
  registerTraderJob();
  registerBuilderJob();
  registerPoliceJob();
  registerHealerJob();
  registerNurseJob();
  registerDoctorJob();
  registerTeacherJob();
  Logger.info("Job registry initialized (Phase 1 jobs).");
}

export { getJob, getAllJobs, hasJob, resolveJobId, registerJob } from "./job-registry.js";
