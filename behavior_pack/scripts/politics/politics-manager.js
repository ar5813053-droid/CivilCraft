import { system } from "@minecraft/server";
import { Logger } from "../core/logger.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { createDefaultPolitics, normalizePolitics, ELECTION_TERM_DAYS, CAMPAIGN_DAYS, MAX_POLITICAL_EVENTS } from "./politics-data.js";
import { createElection, startCampaign, countVotes, installWinner, processVoterBatch, registerElectionCandidate } from "./elections.js";
import { initPreferences } from "./political-preferences.js";
import { applyRulingPolicy } from "./policies.js";
import { seedCandidates } from "./candidate-seeding.js";
import { getGovernment } from "../government/leadership.js";
import { reportEvent } from "../social/media.js";
import { publish } from "../events/event-bus.js";
import { EventType } from "../events/event-types.js";

export const POLITICS_INTERVAL_TICKS = 2400;
let initialized = false;

export function initializePolitics() {
  if (initialized) return;
  initialized = true;
  const data = getWorldData();
  data.politics = data.politics ? normalizePolitics(data.politics) : createDefaultPolitics();
  system.runInterval(() => {
    try {
      processPolitics(data);
    } catch (e) {
      Logger.error("Politics tick failed", e);
    }
  }, POLITICS_INTERVAL_TICKS);
  Logger.info("Politics manager initialized.");
}

export function getPoliticsStore() {
  const data = getWorldData();
  if (!data.politics) data.politics = createDefaultPolitics();
  return data.politics;
}

function pushEvent(store, type, message) {
  store.events.push({ type, message, timestamp: Date.now() });
  if (store.events.length > MAX_POLITICAL_EVENTS) store.events = store.events.slice(-MAX_POLITICAL_EVENTS);
}

export function processPolitics(data) {
  const store = data.politics;
  if (!store) return;
  // Prefer CivilCraft calendar; fall back to wall-clock day
  const cal = data.worldEvents?.calendar;
  const day = cal?.totalDays ?? Math.floor(Date.now() / 86400000);
  const doy = cal?.dayOfYear ?? (day % 120);
  const civYear = cal?.year ?? 1;
  const gov = getGovernment();
  if (!gov) return;

  // Auto-seed candidates (bounded)
  const villagerList = Object.values(data.villagers || {});
  seedCandidates(store, villagerList, {});

  let election = [...store.elections].reverse().find((e) => e.status !== "completed");
  if (!election) {
    const termStart = gov.termStartDay ?? day;
    // Fixed annual election window: day-of-year 28–35 (campaign) / voting follows
    const annualWindow = doy >= 28 && doy <= 40;
    if (annualWindow || day - termStart >= ELECTION_TERM_DAYS - CAMPAIGN_DAYS) {
      election = createElection(store, { governmentId: gov.id || data.government?.primaryId, startDay: day });
      startCampaign(election, day);
      for (const c of store.candidates.filter((x) => x.office === "mayor").slice(0, 4)) {
        registerElectionCandidate(election, c.id);
      }
      pushEvent(store, "election_scheduled", election.id);
      publish(EventType.ELECTION_STARTED, { source: "politics", metadata: { electionId: election.id } });
      if (data.social) reportEvent(data.social, { type: "government_notice", headlineKey: "election_announced", severity: 2 });
    }
  }

  if (election?.status === "campaigning" && day >= (election.endDay || 0)) {
    election.status = "voting";
  }

  if (election?.status === "voting") {
    const ids = Object.keys(data.villagers || {});
    for (const id of ids) {
      if (!store.preferences[id]) {
        store.preferences[id] = initPreferences(data.villagers[id], {
          unemployment: (data.employment?.stats?.unemployed || 0) / Math.max(1, ids.length)
        });
      }
    }
    const opinion = data.social?.opinion?.governmentApproval ?? gov.approval ?? 50;
    const result = processVoterBatch(store, ids, store.preferences, opinion, store.voterCursor);
    store.voterCursor = result.cursor;
    // After full pass heuristic: if votes exceed half of villagers, count
    const totalVotes = Object.values(election.votes || {}).reduce((a, b) => a + b, 0);
    if (totalVotes >= Math.max(1, Math.floor(ids.length * 0.5)) || ids.length === 0) {
      const counted = countVotes(election);
      if (counted.winnerId) {
        installWinner(store, election, gov);
        applyRulingPolicy(store, gov, gov.rulingPartyId);
        store.stats.electionsHeld = (store.stats.electionsHeld || 0) + 1;
        pushEvent(store, "election_completed", counted.winnerId);
        publish(EventType.ELECTION_COMPLETED, { source: "politics", metadata: { winnerId: counted.winnerId, electionId: election.id } });
        if (data.social) reportEvent(data.social, { type: "government_notice", headlineKey: "election_result", severity: 3 });
      } else {
        pushEvent(store, "election_no_candidate", election.id);
      }
    }
  }
  markDirty();
}
