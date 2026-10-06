/**
 * Lightweight decision scoring. Critical needs still win.
 */

import { ACTIVITIES } from "../dailylife/activities.js";

const CRITICAL = new Set(["emergency", "healthcare", "eating", "sleeping"]);

/**
 * Base need score for an activity given daily-life input (same shape as chooseActivity).
 */
export function baseNeedScore(activity, input) {
  if (activity === "emergency" && input.emergency) return 1000;
  if (activity === "healthcare" && (input.health ?? 80) < 30) return 900;
  if (activity === "eating" && (input.hunger ?? 80) < 20) return 850;
  if (activity === "sleeping" && (input.energy ?? 80) < 15) return 800;
  if (activity === "homeless" && !input.houseId) return 700;
  if (activity === "studying" && input.schoolScheduled) return 200;
  if (activity === "working" && input.workScheduled) return 180;
  if (activity === "police_service" && input.workScheduled && input.jobId === "police_officer") return 185;
  if (activity === "job_search" && input.unemployed && input.workingAge) return 150;
  if (activity === "socializing" && (input.social ?? 50) < 30) return 120;
  if (activity === "leisure") return 40;
  if (activity === "idle") return 10;
  return 0;
}

export function personalityModifier(activity, personality) {
  const p = personality || {};
  let m = 0;
  if (activity === "socializing" || activity === "family_time") m += ((p.sociability || 50) - 50) * 0.4;
  if (activity === "working" || activity === "job_search") m += ((p.ambition || 50) - 50) * 0.35;
  if (activity === "working") m += ((p.discipline || 50) - 50) * 0.25;
  if (activity === "studying") m += ((p.curiosity || 50) - 50) * 0.4;
  if (activity === "leisure") m += ((p.sociability || 50) - 50) * 0.15;
  if (activity === "government_service") m += ((p.civicDuty || 50) - 50) * 0.3;
  return m;
}

export function goalModifier(activity, goals) {
  if (!goals?.length) return 0;
  let m = 0;
  for (const g of goals) {
    if (g.status !== "active") continue;
    const pr = (g.priority || 50) * 0.15;
    if (g.type === "find_job" && activity === "job_search") m += pr;
    if (g.type === "earn_money" && (activity === "working" || activity === "job_search")) m += pr;
    if (g.type === "get_education" && activity === "studying") m += pr;
    if (g.type === "maintain_health" && activity === "healthcare") m += pr;
    if (g.type === "socialize" && activity === "socializing") m += pr;
    if (g.type === "support_family" && activity === "family_time") m += pr;
    if (g.type === "help_community" && (activity === "government_service" || activity === "emergency")) m += pr;
    if (g.type === "participate_politics" && activity === "government_service") m += pr * 0.8;
    if (g.type === "save_money" && activity === "shopping") m -= pr * 0.5;
  }
  return m;
}

export function memoryModifier(activity, recentMemories) {
  if (!recentMemories?.length) return 0;
  let m = 0;
  for (const mem of recentMemories.slice(-5)) {
    const t = mem.type || "";
    if ((t.includes("JOB_ENDED") || t.includes("UNEMPLOYED") || t.includes("FIRED")) && activity === "job_search") m += 25;
    if (t.includes("MEDICAL") && activity === "healthcare") m += 15;
    if (t.includes("MISSION") && activity === "working") m += 8;
    if (t.includes("ELECTION") && activity === "government_service") m += 10;
  }
  return m;
}

/**
 * Score a single activity. Critical needs use high base scores that personality cannot overcome.
 */
export function scoreActivity(activity, input, personality, goals, recentMemories) {
  const base = baseNeedScore(activity, input);
  if (CRITICAL.has(activity) && base >= 800) {
    return base; // no personality override
  }
  let score = base;
  score += personalityModifier(activity, personality);
  score += goalModifier(activity, goals);
  score += memoryModifier(activity, recentMemories);
  return Math.max(-50, Math.min(1100, score));
}

/**
 * Pick best activity among candidates with deterministic tie-break.
 */
export function pickActivity(input, personality, goals, recentMemories, candidates = ACTIVITIES) {
  // Safety path mirrors chooseActivity critical rules first
  if (input.emergency) return { activity: "emergency", score: 1000, reason: "critical" };
  if ((input.health ?? 80) < 30) return { activity: "healthcare", score: 900, reason: "critical" };
  if ((input.hunger ?? 80) < 20) return { activity: "eating", score: 850, reason: "critical" };
  if ((input.energy ?? 80) < 15) return { activity: "sleeping", score: 800, reason: "critical" };

  let best = null;
  let bestScore = -Infinity;
  for (const a of candidates) {
    const s = scoreActivity(a, input, personality, goals, recentMemories);
    if (s > bestScore || (s === bestScore && best && a.localeCompare(best) < 0)) {
      bestScore = s;
      best = a;
    }
  }
  return { activity: best || "idle", score: bestScore, reason: "scored" };
}

/**
 * Public API for Daily Life: modifier bias for an activity (-20..+20).
 */
export function getBehaviorModifier(personality, goals, activityType, recentMemories) {
  const p = personalityModifier(activityType, personality);
  const g = goalModifier(activityType, goals);
  const m = memoryModifier(activityType, recentMemories);
  return Math.max(-20, Math.min(20, Math.round((p + g + m) * 0.5)));
}
