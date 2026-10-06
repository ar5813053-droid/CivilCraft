export { getRecord, ensureRecord, hireCitizen, makeUnemployed } from "./hiring.js";

export function isEmployed(store, villagerId) {
  const rec = (store.records || []).find((r) => r.villagerId === villagerId);
  return rec?.status === "employed";
}

export function getEmploymentSnapshot(store, villagerId) {
  const rec = (store.records || []).find((r) => r.villagerId === villagerId);
  if (!rec) return { employed: false, jobId: null, employerId: null, status: "unemployed" };
  return {
    employed: rec.status === "employed",
    jobId: rec.jobId,
    employerId: rec.employerId,
    employerType: rec.employerType,
    status: rec.status,
    unemploymentDays: rec.unemploymentDays || 0
  };
}
