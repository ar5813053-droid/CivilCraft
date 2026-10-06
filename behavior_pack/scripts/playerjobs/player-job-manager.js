import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { getAllJobs, getJob } from "../jobs/job-registry.js";
import { getEmploymentStore } from "../employment/employment-manager.js";
import { hireCitizen, makeUnemployed } from "../employment/hiring.js";
import { getRecord } from "../employment/hiring.js";
import { getOpenings } from "../employment/job-market.js";
import { createDefaultPlayerJobs, normalizePlayerJobs } from "./player-job-data.js";
import { generateMissionsForJob, acceptMission, abandonMission, completeMission } from "./job-missions.js";
import { payMissionReward, tryWeeklyPayroll, salaryHint } from "./player-payroll.js";
import { getAllShops } from "../economy/shops.js";
import { publish } from "../events/event-bus.js";
import { EventType } from "../events/event-types.js";

let initialized = false;
export const PLAYER_JOB_INTERVAL = 2400;

export function initializePlayerJobs() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.playerJobs = data.playerJobs ? normalizePlayerJobs(data.playerJobs) : createDefaultPlayerJobs();
  system.runInterval(() => {
    try {
      const day = Math.floor(Date.now() / 86400000);
      const store = data.playerJobs;
      const players = data.players?.profiles || {};
      const empStore = getEmploymentStore();
      for (const profile of Object.values(players)) {
        const rec = getRecord(empStore, profile.id);
        if (rec?.status === "employed") {
          generateMissionsForJob(store, profile, rec, data);
          tryWeeklyPayroll(store, profile, rec, day);
        }
      }
      markDirty();
    } catch (e) {
      Logger.error("Player jobs tick failed", e);
    }
  }, PLAYER_JOB_INTERVAL);
  Logger.info("Player jobs manager initialized.");
}

export function getPlayerJobsStore() {
  const data = getWorldData();
  if (!data.playerJobs) data.playerJobs = createDefaultPlayerJobs();
  return data.playerJobs;
}

export function listAvailableJobs() {
  return getAllJobs().map((j) => ({
    id: j.id,
    name: j.displayName || j.id,
    description: j.description || "",
    salaryHint: salaryHint(j.id),
    tags: j.tags || []
  }));
}

export function listNearbyEmployers() {
  const openings = getOpenings(getEmploymentStore()) || [];
  const shops = getAllShops();
  const lines = [];
  for (const o of openings.slice(0, 20)) {
    const shop = o.employerId ? shops.find((s) => s.id === o.employerId) : null;
    lines.push({
      jobId: o.jobId,
      employerId: o.employerId || "self",
      employerType: o.employerType || "unknown",
      open: o.open || 0,
      salaryHint: salaryHint(o.jobId),
      label: shop?.name || o.employerId || o.jobId
    });
  }
  for (const j of getAllJobs()) {
    if (!openings.some((o) => o.jobId === j.id)) {
      lines.push({
        jobId: j.id,
        employerId: `self_${j.id}`,
        employerType: "self_employed",
        open: 1,
        salaryHint: salaryHint(j.id),
        label: j.displayName || j.id
      });
    }
  }
  return lines;
}

/**
 * Apply: reuse hireCitizen with player profile as villager-like record.
 */
export function applyForJob(profile, jobId) {
  if (!profile?.id) return { ok: false, error: "no_profile" };
  if (!getJob(jobId)) return { ok: false, error: "unknown_job" };
  const store = getEmploymentStore();
  const day = Math.floor(Date.now() / 86400000);
  const villagerLike = {
    id: profile.id,
    age: profile.age ?? 25,
    alive: true,
    profession: profile.jobId || "citizen",
    lifeStage: profile.lifeStage || "adult"
  };
  const result = hireCitizen(store, {
    villager: villagerLike,
    jobId,
    dayStamp: day,
    educationLevel: profile.educationLevel || "primary",
    health: profile.health ?? 80,
    force: true
  });
  if (result.ok) {
    profile.jobId = jobId;
    profile.employmentId = profile.id;
    publish(EventType.PLAYER_JOB_STARTED, {
      source: "playerjobs",
      actorId: profile.id,
      metadata: { jobId, employerId: result.record?.employerId }
    });
    markDirty();
  }
  return result;
}

export function quitJob(profile) {
  if (!profile?.id) return { ok: false, error: "no_profile" };
  const store = getEmploymentStore();
  const day = Math.floor(Date.now() / 86400000);
  const r = makeUnemployed(store, profile.id, day, "resigned");
  profile.jobId = null;
  if (r.ok) {
    publish(EventType.PLAYER_JOB_ENDED, {
      source: "playerjobs",
      actorId: profile.id,
      metadata: { reason: "resigned" }
    });
  }
  markDirty();
  return r;
}

export function jobStatus(profile) {
  const rec = getRecord(getEmploymentStore(), profile?.id);
  return {
    jobId: rec?.jobId || profile?.jobId || null,
    status: rec?.status || "unemployed",
    employerId: rec?.employerId || null,
    employerType: rec?.employerType || null,
    salaryHint: salaryHint(rec?.jobId || profile?.jobId)
  };
}

export function playerMissions(playerId) {
  return (getPlayerJobsStore().missions || []).filter((m) => m.playerId === playerId);
}

export function doAcceptMission(playerId, missionId) {
  return acceptMission(getPlayerJobsStore(), playerId, missionId);
}

export function doAbandonMission(playerId, missionId) {
  return abandonMission(getPlayerJobsStore(), playerId, missionId);
}

export function doCompleteMission(profile, missionId) {
  const data = getWorldData();
  return completeMission(getPlayerJobsStore(), profile.id, missionId, profile, data, payMissionReward);
}
