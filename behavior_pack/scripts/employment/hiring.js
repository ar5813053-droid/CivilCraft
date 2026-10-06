/**
 * Hire / fire APIs. Does not pay salaries for government roles (police owns that).
 */

import { createRecord, MAX_RECORDS, MAX_HISTORY } from "./employment-data.js";
import { isEligibleForJob } from "./job-matching.js";
import { pushEmploymentEvent } from "./employment-events.js";
import { markDirty } from "../core/data-store.js";

export function getRecord(store, villagerId) {
  return (store.records || []).find((r) => r.villagerId === villagerId) || null;
}

export function ensureRecord(store, villagerId) {
  let rec = getRecord(store, villagerId);
  if (rec) return rec;
  rec = createRecord({ villagerId, status: "unemployed" });
  store.records.push(rec);
  if (store.records.length > MAX_RECORDS) store.records = store.records.slice(-MAX_RECORDS);
  markDirty();
  return rec;
}

export function hireCitizen(store, input) {
  const { villager, jobId, employerType, employerId, dayStamp, educationLevel, health } = input;
  if (!villager?.id) return { ok: false, error: "invalid_villager" };
  if (!isEligibleForJob(villager, jobId, educationLevel, health ?? 80)) {
    return { ok: false, error: "ineligible" };
  }
  const existing = getRecord(store, villager.id);
  if (existing?.status === "employed" && existing.jobId === jobId) {
    return { ok: false, error: "already_employed" };
  }
  if (existing?.status === "employed") {
    return { ok: false, error: "already_employed" };
  }

  const opening = (store.opportunities || []).find((o) => o.jobId === jobId && (o.open || 0) > 0);
  if (!opening && !input.force) return { ok: false, error: "no_vacancy" };

  const rec = ensureRecord(store, villager.id);
  if (rec.status === "employed" && rec.jobId) {
    store.history.push({ ...rec, endedDay: dayStamp, endReason: "rehire" });
    if (store.history.length > MAX_HISTORY) store.history = store.history.slice(-MAX_HISTORY);
  }

  rec.jobId = jobId;
  rec.employerType = employerType || opening?.employerType || "self_employed";
  rec.employerId = employerId || opening?.employerId || `self_${jobId}`;
  rec.status = "employed";
  rec.hiredDay = dayStamp;
  rec.lastWorkedDay = dayStamp;
  rec.unemploymentDays = 0;

  if (opening) opening.open = Math.max(0, (opening.open || 1) - 1);
  villager.profession = jobId;

  store.stats.hired = (store.stats.hired || 0) + 1;
  pushEmploymentEvent(store, "hired", `${villager.id}:${jobId}`);
  markDirty();
  return { ok: true, record: rec };
}

export function makeUnemployed(store, villagerId, dayStamp, reason = "job_lost") {
  const rec = getRecord(store, villagerId);
  if (!rec || rec.status !== "employed") return { ok: false, error: "not_employed" };
  store.history.push({ ...rec, endedDay: dayStamp, endReason: reason });
  if (store.history.length > MAX_HISTORY) store.history = store.history.slice(-MAX_HISTORY);
  rec.jobId = null;
  rec.employerType = null;
  rec.employerId = null;
  rec.status = "unemployed";
  rec.unemploymentDays = 0;
  store.stats.lost = (store.stats.lost || 0) + 1;
  pushEmploymentEvent(store, reason, villagerId);
  markDirty();
  return { ok: true, record: rec };
}
