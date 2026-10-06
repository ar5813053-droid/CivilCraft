/**
 * Generate real player missions from festival state via existing player-jobs API shape.
 */

import { createMission } from "../playerjobs/job-missions.js";
import { getPlayerJobsStore } from "../playerjobs/player-job-manager.js";
import { markDirty } from "../core/data-store.js";
import { Logger } from "../core/logger.js";

const HINT_TO_TYPE = {
  deliver_gifts: "delivery",
  deliver_supplies: "delivery",
  food_delivery: "delivery",
  market_work: "shop_restock",
  decorate: "construction",
  community_support: "civic",
  charity: "civic",
  gathering_prep: "civic",
  cleanup: "civic",
  evening_market: "shop_restock"
};

/**
 * When festival enters preparation/active, offer missions to employed players.
 */
export function generateFestivalMissions(data, festival, track, phase = "active") {
  const store = data.playerJobs;
  if (!store || !festival) return [];
  const created = [];
  const players = Object.values(data.players?.profiles || {});
  const hints = festival.missionHints || ["community_support"];
  for (const profile of players) {
    if (!profile?.id) continue;
    // Cap missions per player
    const existing = (store.missions || []).filter(
      (m) => m.playerId === profile.id && m.status !== "completed" && m.status !== "cancelled"
    );
    if (existing.length >= 3) continue;
    const hint = hints[created.length % hints.length];
    const type = HINT_TO_TYPE[hint] || "civic";
    try {
      const m = createMission({
        playerId: profile.id,
        jobId: profile.jobId || "citizen",
        type,
        titleKey: `festival_${festival.id}_${hint}`,
        reward: phase === "prep" ? 8 : 12,
        objectives: { festivalId: festival.id, trackId: track.id, action: hint },
        dayStamp: Math.floor(Date.now() / 86400000)
      });
      if (!store.missions) store.missions = [];
      store.missions.push(m);
      created.push(m);
    } catch (e) {
      Logger.warn(`Festival mission: ${e}`);
    }
  }
  if (created.length) markDirty();
  return created;
}
