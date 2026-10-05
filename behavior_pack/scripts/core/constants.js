/**
 * CivilCraft core constants.
 * Central place for tunable values used across systems.
 */

/** Ticks per Minecraft day (24000). */
export const TICKS_PER_DAY = 24000;

/** Approximate real-time seconds per Minecraft day. */
export const SECONDS_PER_DAY = 1200;

/** How often the simulation manager evaluates nearby villagers (ticks). */
export const SIMULATION_INTERVAL_TICKS = 40; // 2 seconds

/** How often schedule evaluation runs for active villagers (ticks). */
export const SCHEDULE_INTERVAL_TICKS = 100; // 5 seconds

/** Distance (blocks) within which villagers are actively simulated. */
export const ACTIVE_SIMULATION_RADIUS = 64;

/** Distance beyond which villagers enter lightweight mode. */
export const LIGHTWEIGHT_SIMULATION_RADIUS = 128;

/** World dynamic property key for civilization data blob. */
export const WORLD_DATA_KEY = "civilcraft:world_data";

/** Entity dynamic property key linking an entity to a CivilCraft villager ID. */
export const ENTITY_VILLAGER_ID_KEY = "civilcraft:villager_id";

/** Tag applied to managed CivilCraft villagers. */
export const MANAGED_VILLAGER_TAG = "civilcraft:managed";

/** Debug flag — set true only during development. */
export const DEBUG = true;

/** Default job identifier when none is assigned. */
export const DEFAULT_JOB_ID = "citizen";

/** Phase identifier for future migration logic. */
export const PHASE = 10;

/** How often the economy simulation runs (ticks). ~15s */
export const ECONOMY_INTERVAL_TICKS = 300;

/** How often government collection/stats run (ticks). ~30s */
export const GOVERNMENT_INTERVAL_TICKS = 600;
