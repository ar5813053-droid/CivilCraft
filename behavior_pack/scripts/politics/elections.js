import { MAX_ELECTIONS, ELECTION_TERM_DAYS, CAMPAIGN_DAYS, VOTER_BATCH } from "./politics-data.js";
import { getParty } from "./parties.js";
import { alignmentScore } from "./political-preferences.js";
import { appoint } from "../government/leadership.js";
import { Role } from "../government/government-data.js";
import { markDirty } from "../core/data-store.js";

export function createElection(store, input) {
  const election = {
    id: input.id || `election_${store.elections.length + 1}`,
    governmentId: input.governmentId || "municipal_main",
    office: input.office || "mayor",
    status: "scheduled",
    startDay: input.startDay ?? Math.floor(Date.now() / 86400000),
    endDay: null,
    candidates: [],
    votes: {},
    winnerId: null
  };
  store.elections.push(election);
  if (store.elections.length > MAX_ELECTIONS) store.elections = store.elections.slice(-MAX_ELECTIONS);
  markDirty();
  return election;
}

export function startCampaign(election, day) {
  if (!election || election.status !== "scheduled") return { ok: false };
  election.status = "campaigning";
  election.startDay = day;
  election.endDay = day + CAMPAIGN_DAYS;
  return { ok: true };
}

export function registerElectionCandidate(election, candidateId) {
  if (!election || election.status === "completed") return { ok: false };
  if (election.candidates.includes(candidateId)) return { ok: false, error: "duplicate" };
  election.candidates.push(candidateId);
  election.votes[candidateId] = 0;
  return { ok: true };
}

export function scoreCandidate(prefs, party, candidate, opinionApproval = 50) {
  const align = alignmentScore(prefs, party);
  const popularity = candidate?.popularity ?? 50;
  const gov = Math.round(opinionApproval * 0.2);
  return align + Math.round(popularity * 0.5) + gov;
}

export function castVote(election, prefs, candidates, parties, opinionApproval = 50) {
  if (!election || !["voting", "campaigning", "counting"].includes(election.status)) {
    return { ok: false };
  }
  let bestId = null;
  let bestScore = -1;
  for (const candId of election.candidates) {
    const cand = candidates.find((c) => c.id === candId);
    if (!cand) continue;
    const party = getParty({ parties }, cand.partyId) || parties.find((p) => p.id === cand.partyId);
    const score = scoreCandidate(prefs, party, cand, opinionApproval);
    if (score > bestScore || (score === bestScore && String(candId).localeCompare(String(bestId)) < 0)) {
      bestScore = score;
      bestId = candId;
    }
  }
  if (!bestId) return { ok: false, error: "no_candidate" };
  election.votes[bestId] = (election.votes[bestId] || 0) + 1;
  return { ok: true, candidateId: bestId };
}

export function countVotes(election) {
  if (!election) return { ok: false };
  election.status = "counting";
  let winner = null;
  let maxVotes = -1;
  for (const [candId, votes] of Object.entries(election.votes || {})) {
    const v = votes || 0;
    if (v > maxVotes || (v === maxVotes && String(candId).localeCompare(String(winner || "")) < 0)) {
      maxVotes = v;
      winner = candId;
    }
  }
  election.winnerId = winner;
  election.status = "completed";
  return { ok: true, winnerId: winner, votes: maxVotes };
}

export function installWinner(store, election, government) {
  if (!election?.winnerId) return { ok: false, error: "no_winner" };
  const cand = (store.candidates || []).find((c) => c.id === election.winnerId);
  if (!cand) return { ok: false, error: "missing_candidate" };
  const role = election.office === "deputy_mayor" ? Role.DEPUTY_MAYOR : Role.MAYOR;
  const result = appoint(role, cand.villagerId, election.governmentId);
  if (government) {
    government.rulingPartyId = cand.partyId;
    government.termStartDay = Math.floor(Date.now() / 86400000);
    government.termLengthDays = ELECTION_TERM_DAYS;
  }
  markDirty();
  return { ok: result.ok, partyId: cand.partyId, villagerId: cand.villagerId };
}

export function processVoterBatch(store, voterIds, prefsMap, opinionApproval, startCursor) {
  const election = [...(store.elections || [])].reverse().find((e) => e.status === "voting");
  if (!election || !voterIds.length) return { votes: 0, cursor: startCursor };
  let votes = 0;
  const start = startCursor % voterIds.length;
  for (let i = 0; i < Math.min(VOTER_BATCH, voterIds.length); i++) {
    const id = voterIds[(start + i) % voterIds.length];
    const prefs = prefsMap[id] || { economicPriority: 50, safetyPriority: 50, healthcarePriority: 50, educationPriority: 50, infrastructurePriority: 50, welfarePriority: 50 };
    const r = castVote(election, prefs, store.candidates, store.parties, opinionApproval);
    if (r.ok) votes += 1;
  }
  store.stats.votesCast = (store.stats.votesCast || 0) + votes;
  return { votes, cursor: (start + VOTER_BATCH) % voterIds.length, election };
}
