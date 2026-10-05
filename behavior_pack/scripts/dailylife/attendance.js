import { MAX_ATTENDANCE } from "./daily-life-data.js";

export function recordAttendance(store, entry) {
  store.attendance = store.attendance || [];
  store.attendance.push({
    villagerId: entry.villagerId,
    jobId: entry.jobId || null,
    scheduled: true,
    attended: entry.attended !== false,
    absenceReason: entry.absenceReason || null,
    date: entry.date || 0
  });
  if (store.attendance.length > MAX_ATTENDANCE) store.attendance = store.attendance.slice(-MAX_ATTENDANCE);
}

export function attendanceRate(store, villagerId) {
  const rows = (store.attendance || []).filter((a) => a.villagerId === villagerId);
  if (!rows.length) return 1;
  return rows.filter((a) => a.attended).length / rows.length;
}
