/**
 * Hooks Culture festival phase transitions to addon adapters.
 */

import { activateFestivalAddon, deactivateFestivalAddon } from "./festival-addon-adapter.js";

export function onFestivalPhase(festivalId, phase, context = {}) {
  if (phase === "completed" || phase === "cancelled" || phase === "closing") {
    if (phase === "completed" || phase === "cancelled") {
      deactivateFestivalAddon(festivalId);
    }
    return activateFestivalAddon(festivalId, phase, context);
  }
  return activateFestivalAddon(festivalId, phase, context);
}
