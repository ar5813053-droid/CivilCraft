/**
 * Culture / festivals — schedules through World Events, effects via Economy & Daily Life.
 * Does not own calendar clock, money, or employment assignment.
 */

import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultCulture, normalizeCulture, MAX_CULTURE_HISTORY, MAX_COMPLETED_OCCURRENCES } from "./culture-data.js";
import { listFestivals, getFestival } from "./festival-registry.js";
import { generateCulturalPreferences, participationScore } from "./cultural-preferences.js";
import { applyFestivalDemand } from "./festival-economy.js";
import { tickActivities } from "./festival-activities.js";
import { getPersonality } from "../citizenai/citizen-ai-manager.js";
import { createInstance, Lifecycle } from "../worldevents/event-instances.js";
import { publish } from "../events/event-bus.js";
import { rememberCivilization } from "../memory/memory-manager.js";
import { addCitizenMemory } from "../memory/citizen-memory.js";
import { reportEvent } from "../social/media.js";
import { createDecorationStore, planDecorations, placeDecorationBatch, cleanupFestivalDecorations } from "./festival-decorations.js";
import { generateFestivalMissions } from "./festival-missions.js";
import { publish as busPublish } from "../events/event-bus.js";
import { onFestivalPhase } from "./integrations/festival-addon-lifecycle.js";
import {
  FIXED_ANNUAL_SCHEDULE,
  getScheduleEntry,
  occurrenceKey,
  prepStartTotalDay,
  activeStartTotalDay,
  phaseForTotalDay,
  listUpcomingFromCalendar
} from "./festival-calendar.js";
import { MAX_COMPLETED_OCCURRENCES } from "./culture-data.js";

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
  if (!data.culture.decorations) data.culture.decorations = createDecorationStore();
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
  if (!store.completedOccurrences) store.completedOccurrences = {};

  const day = we.calendar.totalDays;
  const year = we.calendar.year || 1;

  // Fixed annual schedule: start/restore tracks by civilization year + dayOfYear
  for (const entry of FIXED_ANNUAL_SCHEDULE) {
    const fest = getFestival(entry.festivalId);
    if (!fest) continue;
    const key = occurrenceKey(entry.festivalId, year);
    if (store.completedOccurrences[key]) continue;

    const phase = phaseForTotalDay(day, year, entry);
    if (!phase) continue;

    let track = store.activeFestivals.find(
      (a) => a.festivalId === entry.festivalId && a.civilizationYear === year
    );
    if (!track) {
      track = startFestivalTrack(store, data, fest, entry, year, day, phase);
    } else {
      // Reload mid-window: snap phase forward if needed (never backward from completed)
      if (track.status !== phase && track.status !== "completed" && track.status !== "cancelled") {
        syncTrackPhase(store, data, track, fest, entry, phase, day);
      }
    }
  }

  // Advance active tracks by absolute calendar
  for (const track of store.activeFestivals) {
    const fest = getFestival(track.festivalId);
    const entry = getScheduleEntry(track.festivalId);
    if (!fest || !entry) continue;
    const y = track.civilizationYear || year;
    const phase = phaseForTotalDay(day, y, entry);

    if (!phase && track.status !== "completed" && track.status !== "cancelled") {
      // Past end window → complete
      if (day > (track.scheduledEndDay ?? day)) {
        completeFestival(store, data, track, fest, day);
      }
      continue;
    }

    if (phase === "preparation" && track.status === "scheduled") {
      enterPreparation(store, data, track, fest, day);
    } else if (phase === "active" && (track.status === "scheduled" || track.status === "preparation")) {
      if (track.status === "scheduled") enterPreparation(store, data, track, fest, day);
      enterActive(store, data, track, fest, day);
    } else if (phase === "closing" && track.status === "active") {
      track.status = "closing";
    } else if (phase === "closing" && track.status === "closing") {
      // wait until past close window
      const closeEnd =
        activeStartTotalDay(y, entry) + (entry.durationDays || 1) + (entry.closingDays || 0) - 1;
      if (day >= closeEnd) completeFestival(store, data, track, fest, day);
    } else if (track.status === "active") {
      tickActivities(track, fest);
      if (fest.fastingAware && day % 2 === 0) {
        applyFestivalDemand(fest, track.completedKeys, `eve_${day}`);
      }
    } else if (track.status === "closing") {
      const closeEnd =
        activeStartTotalDay(y, entry) + (entry.durationDays || 1) + (entry.closingDays || 0) - 1;
      if (day >= closeEnd) completeFestival(store, data, track, fest, day);
    }
  }

  store.activeFestivals = store.activeFestivals.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled"
  );
  markDirty();
}

function startFestivalTrack(store, data, fest, entry, year, day, initialPhase) {
  const prepStart = prepStartTotalDay(year, entry);
  const activeStart = activeStartTotalDay(year, entry);
  const endDay =
    activeStart + (entry.durationDays || 1) + (entry.closingDays || 0) - 1;
  const track = {
    id: `fest_${fest.id}_y${year}`,
    festivalId: fest.id,
    name: fest.name,
    status: "scheduled",
    civilizationYear: year,
    occurrenceKey: occurrenceKey(fest.id, year),
    startDay: prepStart,
    scheduledStartDay: activeStart,
    scheduledEndDay: endDay,
    settlementId: "settlement_main",
    participantIds: [],
    activityProgress: {},
    completedKeys: {},
    impact: {}
  };
  store.activeFestivals.push(track);
  store.stats.festivalsHeld = (store.stats.festivalsHeld || 0) + 1;
  publish("FESTIVAL_SCHEDULED", {
    source: "culture",
    metadata: { festivalId: fest.id, trackId: track.id, year }
  });
  Logger.info(`Festival scheduled: ${fest.name} year ${year}`);

  if (initialPhase === "preparation") enterPreparation(store, data, track, fest, day);
  else if (initialPhase === "active") {
    enterPreparation(store, data, track, fest, day);
    enterActive(store, data, track, fest, day);
  } else if (initialPhase === "closing") {
    enterPreparation(store, data, track, fest, day);
    enterActive(store, data, track, fest, day);
    track.status = "closing";
  }
  return track;
}

function syncTrackPhase(store, data, track, fest, entry, phase, day) {
  if (phase === "preparation" && track.status === "scheduled") {
    enterPreparation(store, data, track, fest, day);
  } else if (phase === "active" && track.status !== "active") {
    if (track.status === "scheduled") enterPreparation(store, data, track, fest, day);
    if (track.status === "preparation") enterActive(store, data, track, fest, day);
  } else if (phase === "closing" && track.status === "active") {
    track.status = "closing";
  }
}

function enterPreparation(store, data, track, fest, day) {
  if (track.status === "preparation" || track.status === "active" || track.status === "closing") return;
  track.status = "preparation";
  try {
    onFestivalPhase(fest.id, "preparation", { trackId: track.id });
  } catch {
    /* */
  }
  publish("FESTIVAL_PREPARATION_STARTED", {
    source: "culture",
    metadata: { festivalId: fest.id, trackId: track.id, year: track.civilizationYear }
  });
  applyFestivalDemand(fest, track.completedKeys, "prep");
  try {
    generateFestivalMissions(data, fest, track, "prep");
  } catch {
    /* */
  }
  if (data.social) {
    reportEvent(data.social, {
      type: "local_news",
      headlineKey: `${fest.mediaKey || fest.id}_upcoming`,
      severity: 2,
      createdDay: Math.floor(Date.now() / 86400000)
    });
  }
}

function enterActive(store, data, track, fest, day) {
  if (track.status === "active" || track.status === "closing") return;
  track.status = "active";
  track.participantIds = selectFestivalParticipants(data, fest);
  applyFestivalDemand(fest, track.completedKeys, "active");
  applyHappiness(data, track, fest);
  try {
    generateFestivalMissions(data, fest, track, "active");
    const center = data.settlements?.settlements?.settlement_main?.center || { x: 0, y: 64, z: 0 };
    if (!data.culture.decorations) data.culture.decorations = createDecorationStore();
    const planned = planDecorations(data.culture.decorations, fest.id, center);
    placeDecorationBatch(data.culture.decorations, planned);
    busPublish("FESTIVAL_VISUALS_STARTED", { source: "culture", metadata: { festivalId: fest.id } });
    try {
      onFestivalPhase(fest.id, "active", { trackId: track.id });
    } catch {
      /* */
    }
  } catch (e) {
    Logger.warn(`Festival visuals: ${e}`);
  }
  publish("FESTIVAL_STARTED", {
    source: "culture",
    metadata: {
      festivalId: fest.id,
      participants: track.participantIds.length,
      year: track.civilizationYear
    }
  });
  if (data.social) {
    reportEvent(data.social, {
      type: "local_news",
      headlineKey: fest.mediaKey || fest.id,
      severity: 3,
      createdDay: Math.floor(Date.now() / 86400000)
    });
  }
  mirrorWorldEvent(data, fest, track, day);
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
  try {
    if (data.culture.decorations) {
      cleanupFestivalDecorations(data.culture.decorations, fest.id);
      busPublish("FESTIVAL_VISUALS_CLEARED", { source: "culture", metadata: { festivalId: fest.id } });
      try {
        onFestivalPhase(fest.id, "completed", { trackId: track.id });
      } catch {
        /* */
      }
    }
    generateFestivalMissions(data, fest, track, "cleanup");
  } catch (e) {
    Logger.warn(`Festival cleanup: ${e}`);
  }
  track.impact.attendance = track.participantIds.length;
  track.impact.economicGoods = Object.keys(track.completedKeys).filter((k) => k.includes("demand"));

  const year = track.civilizationYear || data.worldEvents?.calendar?.year || 1;
  const key = track.occurrenceKey || occurrenceKey(fest.id, year);
  if (!store.completedOccurrences) store.completedOccurrences = {};
  store.completedOccurrences[key] = true;
  // Bound completed map
  const keys = Object.keys(store.completedOccurrences);
  if (keys.length > MAX_COMPLETED_OCCURRENCES) {
    for (const k of keys.slice(0, keys.length - MAX_COMPLETED_OCCURRENCES)) {
      delete store.completedOccurrences[k];
    }
  }

  store.history.push({
    id: track.id,
    festivalId: fest.id,
    year,
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
    metadata: { festivalId: fest.id, attendance: track.participantIds.length, year }
  });
  rememberCivilization("festival_completed", {
    festivalId: fest.id,
    attendance: track.participantIds.length,
    year
  });
  for (const id of track.participantIds.slice(0, 25)) {
    addCitizenMemory(id, "festival_participated", { festivalId: fest.id, year });
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
  return listUpcomingFromCalendar(calendar, 8);
}

/** Rich calendar lines for !cc calendar */
export function festivalCalendarLines(calendar) {
  if (!calendar) return ["Calendar unavailable"];
  const lines = [
    `CivilCraft Year ${calendar.year}`,
    `Day ${calendar.dayOfYear} / 120 · ${calendar.season || ""} · ${calendar.weekday || ""}`
  ];
  const active = listActiveFestivals();
  if (active.length) {
    for (const t of active) {
      const entry = getScheduleEntry(t.festivalId);
      const dayNum =
        entry && t.status === "active"
          ? Math.max(1, (calendar.totalDays || 0) - activeStartTotalDay(t.civilizationYear || calendar.year, entry) + 1)
          : 0;
      const dur = entry?.durationDays || 1;
      lines.push(
        `Active: ${t.name || t.festivalId} (${t.status})${t.status === "active" ? ` Day ${dayNum}/${dur}` : ""}`
      );
    }
  } else {
    lines.push("Active Festival: none");
  }
  const upcoming = listUpcomingFromCalendar(calendar, 5);
  if (upcoming.length) {
    lines.push("Upcoming:");
    for (const u of upcoming) {
      lines.push(
        `  ${u.name} — Day ${u.startDayOfYear} (prep ${u.preparationDayOfYear})${u.year > calendar.year ? " next year" : ""}`
      );
    }
  }
  return lines;
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
