/**
 * Fixed yearly festival schedule for CivilCraft's 120-day year.
 * Authoritative dates are data-driven — change here, not in scheduler logic.
 *
 * These are in-game CivilCraft days, NOT real-world Gregorian/Islamic calendar dates.
 */

import { listFestivals, getFestival } from "./festival-registry.js";
import { DAYS_PER_YEAR } from "../worldevents/event-calendar.js";

/**
 * Fixed annual schedule (overrides registry dayOfYear when present).
 * preparationDays = days before startDayOfYear that PREPARATION begins.
 */
export const FIXED_ANNUAL_SCHEDULE = Object.freeze([
  {
    festivalId: "holi",
    startDayOfYear: 20,
    durationDays: 2,
    preparationDays: 3,
    closingDays: 1,
    recurrence: "YEARLY"
  },
  {
    festivalId: "diwali",
    startDayOfYear: 55,
    durationDays: 3,
    preparationDays: 5,
    closingDays: 1,
    recurrence: "YEARLY"
  },
  {
    festivalId: "ramadan",
    startDayOfYear: 70,
    durationDays: 10,
    preparationDays: 3,
    closingDays: 1,
    recurrence: "YEARLY"
  },
  {
    festivalId: "eid",
    startDayOfYear: 80,
    durationDays: 3,
    preparationDays: 2,
    closingDays: 1,
    recurrence: "YEARLY"
  },
  {
    festivalId: "christmas",
    startDayOfYear: 110,
    durationDays: 3,
    preparationDays: 5,
    closingDays: 1,
    recurrence: "YEARLY"
  }
]);

export function getScheduleEntry(festivalId) {
  return FIXED_ANNUAL_SCHEDULE.find((e) => e.festivalId === festivalId) || null;
}

export function listScheduledFestivals() {
  return FIXED_ANNUAL_SCHEDULE.map((e) => {
    const def = getFestival(e.festivalId);
    return { ...e, name: def?.name || e.festivalId };
  });
}

/** Unique key so completion is per (festival, year) and can recur next year */
export function occurrenceKey(festivalId, civilizationYear) {
  return `${festivalId}:y${civilizationYear}`;
}

/**
 * Absolute totalDays when preparation should start for a given year+schedule.
 * calendar.year is 1-based; dayOfYear 0..119.
 */
export function prepStartTotalDay(calendarYear, entry) {
  const doy = entry.startDayOfYear;
  const prep = entry.preparationDays || 0;
  // year N starts at totalDays = (N-1)*120
  const yearStart = (calendarYear - 1) * DAYS_PER_YEAR;
  return yearStart + Math.max(0, doy - prep);
}

export function activeStartTotalDay(calendarYear, entry) {
  const yearStart = (calendarYear - 1) * DAYS_PER_YEAR;
  return yearStart + entry.startDayOfYear;
}

export function festivalEndTotalDay(calendarYear, entry) {
  const start = activeStartTotalDay(calendarYear, entry);
  const prep = entry.preparationDays || 0;
  // track.startDay is prep start; end after prep+duration+closing from prep start
  return start + (entry.durationDays || 1) + (entry.closingDays || 0) - 1;
}

/**
 * Which phase should apply if world loads mid-window?
 * Returns null if outside the festival window for this year.
 */
export function phaseForTotalDay(totalDays, calendarYear, entry) {
  const prepStart = prepStartTotalDay(calendarYear, entry);
  const activeStart = activeStartTotalDay(calendarYear, entry);
  const activeEnd = activeStart + (entry.durationDays || 1) - 1;
  const closeEnd = activeEnd + (entry.closingDays || 0);

  if (totalDays < prepStart || totalDays > closeEnd) return null;
  if (totalDays < activeStart) return "preparation";
  if (totalDays <= activeEnd) return "active";
  if (totalDays <= closeEnd) return "closing";
  return null;
}

/**
 * Upcoming festivals from current dayOfYear, wrapping to next year.
 */
export function listUpcomingFromCalendar(calendar, limit = 8) {
  if (!calendar) return [];
  const doy = calendar.dayOfYear ?? 0;
  const year = calendar.year ?? 1;
  const items = [];
  for (const e of FIXED_ANNUAL_SCHEDULE) {
    const prepDoy = Math.max(0, e.startDayOfYear - (e.preparationDays || 0));
    if (e.startDayOfYear >= doy) {
      items.push({
        festivalId: e.festivalId,
        name: getFestival(e.festivalId)?.name || e.festivalId,
        year,
        startDayOfYear: e.startDayOfYear,
        preparationDayOfYear: prepDoy,
        durationDays: e.durationDays
      });
    }
  }
  // next year for those already past
  for (const e of FIXED_ANNUAL_SCHEDULE) {
    if (e.startDayOfYear < doy) {
      items.push({
        festivalId: e.festivalId,
        name: getFestival(e.festivalId)?.name || e.festivalId,
        year: year + 1,
        startDayOfYear: e.startDayOfYear,
        preparationDayOfYear: Math.max(0, e.startDayOfYear - (e.preparationDays || 0)),
        durationDays: e.durationDays
      });
    }
  }
  items.sort((a, b) => a.year - b.year || a.startDayOfYear - b.startDayOfYear);
  return items.slice(0, limit);
}
