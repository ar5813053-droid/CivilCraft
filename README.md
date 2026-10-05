# CivilCraft

**Deep, realistic Villager civilization simulation for Minecraft Bedrock Edition.**

CivilCraft turns vanilla villagers into persistent citizens with identities, jobs, households, daily schedules, and the foundations of a living civilization.

> **Current status:** Phase 1 — Living Village (foundation)  
> Version: `1.0.0`  
> Target: Minecraft Bedrock 1.21+

---

## Phase 1 Features

| System | Status | Notes |
|--------|--------|-------|
| Villager identity | ✅ | Unique ID, name, age, profession, home, workplace, money, health, hunger, happiness, activity, schedule |
| Job system | ✅ | Farmer, Worker, Trader, Builder, Citizen — extensible registry |
| Daily schedules | ✅ | 06:00–22:00 default cycle; modular for per-job schedules later |
| Households / families | ✅ | Household ID, members, shared home — no reproduction yet |
| Simulation manager | ✅ | Active (near player) + lightweight identity persistence |
| Village data model | ✅ | Population, job counts, happiness aggregates |
| Persistence | ✅ | World dynamic properties |
| Debug commands | ✅ | `!cc` chat commands (when DEBUG is enabled) |

**Not in Phase 1:** economy, government, police, courts, military, politics, multi-nation diplomacy, or mass entity spawning.

---

## Installation

1. Download or clone this repository.
2. Copy `behavior_pack` into your world's `behavior_packs` folder (or the global `development_behavior_packs` folder).
3. Copy `resource_pack` into `resource_packs` / `development_resource_packs`.
4. Create or open a world → **Behavior Packs** → activate **CivilCraft Behavior Pack**.
5. Activate the matching **CivilCraft Resource Pack**.
6. Ensure the world is running Minecraft Bedrock **1.21** or newer.
7. (Optional) Enable content log for debugging.

No experimental gameplay toggles are required for Phase 1 stable APIs.

---

## Development Commands

When `DEBUG` is `true` in `scripts/core/constants.js`:

| Command | Description |
|---------|-------------|
| `!cc help` | List commands |
| `!cc status` | Population / village snapshot |
| `!cc manage` | Adopt nearby vanilla villagers into CivilCraft |
| `!cc population` | Registered villager count |
| `!cc jobs` | List registered jobs |
| `!cc list` | Show up to 10 managed villagers |
| `!cc village` | Dump default village data |
| `!cc save` | Force-save world data |

---

## Architecture

```
behavior_pack/scripts/
├── main.js                 # Entry point, events, debug commands
├── core/                   # Constants, logging, utils, data store
├── villagers/              # Identity, registry, entity bridge
├── jobs/                   # Extensible job registry + Phase 1 jobs
├── schedules/              # Schedule templates & evaluation
├── families/               # Household data model
└── simulation/             # Active/lightweight simulation & village stats
```

See [docs/architecture.md](docs/architecture.md) for design decisions and [docs/roadmap.md](docs/roadmap.md) for the full phase plan.

---

## Performance Principles

- No whole-world entity scans every tick.
- Bounded `getEntities` queries around players only.
- Schedule evaluation on a multi-second interval.
- World data persisted infrequently.
- Identity stored in a compact world-level blob; entities hold only a link.

---

## Planned Systems (summary)

1. Living Village ← *you are here*  
2. Economy  
3. Government  
4. Laws & Justice  
5. Police & Emergency  
6. Healthcare & Education  
7. Cities & Infrastructure  
8. Military  
9. Politics & Elections  
10. Multiple Nations & Diplomacy  
11. Media & Dynamic Events  
12. Advanced Civilization Simulation  

---

## License

MIT — see [LICENSE](LICENSE).

Repository: https://github.com/ar5813053-droid/CivilCraft
