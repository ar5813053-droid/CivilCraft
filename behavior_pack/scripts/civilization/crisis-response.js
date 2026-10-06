/**
 * Bounded crisis responses using existing government/economy APIs.
 */
import { subscribe } from "../events/event-bus.js";
import { getWorldData, markDirty } from "../core/data-store.js";
import { rememberCivilization } from "../memory/memory-manager.js";
import { reportEvent } from "../social/media.js";
import { Logger } from "../core/logger.js";

let wired = false;

export function wireCrisisResponses() {
  if (wired) return;
  wired = true;

  subscribe("FOOD_SHORTAGE", (payload) => {
    try {
      const data = getWorldData();
      const gov = data.government;
      if (!gov) return;
      // Reduce approval slightly; record crisis response intent
      if (typeof gov.approval === "number") {
        gov.approval = Math.max(0, gov.approval - 2);
      }
      if (data.social?.opinion) {
        data.social.opinion.governmentApproval = Math.max(
          0,
          (data.social.opinion.governmentApproval ?? 50) - 2
        );
      }
      rememberCivilization("food_crisis_response", payload || {});
      if (data.social) {
        reportEvent(data.social, {
          type: "government_notice",
          headlineKey: "government_addresses_food_shortage",
          severity: 3,
          createdDay: Math.floor(Date.now() / 86400000)
        });
      }
      markDirty();
    } catch (e) {
      Logger.warn(`Crisis response: ${e}`);
    }
  });

  Logger.info("Crisis response handlers wired.");
}
