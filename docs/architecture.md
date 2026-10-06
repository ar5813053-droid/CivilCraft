# CivilCraft Architecture

## Goals

- Production-oriented, modular foundation for a long-lived civilization simulation.
- Safe performance on mobile Bedrock clients.
- Clear boundaries so future phases (government, law, etc.) plug in without rewriting prior work.

## Pack Layout

| Pack | Role |
|------|------|
| `behavior_pack` | Scripts, data, future entity/item definitions |
| `resource_pack` | Textures, UI, localization (minimal in Phase 1–2) |

Script entry: `behavior_pack/scripts/main.js`.

## Module Boundaries

```
main.js
  │
  ├── core/          # Constants, logging, utils, data-store
  ├── villagers/     # Identity + entity linkage
  ├── jobs/          # Profession definitions (extensible)
  ├── schedules/     # Time-of-day activity resolution
  ├── families/      # Household membership
  ├── economy/       # Phase 2 — money, goods, shops, prices
  └── simulation/    # Orchestration & village aggregates
```

### Economy modules (`economy/`)

| File | Role |
|------|------|
| `economy-data.js` | Schema, defaults, currency config, migration normalize |
| `wallet.js` | Integer balance credit/debit/transfer |
| `goods-registry.js` | Good definitions (wheat, bread, wood, …) |
| `inventory.js` | Map-based inventory helpers |
| `transactions.js` | Validated multi-party operations + ledger ring buffer |
| `prices.js` | Supply/demand pricing (gradual lerp) |
| `production.js` | Job → goods cycles + production income |
| `consumption.js` | Hunger drain, eat own food, buy from shops |
| `shops.js` | Shop records, restock from village stock |
| `businesses.js` | Trader ↔ shop ownership, dividends |
| `economy-manager.js` | Interval orchestration + aggregates |

### Data ownership

| Concern | Owner | Storage |
|---------|-------|---------|
| Villager identity + `money` + `inventory` | villager-registry | World dynamic property blob |
| Entity ↔ identity link | villager-manager | Entity dynamic property + tag |
| Job definitions | job-registry | In-memory (code) |
| Schedule templates | schedule-manager | In-memory (code) |
| Households | household-manager | World data blob |
| Shops, market, village stock, tx log | economy | `worldData.economy` |
| Village aggregates | village-data / economy-manager | World data blob |

Entities never hold full identity or inventory. They store only `civilcraft:villager_id`.

## Simulation tiers

1. **Active** — villagers within radius of any player (schedule evaluation).
2. **Lightweight** — all registered identities participate in economy ticks via data only (no entity queries required for production/consumption).
3. **Background civilization** — reserved for later phases.

## Economy data flow

```
Work activity
    → production.js (goods → villageStock + personal inventory)
    → grantIncome (wallet credit, ledger entry)

Hunger low
    → consumption.js
        → eat own inventory
        OR purchaseGoods from shop (validated tx)
        → demand pressure recorded

Economy tick
    → restock shops from villageStock
    → supply snapshot (stock + shops + inventories)
    → prices.js lerp toward supply/demand target
    → trader dividends if shop surplus
    → village economy aggregates
```

### Transaction rules

- Integer CivilCoins only; no negative balances.
- Stock checked before money movement; rollbacks on failure.
- Recent transactions capped (ring buffer, 50 entries).
- No free money: income requires production or a funded transfer.

### Price formula

```
ratio  = demand / max(supply, 1)
factor = clamp(0.5 + 0.5 * ratio, 0.5, 2.0)
target = basePrice * factor
next   = lerp(current, target, 0.15)
next   = clamp(round(next), minPrice, maxPrice)
demand *= 0.85  // decay each price tick
```

## Performance rules

- Economy interval ~300 ticks (~15s); prices every 2nd economy tick.
- No whole-world entity scans for economy.
- Production/consumption iterate registered villager records (in-memory).
- Transaction history bounded.
- World JSON kept deliberately modest; shops and stock are aggregate maps.

## Persistence

World dynamic property key: `civilcraft:world_data`

```json
{
  "version": 2,
  "villagers": { "<id>": { /* + inventory, money */ } },
  "households": {},
  "villages": {},
  "managedEntityIds": [],
  "economy": {
    "version": 1,
    "currencyCode": "CC",
    "shops": {},
    "market": { "supply": {}, "demand": {}, "prices": {} },
    "totals": {},
    "recentTransactions": [],
    "villageStock": {}
  }
}
```

`normalizeEconomyData()` fills missing fields on load (Phase 1 → Phase 2 safe).

## Extension points

| Future need | Hook |
|-------------|------|
| New good | `registerGood()` |
| New job production | `PRODUCTION_RECIPES` in production.js |
| Taxes / public pay | Call `transferMoney` / `grantIncome` from government module |
| Physical shop blocks | Map structure location → `ShopRecord.id` |
| Loans / credit | Extend wallet with explicit credit limit flag |

## Script API surface

- `@minecraft/server` stable (`1.17.0` dependency)
- World + entity dynamic properties
- `system.runInterval`
- Entity spawn/load events
- Optional `chatSend` for debug commands


## Government (Phase 3)

```
Earned income (production / dividends)
    → taxableIncome on villager
    → collectIncomeTax (interval)
        → villager wallet debit
        → treasury credit
        → taxableIncome cleared (no double tax)
Treasury free balance
    → budget allocation (public works / administration / reserve)
Public works project
    → spendFromBudget
    → treasury debit
    → project record (funded → completed)
```

Approval:

```
approval = clamp(
  60
  + wealth modifier
  + food modifier
  - tax rate modifier
  - unemployment modifier
  + spending modifier,
  0, 100)
```

Government records live in `worldData.government.governments` keyed by id so later nations can coexist. Only `municipal` is active. World data version is 3. `normalizeGovernmentStore()` repairs missing or corrupt fields.


## Justice (Phase 4)

Laws are definitions. Violations are created only through `reportViolation`. Cases and penalties are persisted records.

```
reportViolation (cooldown per villager+law)
    → openCase
    → issueFine
        → computeFine (repeat multiplier, cap 200)
        → transferMoney type legal_fine
        → government treasury
        → outstanding remainder kept if unpaid
```

Public Safety department remains disabled. Tax evasion is a law definition only; tax collection is unchanged. World data version is 4. `normalizeJustice()` bounds lists and fills missing fields without clearing economy or government.

## Police & Emergency (Phase 5)

Public Safety is enabled on municipal_main. Officers reference villager ids. reportCrime calls justice.reportViolation. Salaries use transferMoney type government_salary and fail into unpaidSalaries if the treasury is short. Patrols and dispatch are interval records, not pathfinding. World data version is 5.

## Healthcare & Education (Phase 6)

Records are keyed by villagerId. Treatment uses medical_expense or a treasury subsidy. Unpaid bills stay outstanding. Medical emergencies stay queued without staff. Education progress runs on a 50-second interval. Skill bonuses are computed, not written into job definitions. Approval accepts optional healthcareQuality and educationQuality, each capped at ±5. World data version is 6.

## Settlements & Infrastructure (Phase 7)

`settlement_main` is created once from the existing village. Type thresholds are configurable and never downgrade. Prosperity moves 25% toward the new score each evaluation. Infrastructure records may have null locations. Public works can set infrastructureId and improve condition when completed. World data version is 7. Stats run about every 60 seconds.

## Housing & Population (Phase 8)

Households reference villager ids. Houses may have null locations. Population manager is the settlement population source. Demographics advance in batches of 40 about every 3 minutes. Housing condition decays on a similar interval. New citizens from createVillagerProfile are simulated records. Death updates records only and is not triggered by low health. World data version is 8.

## Daily Life (Phase 9)

Daily life owns activity, behavioral needs, happiness, stress, attendance aggregates, and cooldowns. Priority is emergency, healthcare, food, sleep, school/work, then leisure. Police and clinic schedules are not replaced. World data version is 9. Batch size is 40.

## Household Food (Phase 10)

Daily life asks Economy to buy wheat when household stock is low and hunger is below 35. purchaseGoods moves money and stock. Cooldown is one decision per household per day, including failures. Cap is 10 units. World data version is 10.

## Consumption (Phase 11)

Bread is the consumable food. Wheat stays an ingredient. Meals call consumeOwnGoods and recordDemand. Hunger decay remains in tickNeeds. One meal per citizen per day. World data version is 11.

## Employment (Phase 12)

Employment owns assignment state only. Jobs own definitions and schedules. Education is read for eligibility. Economy owns money transfers. Police payroll remains in the police module. Soft vacancy caps prevent unbounded hiring. Unemployed adults search every 2 simulated days. Batch size is 40. World data version is 12.

## Business Operations (Phase 13)

Existing shops are the private employers. Capacity is by type (food 5, general 4, etc.). Sales through purchaseGoods increase shop revenue. Maintenance is a small daily debit. Private payroll runs every 7 simulated days via transferMoney and never pays government or police roles. World data version is 13.

## Phases 14–17

Production uses shared recipes and shop employees. Logistics moves goods between shops with travel days. Utilities compute settlement service quality. Social opinion is smoothed from employment, safety, health, education, and utilities. World data version is 17.
