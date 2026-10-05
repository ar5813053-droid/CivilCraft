/**
 * Default daily schedule template.
 *
 * Hours are Minecraft hours (0–23) derived from day time.
 * Individual jobs can later supply their own scheduleId.
 */

/**
 * @typedef {Object} ScheduleEntry
 * @property {number} hour          // start hour (inclusive)
 * @property {string} activity      // activity key
 * @property {string} [label]       // human-readable
 */

/**
 * Phase 1 default schedule (aligned with project vision):
 * 06:00 Wake up
 * 07:00 Morning routine
 * 08:00 Work
 * 12:00 Lunch
 * 13:00 Work
 * 18:00 Return home
 * 20:00 Free time
 * 22:00 Sleep
 *
 * @type {ScheduleEntry[]}
 */
export const DEFAULT_SCHEDULE = [
  { hour: 6, activity: "wake", label: "Wake up" },
  { hour: 7, activity: "morning_routine", label: "Morning routine" },
  { hour: 8, activity: "work", label: "Work" },
  { hour: 12, activity: "lunch", label: "Lunch" },
  { hour: 13, activity: "work", label: "Work" },
  { hour: 18, activity: "return_home", label: "Return home" },
  { hour: 20, activity: "free_time", label: "Free time" },
  { hour: 22, activity: "sleep", label: "Sleep" }
];

/**
 * Resolves the activity that should be active at a given hour.
 * Entries are assumed sorted by hour ascending.
 * @param {ScheduleEntry[]} schedule
 * @param {number} hour  // 0–23
 * @returns {ScheduleEntry}
 */
export function resolveActivity(schedule, hour) {
  if (!schedule || schedule.length === 0) {
    return { hour: 0, activity: "idle", label: "Idle" };
  }

  let current = schedule[0];
  for (const entry of schedule) {
    if (hour >= entry.hour) {
      current = entry;
    } else {
      break;
    }
  }

  // Before first entry of the day (e.g. hour 0–5) → treat as sleep continuation
  if (hour < schedule[0].hour) {
    const last = schedule[schedule.length - 1];
    if (last.activity === "sleep") {
      return last;
    }
  }

  return current;
}
