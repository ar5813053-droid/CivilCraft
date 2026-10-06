/**
 * Culture / festivals — schedules through World Events, effects via Economy & Daily Life.
 * Does not own calendar clock, money, or employment assignment.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultCulture, normalizeCulture, MAX_CULTURE_HISTORY } from "./culture-data.js";
import { listFestivals, getFestival, festivalsForDayOfYear } from "./festival-registry.js";
import { generateCulturalPreferences, participationScore } from "./cultural-preferences.js";
import { applyFestivalDemand } from "./festival-economy.js";
import { tickActivities } from "./festival-activities.js";
import { getPersonality } from "../citizenai/citizen-ai-manager.js";
import { createInstance, Lifecycle } from "../worldevents/event-instances.js";
import { selectParticipants } from "../worldevents/event-participants.js";
import { publish } from "../events/event-bus.js";
import { rememberCivilization } from "../memory/memory-manager.js";
import { addCitizenMemory } from "../memory/citizen-memory.js";
import { reportEvent } from "../social/media.js";

let initialized = false;
export const CULTURE_INTERVAL = 1200;

/** Map culture festival → world-event definition id when overlapping */
const WE_MAP = {
  harvest_festival: "harvest_festival",
  diwali: "festival_of_lights"
};

export function initializeCulture() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.culture = data.culture ? normalizeCulture(data.culture) : createDefaultCulture();
  // Register festival defs into world event definitions dynamically for scheduling
  ensureFestivalEventDefs();
  system.runInterval(() => {
    try {
      tickCulture(data);
    } catch (e) {
      Logger.error("Culture tick failed", e);
    }
  }, CULTURE_INTERVAL);
  Logger.info("Culture manager initialized.");
}

function ensureFestivalEventDefs() {
  // World events registry is static; culture schedules via scheduleManual with synthetic defs
}

export function getCultureStore() {
  const data = getWorldData();
  if (!data.culture) data.culture = createDefaultCulture();
  return data.culture;
}

export function getOrCreatePrefs(citizenId) {
  const store = getCultureStore();
  if (!store.preferences[citizenId]) {
    let personality = {};
    try {
      personality = getPersonality(citizenId) || {};
    } catch {
      /* */
    }
    store.preferences[citizenId] = generateCulturalPreferences(citizenId, personality);
  }
  return store.preferences[citizenId];
}

function festivalToDef(f) {
  return {
    id: f.id,
    type: f.id,
    name: f.name,
    category: "festival",
    durationDays: f.durationDays,
    preparationDays: f.preparationDays,
    cooldownDays: f.cooldownDays,
    maxParticipants: f.maxParticipants,
    activities: f.activities,
    effects: f.effects,
    recurringDayOfYear: f.dayOfYear
  };
}

function tickCulture(data) {
  const store = data.culture;
  const we = data.worldEvents;
  if (!we?.calendar) {
    markDirty();
    return;
  }
  const day = we.calendar.totalDays;
  const doy = we.calendar.dayOfYear;

  // Schedule festivals for this day-of-year
  for (const fest of festivalsForDayOfYear(doy)) {
    if (store.cooldowns[fest.id] != null && day - store.cooldowns[fest.id] < (fest.cooldownDays || 90)) {
      continue;
    }
    if (store.activeFestivals.some((a) => a.festivalId === fest.id && a.status !== "completed")) {
      continue;
    }
    startFestivalTrack(store, data, fest, day);
  }

  // Advance active tracks
  for (const track of store.activeFestivals) {
    const fest = getFestival(track.festivalId);
    if (!fest) continue;
    const phaseDay = day - track.startDay;

    if (track.status === "scheduled" && phaseDay >= 0) {
      track.status = "preparation";
      publish("FESTIVAL_PREPARATION_STARTED", {
        source: "culture",
        metadata: { festivalId: fest.id, trackId: track.id }
      });
      applyFestivalDemand(fest, track.completedKeys, "prep");
      if (data.social) {
        reportEvent(data.social, {
          type: "local_news",
          headlineKey: `${fest.mediaKey || fest.id}_upcoming`,
          severity: 2,
          createdDay: Math.floor(Date.now() / 86400000)
        });
      }
    }

    if (track.status === "preparation" && phaseDay >= (fest.preparationDays || 0)) {
      track.status = "active";
      track.participantIds = selectFestivalParticipants(data, fest);
      applyFestivalDemand(fest, track.completedKeys, "active");
      applyHappiness(data, track, fest);
      publish("FESTIVAL_STARTED", {
        source: "culture",
        metadata: { festivalId: fest.id, participants: track.participantIds.length }
      });
      if (data.social) {
        reportEvent(data.social, {
          type: "local_news",
          headlineKey: fest.mediaKey || fest.id,
          severity: 3,
          createdDay: Math.floor(Date.now() / 86400000)
        });
      }
      // Mirror into world-events instance for shared commands
      mirrorWorldEvent(data, fest, track, day);
    }

    if (track.status === "active") {
      tickActivities(track, fest);
      // Ramadan: evening food demand boost (preference-based participants only)
      if (fest.fastingAware && phaseDay % 2 === 0) {
        applyFestivalDemand(fest, track.completedKeys, `eve_${phaseDay}`);
      }
      const totalLen = (fest.preparationDays || 0) + (fest.durationDays || 1);
      if (phaseDay >= totalLen - (fest.closingDays || 1)) {
        track.status = "closing";
      }
    }

    if (track.status === "closing") {
      const totalLen = (fest.preparationDays || 0) + (fest.durationDays || 1) + (fest.closingDays || 0);
      if (phaseDay >= totalLen) {
        completeFestival(store, data, track, fest, day);
      }
    }
  }

  store.activeFestivals = store.activeFestivals.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  markDirty();
}

function startFestivalTrack(store, data, fest, day) {
  const track = {
    id: `fest_${fest.id}_${day}`,
    festivalId: fest.id,
    name: fest.name,
    status: "scheduled",
    startDay: day,
    settlementId: "settlement_main",
    participantIds: [],
    activityProgress: {},
    completedKeys: {},
    impact: {}
  };
  store.activeFestivals.push(track);
  store.cooldowns[fest.id] = day;
  store.stats.festivalsHeld = (store.stats.festivalsHeld || 0) + 1;
  publish("FESTIVAL_SCHEDULED", {
    source: "culture",
    metadata: { festivalId: fest.id, trackId: track.id }
  });
  Logger.info(`Festival scheduled: ${fest.name}`);
}

function selectFestivalParticipants(data, fest) {
  const ids = Object.keys(data.villagers || {});
  const scored = [];
  for (const id of ids) {
    const v = data.villagers[id];
    if (!v || v.alive === false) continue;
    // Critical health: skip
    if ((v.health ?? 80) < 30) continue;
    const prefs = getOrCreatePrefs(id);
    let personality = {};
    try {
      personality = getPersonality(id) || {};
    } catch {
      /* */
    }
    const score = participationScore(prefs, fest, personality);
    if (score < 35) continue;
    scored.push({ id, score });
  }
  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return scored.slice(0, fest.maxParticipants || 40).map((s) => s.id);
}

function applyHappiness(data, track, fest) {
  const hap = fest.effects?.happiness || 0;
  const stress = fest.effects?.stress || 0;
  if (!data.dailyLife?.states || (!hap && !stress)) return;
  for (const id of track.participantIds.slice(0, 40)) {
    const st = data.dailyLife.states.find((s) => s.villagerId === id);
    if (!st) continue;
    if (hap) st.happiness = Math.max(0, Math.min(100, (st.happiness ?? 50) + Math.max(-10, Math.min(10, hap))));
    if (stress) st.stress = Math.max(0, Math.min(100, (st.stress ?? 20) + Math.max(-10, Math.min(10, stress))));
  }
  track.impact.happinessDelta = hap;
  track.impact.stressDelta = stress;
}

function mirrorWorldEvent(data, fest, track, day) {
  try {
    const we = data.worldEvents;
    if (!we) return;
    const def = festivalToDef(fest);
    const inst = createInstance(def, {
      id: track.id,
      startDay: day,
      source: "culture",
      settlementId: track.settlementId
    });
    inst.status = Lifecycle.ACTIVE;
    inst.participantIds = [...track.participantIds];
    we.instances.push(inst);
  } catch {
    /* optional mirror */
  }
}

function completeFestival(store, data, track, fest, day) {
  track.status = "completed";
  applyFestivalDemand(fest, track.completedKeys, "complete");
  track.impact.attendance = track.participantIds.length;
  track.impact.economicGoods = Object.keys(track.completedKeys).filter((k) => k.includes("demand"));

  store.history.push({
    id: track.id,
    festivalId: fest.id,
    year: data.worldEvents?.calendar?.year || 1,
    settlementId: track.settlementId,
    attendance: track.participantIds.length,
    outcome: "completed",
    impact: { ...track.impact },
    endDay: day
  });
  if (store.history.length > MAX_CULTURE_HISTORY) store.history = store.history.slice(-MAX_CULTURE_HISTORY);

  store.stats.totalAttendance = (store.stats.totalAttendance || 0) + track.participantIds.length;

  publish("FESTIVAL_COMPLETED", {
    source: "culture",
    metadata: { festivalId: fest.id, attendance: track.participantIds.length }
  });
  rememberCivilization("festival_completed", {
    festivalId: fest.id,
    attendance: track.participantIds.length,
    year: data.worldEvents?.calendar?.year
  });
  for (const id of track.participantIds.slice(0, 25)) {
    addCitizenMemory(id, "festival_participated", { festivalId: fest.id });
  }
  if (data.social?.opinion && fest.effects?.opinion) {
    const d = Math.max(-5, Math.min(5, fest.effects.opinion));
    data.social.opinion.communityTrust = Math.max(
      0,
      Math.min(100, (data.social.opinion.communityTrust ?? 50) + d)
    );
  }
}

export function cancelFestival(trackId, reason = "cancelled") {
  const store = getCultureStore();
  const track = store.activeFestivals.find((t) => t.id === trackId);
  if (!track) return { ok: false, error: "not_found" };
  track.status = "cancelled";
  store.stats.cancelled = (store.stats.cancelled || 0) + 1;
  publish("FESTIVAL_CANCELLED", { source: "culture", metadata: { trackId, reason } });
  rememberCivilization("festival_cancelled", { trackId, reason });
  const data = getWorldData();
  if (data.social) {
    reportEvent(data.social, {
      type: "local_news",
      headlineKey: "festival_cancelled",
      severity: 2,
      createdDay: Math.floor(Date.now() / 86400000)
    });
    if (data.social.opinion) {
      data.social.opinion.communityTrust = Math.max(0, (data.social.opinion.communityTrust ?? 50) - 2);
    }
  }
  markDirty();
  return { ok: true };
}

export function listActiveFestivals() {
  return getCultureStore().activeFestivals.filter((t) => t.status === "active" || t.status === "preparation");
}

export function listUpcomingFestivals(calendar) {
  if (!calendar) return [];
  const doy = calendar.dayOfYear;
  return listFestivals()
    .filter((f) => f.dayOfYear >= doy)
    .sort((a, b) => a.dayOfYear - b.dayOfYear)
    .slice(0, 8);
}

export function playerJoinFestival(citizenId, trackId) {
  const track = getCultureStore().activeFestivals.find((t) => t.id === trackId);
  if (!track) return { ok: false, error: "not_found" };
  if (track.status !== "active" && track.status !== "preparation") return { ok: false, error: "not_joinable" };
  if (track.participantIds.includes(citizenId)) return { ok: false, error: "already" };
  if (track.participantIds.length >= 50) return { ok: false, error: "full" };
  track.participantIds.push(citizenId);
  publish("FESTIVAL_PARTICIPATED", {
    source: "culture",
    actorId: citizenId,
    metadata: { trackId, festivalId: track.festivalId }
  });
  markDirty();
  return { ok: true };
}

export function playerLeaveFestival(citizenId, trackId) {
  const track = getCultureStore().activeFestivals.find((t) => t.id === trackId);
  if (!track) return { ok: false, error: "not_found" };
  const i = track.participantIds.indexOf(citizenId);
  if (i < 0) return { ok: false, error: "not_member" };
  track.participantIds.splice(i, 1);
  markDirty();
  return { ok: true };
}

export function cultureStats() {
  const s = getCultureStore();
  return {
    held: s.stats.festivalsHeld || 0,
    attendance: s.stats.totalAttendance || 0,
    cancelled: s.stats.cancelled || 0,
    active: listActiveFestivals().length,
    history: s.history.length
  };
}

export { listFestivals, getFestival };
