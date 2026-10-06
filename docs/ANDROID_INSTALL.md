# CivilCraft Android Install (Critical)

## Why the previous world looked vanilla

1. **Script never activated** — chat commands were gated and/or the script module failed to load.
2. **Incomplete `level.dat`** — a real Bedrock LevelDB cannot be generated without Minecraft; packs must load via Script API after import.
3. **`@minecraft/server` version** updated to `1.14.0` for broader 1.21+ compatibility.

## Recommended install path (most reliable)

### Option A — .mcaddon (preferred)

1. Download **CivilCraft.mcaddon**
2. Open it on your Android device (Minecraft should import BP + RP)
3. Create a **New World**
4. **Resource Packs** → activate **CivilCraft Resources**
5. **Behavior Packs** → activate **CivilCraft**
6. Turn **ON** any **Beta APIs / Experiments** required for scripting on your build (if shown)
7. Create & enter world
8. You must see: `CivilCraft loaded successfully. Type !cc ping`
9. Type: `!cc ping` → expect `CivilCraft runtime OK`
10. Type: `!cc build capital` → capital buildings appear around you

### Option B — .mcworld

1. Import **CivilCraft-Complete.mcworld**
2. If packs are not active, open world settings and enable CivilCraft BP+RP
3. Same checks as steps 8–10 above

## Runtime checklist

| Check | Expected |
|-------|----------|
| Chat on join | §aCivilCraft loaded successfully |
| `!cc ping` | CivilCraft runtime OK |
| `!cc build capital` | Building capital… + blocks appear |
| `!cc validate` | PASS/WARN lines |
| `!cc calendar` | Year / day / festivals |

If `!cc ping` does nothing, the Behavior Pack script is **not running** — re-enable the BP and Script/Beta experiments.
