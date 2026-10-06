/**
 * Registry of optional external festival content providers.
 *
 * CivilCraft never bundles copyrighted third-party packs.
 * Entries document known optional packs the user may install separately.
 * Capabilities are detected at runtime when possible; otherwise fallback.
 */

/**
 * @typedef {object} FestivalAddonMeta
 * @property {string} festivalId
 * @property {string} name
 * @property {string} creator
 * @property {string} source
 * @property {string} license
 * @property {boolean} redistributionAllowed
 * @property {boolean} bundled
 * @property {string} integrationMode  "optional_external" | "civilcraft_only" | "licensed_asset"
 * @property {string[]} knownIdentifiers  item/block/entity ids to probe if installed
 * @property {string[]} knownPackNameHints
 * @property {string} notes
 */

/** @type {Record<string, FestivalAddonMeta>} */
export const FESTIVAL_ADDON_REGISTRY = Object.freeze({
  holi: {
    festivalId: "holi",
    name: "Holi Festival+ (optional external)",
    creator: "Racing Raftaar",
    source: "https://www.curseforge.com/minecraft-bedrock/addons/holi-festival-addon-color-balls-custom-world",
    license: "Free use; redistribution/reposting prohibited by author terms",
    redistributionAllowed: false,
    bundled: false,
    integrationMode: "optional_external",
    knownIdentifiers: [
      // Best-effort probes — actual ids depend on external pack; safe no-ops if missing
      "racingraftaar:color_ball",
      "holi:color_ball",
      "holi:rangoli"
    ],
    knownPackNameHints: ["Holi Festival", "Holi Festival+"],
    notes: "Do not bundle. User installs separately. CivilCraft falls back to own Holi visuals."
  },
  diwali: {
    festivalId: "diwali",
    name: "Diwali content (Marketplace / third-party)",
    creator: "Various (e.g. Entity Builds Marketplace)",
    source: "Minecraft Marketplace / third-party",
    license: "Marketplace / proprietary — not redistributable",
    redistributionAllowed: false,
    bundled: false,
    integrationMode: "optional_external",
    knownIdentifiers: ["diwali:diya", "entitybuilds:diya"],
    knownPackNameHints: ["Diwali"],
    notes: "Cannot legally bundle Marketplace assets. Optional external only."
  },
  ramadan: {
    festivalId: "ramadan",
    name: "Ramadan (CivilCraft native + optional external)",
    creator: "CivilCraft",
    source: "CivilCraft culture module",
    license: "MIT (CivilCraft)",
    redistributionAllowed: true,
    bundled: false,
    integrationMode: "civilcraft_only",
    knownIdentifiers: [],
    knownPackNameHints: [],
    notes: "No verified redistributable Bedrock Ramadan pack registered. Use CivilCraft fallback."
  },
  eid: {
    festivalId: "eid",
    name: "Eid (CivilCraft native + optional external)",
    creator: "CivilCraft",
    source: "CivilCraft culture module",
    license: "MIT (CivilCraft)",
    redistributionAllowed: true,
    bundled: false,
    integrationMode: "civilcraft_only",
    knownIdentifiers: [],
    knownPackNameHints: [],
    notes: "No verified redistributable Bedrock Eid pack registered. Use CivilCraft fallback."
  },
  christmas: {
    festivalId: "christmas",
    name: "Christmas (CivilCraft + optional CC0 chests pack)",
    creator: "CivilCraft; optional TheAlienDoctor xmas-chests-mcbe",
    source: "https://github.com/TheAlienDoctor/xmas-chests-mcbe",
    license: "CivilCraft MIT; optional external CC0-1.0 for Christmas chests RP only",
    redistributionAllowed: false,
    bundled: false,
    integrationMode: "optional_external",
    knownIdentifiers: [],
    knownPackNameHints: ["xmas-chests", "Christmas Chests"],
    notes:
      "CC0 Christmas chest textures may be installed by user as separate RP. Not bundled by default to keep CivilCraft self-contained."
  }
});

export function getAddonMeta(festivalId) {
  return FESTIVAL_ADDON_REGISTRY[festivalId] || null;
}

export function listAddonMetas() {
  return Object.values(FESTIVAL_ADDON_REGISTRY);
}
