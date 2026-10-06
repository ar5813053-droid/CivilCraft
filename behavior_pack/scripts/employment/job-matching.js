/**
 * Deterministic job eligibility and ranking. Education is read-only.
 */

import { jobEligible, lifeStage } from "../population/population-data.js";
import { LEVELS } from "../education/education-data.js";
import { JOB_EDUCATION, DEFAULT_CAPACITY } from "./employment-data.js";
import { hasJob } from "../jobs/job-registry.js";

export function educationIndex(level) {
  const idx = LEVELS.indexOf(level || "none");
  return idx < 0 ? 0 : idx;
}

export function canWork(villager) {
  if (!villager || villager.alive === false) return false;
  if (!jobEligible(villager.age ?? 30)) return false;
  const stage = villager.lifeStage || lifeStage(villager.age);
  if (stage === "infant" || stage === "child" || stage === "teenager") return false;
  return true;
}

/**
 * @param {object} villager
 * @param {string} jobId
 * @param {string} [educationLevel]
 * @param {number} [health]
 */
export function isEligibleForJob(villager, jobId, educationLevel = "none", health = 80) {
  if (!canWork(villager)) return false;
  if (!jobId || !hasJob(jobId) || jobId === "citizen") return false;
  if (health < 20) return false;
  const required = JOB_EDUCATION[jobId] ?? 0;
  if (educationIndex(educationLevel) < required) return false;
  return true;
}

/**
 * Rank openings for a citizen. Higher score is better.
 * @returns {{ jobId: string, employerType: string, employerId: string, score: number }[]}
 */
export function rankOpenings(openings, villager, educationLevel, health) {
  const list = [];
  for (const open of openings || []) {
    if ((open.open || 0) <= 0) continue;
    if (!isEligibleForJob(villager, open.jobId, educationLevel, health)) continue;
    let score = 10;
    score += educationIndex(educationLevel) * 2;
    if (open.employerType === "government") score += 5;
    if (open.employerType === "business") score += 3;
    if (open.employerType === "self_employed") score += 1;
    score += Math.min(10, open.open || 0);
    if (DEFAULT_CAPACITY[open.jobId]) score += 1;
    list.push({ ...open, score });
  }
  list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.jobId).localeCompare(String(b.jobId));
  });
  return list;
}
