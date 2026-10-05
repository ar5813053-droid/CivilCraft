/**
 * Extensible job registry.
 *
 * New jobs are registered here; schedules and simulation
 * look up behavior by job id without hard-coding switch statements.
 */

import { Logger } from "../core/logger.js";
import { DEFAULT_JOB_ID } from "../core/constants.js";

/**
 * @typedef {Object} JobDefinition
 * @property {string} id
 * @property {string} displayName
 * @property {string} description
 * @property {string} [scheduleId]   // override default schedule
 * @property {string[]} [tags]       // e.g. ["production", "service"]
 * @property {(ctx: object) => void} [onWorkStart]
 * @property {(ctx: object) => void} [onWorkTick]
 * @property {(ctx: object) => void} [onWorkEnd]
 */

/** @type {Map<string, JobDefinition>} */
const jobs = new Map();

/**
 * Registers a job definition. Overwrites if the same id exists.
 * @param {JobDefinition} definition
 */
export function registerJob(definition) {
  if (!definition?.id) {
    Logger.error("Cannot register job without id");
    return;
  }
  jobs.set(definition.id, definition);
  Logger.debug(`Job registered: ${definition.id}`);
}

/**
 * @param {string} id
 * @returns {JobDefinition|undefined}
 */
export function getJob(id) {
  return jobs.get(id);
}

/**
 * @returns {JobDefinition[]}
 */
export function getAllJobs() {
  return Array.from(jobs.values());
}

/**
 * @param {string} id
 * @returns {boolean}
 */
export function hasJob(id) {
  return jobs.has(id);
}

/**
 * Returns the job id, falling back to default citizen.
 * @param {string} [id]
 * @returns {string}
 */
export function resolveJobId(id) {
  if (id && jobs.has(id)) return id;
  return DEFAULT_JOB_ID;
}

/**
 * Initializes built-in Phase 1 jobs.
 * Called once at startup.
 */
export function initializeBuiltinJobs() {
  // Definitions live in separate modules for clarity.
  // They are imported and registered by main.js / jobs/index pattern.
}
