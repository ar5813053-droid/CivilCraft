/**
 * Apply real bounded effects via existing system APIs.
 * Idempotent via instance.completedEffects keys.
 */

import { recordDemand } from "../economy/prices.js";
import { reportEvent } from "../social/media.js";
import { publish } from "../events/event-bus.js";
import { EventType } from "../events/event-types.js";
import { rememberCivilization } from "../memory/memory-manager.js";
import { addCitizenMemory } from "../memory/citizen-memory.js";
import { Logger } from "../core/logger.js";

function mark(instance, key) {
  if (!instance.completedEffects) instance.completedEffects = {};
  if (instance.completedEffects[key]) return false;
  instance.completedEffects[key] = true;
  return true;
}

/**
 * Apply definition effects once when event becomes ACTIVE or COMPLETED.
 */
export function applyEventEffects(instance, def, data, phase = "active") {
  if (!instance || !def) return { ok: false, applied: [] };
  const applied = [];
  const effects = def.effects || {};
  const keyPrefix = `${phase}_`;

  try {
    if (effects.demandBread && mark(instance, keyPrefix + "demandBread")) {
      recordDemand("bread", effects.demandBread);
      applied.push("demandBread");
    }
    if (effects.demandWheat && mark(instance, keyPrefix + "demandWheat")) {
      recordDemand("wheat", effects.demandWheat);
      applied.push("demandWheat");
    }
  } catch (e) {
    Logger.warn(`Event economy effect failed: ${e}`);
  }

  try {
    if (effects.happiness && mark(instance, keyPrefix + "happiness") && data.dailyLife?.states) {
      const delta = Math.max(-10, Math.min(10, effects.happiness));
      for (const id of instance.participantIds.slice(0, 40)) {
        const st = data.dailyLife.states.find((s) => s.villagerId === id);
        if (st) {
          st.happiness = Math.max(0, Math.min(100, (st.happiness ?? 50) + delta));
          if (effects.stress) {
            st.stress = Math.max(0, Math.min(100, (st.stress ?? 20) + Math.max(-10, Math.min(10, effects.stress))));
          }
        }
      }
      applied.push("happiness");
    }
  } catch (e) {
    Logger.warn(`Event happiness effect failed: ${e}`);
  }

  try {
    if (effects.opinion != null && mark(instance, keyPrefix + "opinion") && data.social?.opinion) {
      const o = data.social.opinion;
      const d = Math.max(-5, Math.min(5, effects.opinion));
      o.governmentApproval = Math.max(0, Math.min(100, (o.governmentApproval ?? 50) + d));
      o.communityTrust = Math.max(0, Math.min(100, (o.communityTrust ?? 50) + Math.round(d / 2)));
      applied.push("opinion");
    }
  } catch (e) {
    Logger.warn(`Event opinion effect failed: ${e}`);
  }

  try {
    if (mark(instance, keyPrefix + "media") && data.social) {
      reportEvent(data.social, {
        type: "local_news",
        headlineKey: def.name || instance.type,
        severity: instance.importance === "major" ? 3 : 2,
        createdDay: Math.floor(Date.now() / 86400000)
      });
      applied.push("media");
    }
  } catch (e) {
    Logger.warn(`Event media failed: ${e}`);
  }

  try {
    if (mark(instance, keyPrefix + "memory")) {
      rememberCivilization(instance.type, {
        eventId: instance.id,
        category: def.category,
        participants: instance.participantIds.length
      });
      for (const id of instance.participantIds.slice(0, 20)) {
        addCitizenMemory(id, "event_participated", { eventId: instance.id, type: instance.type });
      }
      applied.push("memory");
    }
  } catch (e) {
    Logger.warn(`Event memory failed: ${e}`);
  }

  try {
    if (mark(instance, keyPrefix + "bus")) {
      publish(EventType.EVENT_COMPLETED, {
        source: "worldevents",
        actorId: instance.organizerId,
        settlementId: instance.settlementId,
        metadata: {
          eventId: instance.id,
          type: instance.type,
          category: def.category,
          participants: instance.participantIds.length,
          phase
        }
      });
      applied.push("event_bus");
    }
  } catch (e) {
    Logger.warn(`Event bus publish failed: ${e}`);
  }

  return { ok: true, applied };
}
