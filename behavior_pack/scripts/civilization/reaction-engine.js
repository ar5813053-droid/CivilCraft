/**
 * Cross-system reactions to published civilization events.
 */

import { subscribe } from "../events/event-bus.js";
import { rememberCivilization } from "../memory/memory-manager.js";
import { recordDemand } from "../economy/prices.js";
import { Logger } from "../core/logger.js";

let wired = false;

export function wireCivilizationReactions() {
  if (wired) return;
  wired = true;

  subscribe("FOOD_SHORTAGE", () => {
    try {
      recordDemand("bread", 8);
      recordDemand("wheat", 5);
      rememberCivilization("food_shortage", { severity: "major" });
    } catch (e) {
      Logger.warn(`FOOD_SHORTAGE reaction: ${e}`);
    }
  });

  subscribe("FESTIVAL_STARTED", (payload) => {
    try {
      recordDemand("bread", 3);
      rememberCivilization("festival", payload || {});
    } catch {
      /* ignore */
    }
  });

  subscribe("EVENT_COMPLETED", (payload) => {
    rememberCivilization("event_completed", payload || {});
  });

  subscribe("ELECTION_COMPLETED", (payload) => {
    rememberCivilization("election", payload || {});
  });

  Logger.info("Civilization reaction engine wired.");
}
