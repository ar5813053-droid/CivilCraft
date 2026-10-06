/**
 * Festival add-on adapter — connects optional external content to CivilCraft lifecycle.
 * CivilCraft remains authoritative for scheduling, economy, missions, memory.
 */

import { getAddonMeta } from "./festival-addon-registry.js";
import { detectCapabilities, formatCapabilityStatus } from "./festival-addon-capabilities.js";
import { Logger } from "../../core/logger.js";
import { publish } from "../../events/event-bus.js";

/** @type {Record<string, boolean>} */
const enabledMap = {
  holi: true,
  diwali: true,
  ramadan: true,
  eid: true,
  christmas: true
};

export function setAddonEnabled(festivalId, enabled) {
  if (festivalId in enabledMap) enabledMap[festivalId] = !!enabled;
}

export function isAddonEnabled(festivalId) {
  return enabledMap[festivalId] !== false;
}

/**
 * Activate visual/content layer for a festival phase.
 * Does not schedule the festival — Culture/WorldEvents own that.
 */
export function activateFestivalAddon(festivalId, phase, context = {}) {
  const meta = getAddonMeta(festivalId);
  const caps = detectCapabilities(festivalId, { enabled: isAddonEnabled(festivalId) });

  if (!caps.enabled) {
    return { ok: false, reason: "disabled", caps };
  }

  if (caps.usingFallback) {
    Logger.info(`Festival addon [${festivalId}] phase=${phase}: CivilCraft fallback`);
    publish("FESTIVAL_ADDON_FALLBACK", {
      source: "festival_addon",
      metadata: { festivalId, phase, mode: caps.mode }
    });
    return {
      ok: true,
      mode: "civilcraft_fallback",
      caps,
      // Decor/appearance handled by culture-manager + festival-appearance
      useCivilCraftVisuals: true,
      useExternalVisuals: false
    };
  }

  Logger.info(`Festival addon [${festivalId}] phase=${phase}: external mode`);
  publish("FESTIVAL_ADDON_ACTIVE", {
    source: "festival_addon",
    metadata: { festivalId, phase, mode: caps.mode }
  });

  return {
    ok: true,
    mode: "external_active",
    caps,
    useCivilCraftVisuals: true, // always keep CivilCraft as base
    useExternalVisuals: true,
    meta
  };
}

export function deactivateFestivalAddon(festivalId) {
  publish("FESTIVAL_ADDON_CLEARED", {
    source: "festival_addon",
    metadata: { festivalId }
  });
  return { ok: true };
}

export function getAddonStatus(festivalId) {
  const meta = getAddonMeta(festivalId);
  const caps = detectCapabilities(festivalId, { enabled: isAddonEnabled(festivalId) });
  return {
    meta,
    caps,
    lines: formatCapabilityStatus(caps),
    license: meta
      ? {
          name: meta.name,
          creator: meta.creator,
          source: meta.source,
          license: meta.license,
          redistributionAllowed: meta.redistributionAllowed,
          bundled: meta.bundled,
          integrationMode: meta.integrationMode
        }
      : null
  };
}

export function listAllAddonStatuses() {
  return ["holi", "diwali", "ramadan", "eid", "christmas"].map(getAddonStatus);
}
