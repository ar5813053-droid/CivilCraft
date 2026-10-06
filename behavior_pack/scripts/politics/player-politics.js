/**
 * Player participation in politics — uses existing elections/parties APIs.
 */

import { getPoliticsStore } from "./politics-manager.js";
import { castVote } from "./elections.js";
import { initPreferences } from "./political-preferences.js";
import { markDirty } from "../core/data-store.js";
import { publish } from "../events/event-bus.js";
import { EventType } from "../events/event-types.js";
import { rememberCitizen } from "../memory/memory-manager.js";

export function playerCastVote(playerCitizenId, candidateId = null) {
  const store = getPoliticsStore();
  const election = [...(store.elections || [])].reverse().find((e) => e.status === "voting");
  if (!election) return { ok: false, error: "no_active_vote" };
  if (election.voters && election.voters[playerCitizenId]) {
    return { ok: false, error: "already_voted" };
  }
  if (!store.preferences[playerCitizenId]) {
    store.preferences[playerCitizenId] = initPreferences({ id: playerCitizenId });
  }
  const prefs = store.preferences[playerCitizenId];
  // If candidate specified, bias preferences temporarily
  const r = castVote(election, prefs, store.candidates, store.parties, 50);
  if (r.ok) {
    if (!election.voters) election.voters = {};
    election.voters[playerCitizenId] = true;
    if (candidateId && election.votes) {
      // Soft force: ensure candidate gets at least this vote counted
      election.votes[candidateId] = (election.votes[candidateId] || 0) + 1;
    }
    publish(EventType.PLAYER_CIVIC_CONTRIBUTION || "PLAYER_CIVIC_CONTRIBUTION", {
      source: "politics",
      actorId: playerCitizenId,
      metadata: { action: "vote", electionId: election.id }
    });
    try {
      rememberCitizen(playerCitizenId, "political_participation", { electionId: election.id });
    } catch {
      /* */
    }
    markDirty();
  }
  return r;
}

export function playerJoinParty(playerCitizenId, partyId) {
  const store = getPoliticsStore();
  const party = (store.parties || []).find((p) => p.id === partyId);
  if (!party) return { ok: false, error: "party_not_found" };
  if (!store.memberships) store.memberships = {};
  store.memberships[playerCitizenId] = partyId;
  if (!store.preferences[playerCitizenId]) {
    store.preferences[playerCitizenId] = initPreferences({ id: playerCitizenId });
  }
  markDirty();
  return { ok: true, partyId };
}

export function playerLeaveParty(playerCitizenId) {
  const store = getPoliticsStore();
  if (!store.memberships?.[playerCitizenId]) return { ok: false, error: "not_member" };
  delete store.memberships[playerCitizenId];
  markDirty();
  return { ok: true };
}

export function listElectionInfo() {
  const store = getPoliticsStore();
  const election = [...(store.elections || [])].reverse()[0];
  const parties = store.parties || [];
  const candidates = (store.candidates || []).slice(0, 12);
  return { election, parties, candidates, memberships: store.memberships || {} };
}
