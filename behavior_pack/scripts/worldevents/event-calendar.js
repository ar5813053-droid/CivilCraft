/**
 * CivilCraft simulation calendar — does not replace Minecraft clock.
 * Advances on scheduled ticks from world events manager.
 */

export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 4;
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR; // 120
export const SEASONS = Object.freeze(["Spring", "Summer", "Autumn", "Winter"]);
export const WEEKDAYS = Object.freeze(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

export function createDefaultCalendar() {
  return {
    totalDays: 0,
    year: 1,
    month: 1,
    day: 1,
    dayOfYear: 0,
    season: "Spring",
    weekday: "Mon",
    hour: 8
  };
}

export function normalizeCalendar(raw) {
  const base = createDefaultCalendar();
  if (!raw || typeof raw !== "object") return base;
  const cal = {
    totalDays: Math.max(0, Math.floor(raw.totalDays || 0)),
    year: Math.max(1, Math.floor(raw.year || 1)),
    month: Math.max(1, Math.min(MONTHS_PER_YEAR, Math.floor(raw.month || 1))),
    day: Math.max(1, Math.min(DAYS_PER_MONTH, Math.floor(raw.day || 1))),
    dayOfYear: Math.max(0, Math.floor(raw.dayOfYear || 0)),
    season: raw.season || "Spring",
    weekday: raw.weekday || "Mon",
    hour: Math.max(0, Math.min(23, Math.floor(raw.hour ?? 8)))
  };
  return recomputeCalendar(cal);
}

/** Advance one simulation day */
export function advanceDay(cal) {
  cal.totalDays = (cal.totalDays || 0) + 1;
  cal.dayOfYear = (cal.dayOfYear || 0) + 1;
  if (cal.dayOfYear >= DAYS_PER_YEAR) {
    cal.dayOfYear = 0;
    cal.year = (cal.year || 1) + 1;
  }
  cal.month = Math.floor(cal.dayOfYear / DAYS_PER_MONTH) + 1;
  cal.day = (cal.dayOfYear % DAYS_PER_MONTH) + 1;
  cal.season = SEASONS[Math.min(3, cal.month - 1)];
  cal.weekday = WEEKDAYS[cal.totalDays % 7];
  return cal;
}

export function recomputeCalendar(cal) {
  const doy = cal.dayOfYear || 0;
  cal.month = Math.floor(doy / DAYS_PER_MONTH) + 1;
  cal.day = (doy % DAYS_PER_MONTH) + 1;
  cal.season = SEASONS[Math.min(3, (cal.month || 1) - 1)];
  cal.weekday = WEEKDAYS[(cal.totalDays || 0) % 7];
  return cal;
}

export function formatCalendar(cal) {
  return [
    `Year ${cal.year} ${cal.season}`,
    `Month ${cal.month} Day ${cal.day} (${cal.weekday})`,
    `Day-of-year ${cal.dayOfYear} · Total ${cal.totalDays}`
  ];
}
