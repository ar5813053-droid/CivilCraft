# Festival Add-on Integration

## Architecture

CivilCraft owns festival lifecycle, calendar, economy, missions, memory, and citizen participation.

Optional external Bedrock packs may enhance visuals when the **user installs them separately**.

```
Culture festival phase
        ↓
festival-addon-adapter.activateFestivalAddon(id, phase)
        ↓
capabilities.detect → external or civilcraft_fallback
        ↓
CivilCraft decorations / appearance / missions (always)
+ optional external content (if installed & allowed)
```

## Commands

- `!cc festival addons list`
- `!cc festival addons info <festival>`
- `!cc festival addons enable <festival>`
- `!cc festival addons disable <festival>`

## Why nothing is bundled

Most published Holi/Diwali Bedrock add-ons **forbid redistribution**. Marketplace packs cannot be copied into this repository. CivilCraft therefore:

1. Registers metadata for known optional packs.
2. Falls back to CivilCraft visuals when external packs are absent.
3. Never crashes if external content is missing.
