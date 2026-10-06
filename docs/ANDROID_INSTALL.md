# CivilCraft on Minecraft Bedrock 26.52 (Android)

## Root cause of previous failures

`main.js` imported ~80 local modules at top level. **Any** import failure prevented the entire script (including `!cc ping`) from running. Fixed: bootstrap has **zero** local imports; systems load via dynamic `import()`.

## Install

1. Install **fresh** `CivilCraft.mcaddon` (version **1.31.0**).
2. Create a **NEW** world.
3. Enable **CivilCraft** Resource Pack and Behavior Pack.
4. Enter the world.
5. Within a few seconds you should see: `CivilCraft script loaded. Use !cc ping`
6. Type **exactly**: `!cc ping` and send.
7. Expected: `CivilCraft runtime OK`
8. Then: `!cc runtime`
9. Then: `!cc build capital` (after App: LOADED)

If step 6 fails, open content/script log and look for `[CivilCraft]`.
