/**
 * Memory listens to the Event Bus and records important events only.
 */

import { subscribe } from "../events/event-bus.js";
import { CITIZEN_MEMORY_TYPES, CIV_MEMORY_TYPES } from "../events/event-types.js";
import { addCitizenMemory } from "./citizen-memory.js";
import { addCivilizationMemory } from "./civilization-memory.js";
import { Logger } from "../core/logger.js";

let wired = false;

export function wireMemorySubscriber() {
  if (wired) return;
  wired = true;

  subscribe("*", (_payload, event) => {
    if (!event?.type) return;
    try {
      if (CIV_MEMORY_TYPES.has(event.type)) {
        addCivilizationMemory(event.type, {
          actorId: event.actorId,
          settlementId: event.settlementId,
          nationId: event.nationId,
          ...(event.metadata || {})
        });
      }
      if (CITIZEN_MEMORY_TYPES.has(event.type) && event.actorId) {
        addCitizenMemory(event.actorId, event.type, {
          settlementId: event.settlementId,
          ...(event.metadata || {})
        });
      }
    } catch (e) {
      Logger.warn(`Memory subscriber: ${e}`);
    }
  });

  Logger.info("Memory event-bus subscriber wired.");
}
