/**
 * Capability detection for optional external festival packs.
 * Never crashes if external content is missing.
 */

import { FESTIVAL_ADDON_REGISTRY } from "./festival-addon-registry.js";

/**
 * @typedef {object} FestivalCapabilities
 * @property {string} festivalId
 * @property {boolean} civilcraftFestival
 * @property {boolean} externalInstalled
 * @property {boolean} compatible
 * @property {boolean} enabled
 * @property {boolean} assetsAvailable
 * @property {boolean} behaviorAvailable
 * @property {boolean} resourceAvailable
 * @property {boolean} particlesAvailable
 * @property {boolean} soundsAvailable
 * @property {boolean} decorationsAvailable
 * @property {boolean} usingFallback
 * @property {string} mode
 * @property {string} message
 */

const cache = new Map();

/**
 * Probe whether any known item/block identifier exists (runtime only).
 * @param {string[]} ids
 * @returns {boolean}
 */
export function probeIdentifiers(ids) {
  if (!ids?.length) return false;
  try {
    // Soft probe via world item registry is not available on all API levels.
    // Script API does not expose installed pack list; identifier existence
    // can only be inferred when items are used. Default false without runtime evidence.
    return false;
  } catch {
    return false;
  }
}

/**
 * @param {string} festivalId
 * @param {{ forceExternal?: boolean, enabled?: boolean }} [opts]
 * @returns {FestivalCapabilities}
 */
export function detectCapabilities(festivalId, opts = {}) {
  const cacheKey = `${festivalId}:${opts.forceExternal ? 1 : 0}:${opts.enabled !== false ? 1 : 0}`;
  if (cache.has(cacheKey) && opts.forceExternal == null) {
    return cache.get(cacheKey);
  }

  const meta = FESTIVAL_ADDON_REGISTRY[festivalId];
  const enabled = opts.enabled !== false;

  if (!meta) {
    return {
      festivalId,
      civilcraftFestival: false,
      externalInstalled: false,
      compatible: false,
      enabled: false,
      assetsAvailable: false,
      behaviorAvailable: false,
      resourceAvailable: false,
      particlesAvailable: false,
      soundsAvailable: false,
      decorationsAvailable: false,
      usingFallback: true,
      mode: "unknown",
      message: "Unknown festival integration"
    };
  }

  // Without Bedrock pack enumeration API, externalInstalled is only true if
  // caller marks forceExternal (tests / future pack-list hook).
  const externalInstalled = opts.forceExternal === true || probeIdentifiers(meta.knownIdentifiers);
  const canUseExternal =
    externalInstalled && meta.integrationMode === "optional_external" && meta.redistributionAllowed !== true
      ? true // still usable as external when user installed
      : externalInstalled && meta.integrationMode === "optional_external";

  const usingFallback = !externalInstalled || meta.integrationMode === "civilcraft_only";

  /** @type {FestivalCapabilities} */
  const caps = {
    festivalId,
    civilcraftFestival: true,
    externalInstalled,
    compatible: true,
    enabled,
    assetsAvailable: !usingFallback || true, // CivilCraft assets always available
    behaviorAvailable: true,
    resourceAvailable: true,
    particlesAvailable: !usingFallback,
    soundsAvailable: !usingFallback,
    decorationsAvailable: true,
    usingFallback,
    mode: usingFallback ? "civilcraft_fallback" : "external_active",
    message: usingFallback
      ? `External add-on not installed — CivilCraft ${festivalId} fallback active`
      : `External content detected for ${festivalId}`
  };

  if (!enabled) {
    caps.enabled = false;
    caps.message = `${festivalId} integration disabled`;
  }

  cache.set(cacheKey, caps);
  return caps;
}

export function clearCapabilityCache() {
  cache.clear();
}

export function formatCapabilityStatus(caps) {
  const lines = [
    `${caps.festivalId}`,
    `${caps.civilcraftFestival ? "✓" : "○"} CivilCraft festival`,
    `${caps.externalInstalled ? "✓" : "○"} External content detected`,
    `${caps.decorationsAvailable ? "✓" : "○"} Decorations available`,
    `${caps.assetsAvailable ? "✓" : "○"} Textures available`,
    `${caps.particlesAvailable ? "✓" : "○"} Particles available`,
    `${caps.enabled ? "✓" : "○"} Integration ${caps.enabled ? (caps.usingFallback ? "fallback" : "active") : "disabled"}`,
    caps.message
  ];
  return lines;
}
