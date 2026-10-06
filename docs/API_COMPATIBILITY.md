# CivilCraft API Compatibility

## Target

- **Minecraft Bedrock:** 26.52 / 1.26.x
- **@minecraft/server:** **2.9.0** (stable, shipped with ~1.26.40 line)

## Why 2.9.0

Microsoft released `@minecraft/server` v2.9.0 with the 1.26.40 product line. Bedrock 26.52 aligns with the 26.x / 1.26.x scripting generation. Using 1.14.0 was incorrect for this target: the game may reject or not bind the script module as expected.

## Entrypoint

- **manifest entry:** `scripts/main.js`
- **main.js:** ZERO local imports — only `@minecraft/server`
- **civilcraft-app.js:** full systems, loaded via `import("./civilcraft-app.js")` after bootstrap

## Experiments

- Core `!cc ping` bootstrap should work with Scripting enabled as for stable 2.x modules (no Beta-only APIs required for ping/chat).
- If chatSend is unavailable on a build, `!cc runtime` will show Chat: FAIL — report that Minecraft version.

## Intentionally avoided in bootstrap

- Any local `./` import in main.js
- Economy, culture, politics, etc. before ping works
