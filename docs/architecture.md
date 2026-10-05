# CivilCraft Architecture

## Goals

- Production-oriented, modular foundation for a long-lived civilization simulation.
- Safe performance on mobile Bedrock clients.
- Clear boundaries so future phases (economy, government, etc.) plug in without rewriting Phase 1.

## Pack Layout

| Pack | Role |
|------|------|
| `behavior_pack` | Scripts, data, future entity/item definitions |
| `resource_pack` | Textures, UI, localization (minimal in Phase 1) |

Script entry: `behavior_pack/scripts/main.js`.

## Module Boundaries

```
main.js
  │
  ├── core/          # Shared primitives (no domain logic)
  │     constants, logger, utils, data-store
  │
  ├── villagers/     # Identity + entity linkage
  │     villager-identity, villager-registry, villager-manager
  │
  ├── jobs/          # Profession definitions (extensible)
  │     job-registry + jobs/*
  │
  ├── schedules/     # Time-of-day activity resolution
  │     default-schedule, schedule-manager
  │
  ├── families/      # Household membership
  │     household-manager
  │
  └── simulation/    # Orchestration & village aggregates
        simulation-manager, village-data
```

### Data ownership

| Concern | Owner | Storage |
|---------|-------|---------|
| Villager identity fields | `villager-registry` | World dynamic property blob |
| Entity ↔ identity link | `villager-manager` | Entity dynamic property + tag |
| Job definitions | `job-registry` | In-memory (code) |
| Schedule templates | `schedule-manager` | In-memory (code) |
| Households | `household-manager` | World data blob |
| Village aggregates | `village-data` / simulation | World data blob |

Entities never hold the full identity record. They store only `civilcraft:villager_id`. This keeps entity memory small and survives unload/reload cleanly.

## Simulation tiers

1. **Active** — villagers within `ACTIVE_SIMULATION_RADIUS` of any player.  
   Schedule evaluation runs here.
2. **Lightweight** — registered identities farther away or unloaded.  
   Data remains in the world store; no per-tick work.
3. **Background civilization** — reserved for later phases (chunk-independent economic/political ticks).

## Performance rules

- Intervals measured in tens–hundreds of ticks, not every tick.
- Entity queries always distance-limited and type-filtered.
- No recursive world scans.
- World JSON blob kept deliberately small in Phase 1; future phases may shard by village/region.

## Extension points

| Future need | Hook |
|-------------|------|
| New job | `registerJob()` + optional schedule id |
| Per-job schedule | `registerSchedule(id, entries)` then set `job.scheduleId` |
| Needs / AI behaviors | React to `currentActivity` changes inside simulation tick |
| Economy | Add fields to `VillagerRecord` / village stats; new module under `economy/` |
| Government | New module; village data already has placeholder aggregate slots |

## Script API surface (Phase 1)

- `@minecraft/server` stable track (`1.17.0` dependency declared)
- `world` dynamic properties
- `entity` dynamic properties & tags
- `system.runInterval`
- `world.afterEvents.entitySpawn` (+ `entityLoad` when present)
- `world.beforeEvents.chatSend` (debug only)
- Bounded `dimension.getEntities`

No beta modules are required.

## Persistence format

Single world dynamic property key: `civilcraft:world_data`

```json
{
  "version": 1,
  "villagers": { "<id>": { /* VillagerRecord */ } },
  "households": { "<id>": { /* HouseholdRecord */ } },
  "villages": { "<id>": { /* VillageData */ } },
  "managedEntityIds": []
}
```

Version field exists for future migrations.
