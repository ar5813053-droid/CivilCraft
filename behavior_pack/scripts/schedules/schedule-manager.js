/**
 * Schedule evaluation for managed villagers.
 *
 * Runs on a low-frequency interval and only for actively simulated
 * villagers. Does not drive pathfinding or entity AI in Phase 1 —
 * it updates the identity's currentActivity field so later systems
 * can react.
 */

import { world } from "@minecraft/server";
import { getDayTime, dayTimeToHour } from "../core/utils.js";
import { Logger } from "../core/logger.js";
import { getJob } from "../jobs/job-registry.js";
import { patchVillager } from "../villagers/villager-registry.js";
import { DEFAULT_SCHEDULE, resolveActivity } from "./default-schedule.js";
import { POLICE_SCHEDULE } from "./police-schedule.js";

/** @type {Map<string, ScheduleEntry[]>} */
const scheduleTemplates = new Map();

/**
 * @typedef {import("./default-schedule.js").ScheduleEntry} ScheduleEntry
 * @typedef {import("../villagers/villager-identity.js").VillagerRecord} VillagerRecord
 */

/**
 * Registers a named schedule template.
 * @param {string} id
 * @param {ScheduleEntry[]} entries
 */
export function registerSchedule(id, entries) {
  scheduleTemplates.set(id, entries);
}

/**
 * Returns a schedule template by id, falling back to default.
 * @param {string} [id]
 * @returns {ScheduleEntry[]}
 */
export function getSchedule(id) {
  if (id && scheduleTemplates.has(id)) {
    return scheduleTemplates.get(id);
  }
  return scheduleTemplates.get("default") ?? DEFAULT_SCHEDULE;
}

/**
 * Initializes built-in schedules.
 */
export function initializeSchedules() {
  registerSchedule("default", DEFAULT_SCHEDULE);
  registerSchedule("police", POLICE_SCHEDULE);
  Logger.info("Schedule templates initialized.");
}

/**
 * Evaluates and applies the correct activity for a villager record
 * based on current world time and their job's preferred schedule.
 * @param {VillagerRecord} record
 * @returns {string} the activity that was applied (or already active)
 */
export function evaluateVillagerSchedule(record) {
  const dayTime = getDayTime(world);
  const hour = dayTimeToHour(dayTime);

  const job = getJob(record.profession);
  const scheduleId = job?.scheduleId ?? record.scheduleId ?? "default";
  const schedule = getSchedule(scheduleId);
  const entry = resolveActivity(schedule, hour);

  if (record.currentActivity !== entry.activity) {
    patchVillager(record.id, { currentActivity: entry.activity });
    Logger.debug(
      `${record.name}: ${record.currentActivity} → ${entry.activity} (hour ${hour})`
    );
  }

  return entry.activity;
}

/**
 * Batch-evaluate a list of villager records.
 * @param {VillagerRecord[]} records
 */
export function evaluateMany(records) {
  for (const record of records) {
    evaluateVillagerSchedule(record);
  }
}
