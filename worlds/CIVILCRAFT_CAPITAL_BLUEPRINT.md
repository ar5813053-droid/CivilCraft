# CivilCraft Capital — Settlement Blueprint

Original CivilCraft layout for a large playable civilization (not a third-party map).

This repository does **not** ship a binary `.mcworld` (Bedrock world archives are large and environment-specific). Instead:

1. Load any Flat or default world with **CivilCraft Behavior + Resource packs** enabled.
2. Use `!cc settle build` (if available) or follow this coordinate plan to place districts around spawn.
3. Simulation systems bind facilities to settlement records automatically when centers are registered.

## Layout (relative to spawn / settlement_main center)

| District | Relative coords | Contents |
|----------|-----------------|----------|
| Public square | 0,0 | Well, festival poles, market stalls |
| Government | +20,0 | Town hall, bank |
| Residential N | 0,+30 | 8–12 house plots |
| Residential S | 0,−30 | 8–12 house plots |
| Farm belt | −40,0 | Wheat/farm pads |
| Market | +15,+15 | Shops, trader stalls |
| School | −15,+20 | School marker |
| Clinic | −15,−20 | Clinic marker |
| Police / emergency | +25,−15 | Station markers |
| Logistics | +40,+10 | Warehouse pads |
| Festival field | +10,+40 | Open area for decorations |
| Expansion | ±80 | Empty space for growth |

## In-game bootstrap

CivilCraft stores settlement centers in persistence. The default `settlement_main` center is used for festival decorations and facility references. Players build the physical city; the simulation tracks jobs, economy, and events.

Creator: **ItsZack95** — original design, not copied from Marketplace maps.
