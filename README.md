# CivilCraft

**Deep, realistic Villager civilization simulation for Minecraft Bedrock Edition.**

CivilCraft turns vanilla villagers into persistent citizens with identities, jobs, households, daily schedules, and a living economy.

> **Current status:** Phase 10 — Household Food  
> Version: `1.9.0`  
> Target: Minecraft Bedrock 1.21+

---

## Phase 1 Features (Living Village)

| System | Status |
|--------|--------|
| Villager identity | ✅ Unique ID, name, age, profession, home, workplace, needs, activity |
| Jobs | ✅ Farmer, Worker, Trader, Builder, Citizen |
| Daily schedules | ✅ Modular 06:00–22:00 cycle |
| Households | ✅ Membership + shared home |
| Simulation tiers | ✅ Active near player / lightweight data |
| Persistence | ✅ World dynamic properties |

## Phase 2 Features (Economy)

| System | Status | Notes |
|--------|--------|-------|
| Currency | ✅ | **CivilCoin (CC / ₡)** — integer balances |
| Wallets | ✅ | Credit, debit, transfer; no negative balances |
| Goods registry | ✅ | Wheat, bread, wood, stone, coal, iron, tools |
| Production | ✅ | Farmers/workers produce; builders craft tools from materials |
| Consumption | ✅ | Hunger drain; eat inventory or buy bread from shops |
| Shops | ✅ | General, Food, Building Materials, Tool shops |
| Trader job | ✅ | Shop ownership + surplus dividends |
| Prices | ✅ | Gradual supply/demand adjustment |
| Transactions | ✅ | Validated ledger (capped history) |
| Village stats | ✅ | Total money, production, consumption, employment |

**Not implemented yet:** police, courts, prisons, elections, military.

## Phase 4 Features (Laws & Justice)

| System | Status | Notes |
|--------|--------|-------|
| Law registry | ✅ | theft, property damage, assault, trespassing, public disturbance, tax evasion |
| Violations | ✅ | Explicit report API, cooldown, no auto crime |
| Cases | ✅ | Status transitions for future courts |
| Penalties | ✅ | Warning, fine, community service, temporary restriction record |
| Fines | ✅ | Paid into government treasury; unpaid stays outstanding |
| Legal status | ✅ | clean / warned / fined / wanted / restricted |
| Debug | ✅ | `!cc justice laws law violations cases case legal fine justiceevents` |

Police patrols, court AI, prisons, and elections are not in this phase.


## Phase 3 Features (Government)

| System | Status | Notes |
|--------|--------|-------|
| Government record | ✅ | Municipal active; regional/national are type hooks |
| Leadership | ✅ | Mayor, deputy mayor, treasurer, department head |
| Departments | ✅ | Finance + Public Works active; Health, Education, Public Safety reserved |
| Treasury | ✅ | Separate balance; no negative funds |
| Income tax | ✅ | Threshold, rate, max tax; taxes new income once |
| Budget | ✅ | Public works, administration, reserve |
| Public works | ✅ | Data projects (road, building, maintenance) |
| Approval | ✅ | Economy, tax, unemployment, spending, food |
| Debug commands | ✅ | `!cc government`, `leader`, `treasury`, `taxes`, `budget`, `departments`, `approval`, `govtransactions` |

**Not implemented yet:** police, courts, prisons, elections, military.

## Phase 4 Features (Laws & Justice)

| System | Status | Notes |
|--------|--------|-------|
| Law registry | ✅ | theft, property damage, assault, trespassing, public disturbance, tax evasion |
| Violations | ✅ | Explicit report API, cooldown, no auto crime |
| Cases | ✅ | Status transitions for future courts |
| Penalties | ✅ | Warning, fine, community service, temporary restriction record |
| Fines | ✅ | Paid into government treasury; unpaid stays outstanding |
| Legal status | ✅ | clean / warned / fined / wanted / restricted |
| Debug | ✅ | `!cc justice laws law violations cases case legal fine justiceevents` |

Police patrols, court AI, prisons, and elections are not in this phase.



---

## Installation

1. Clone this repository.
2. Copy `behavior_pack` → world's `behavior_packs` (or `development_behavior_packs`).
3. Copy `resource_pack` → `resource_packs` / `development_resource_packs`.
4. Activate both packs on a Bedrock **1.21+** world.
5. Optional: enable content log for debugging.

No experimental gameplay toggles required for Phase 2 stable APIs.

---

## Development Commands

When `DEBUG` is `true` and `chatSend` is available:

| Command | Description |
|---------|-------------|
| `!cc help` | List commands |
| `!cc status` | Population / village snapshot |
| `!cc manage` | Adopt nearby vanilla villagers |
| `!cc population` | Registered count |
| `!cc jobs` | List jobs |
| `!cc list` | Sample managed villagers |
| `!cc village` | Dump default village data |
| `!cc save` | Force-save world data |
| `!cc economy` | Economy overview + prices |
| `!cc money` | Total / top villager balances |
| `!cc prices` | Per-good supply, demand, price |
| `!cc goods` | Registered goods |
| `!cc shops` | Shop list and balances |
| `!cc transactions` | Recent ledger entries |
| `!cc government` | Government overview |
| `!cc leader` | Leadership; `!cc leader appoint mayor` |
| `!cc treasury` | Treasury balance |
| `!cc taxes` | Policy; `!cc taxes 12` sets rate |
| `!cc budget` | Allocations; `!cc budget project` funds maintenance |
| `!cc departments` | Department list |
| `!cc approval` | Approval metric |
| `!cc govtransactions` | Treasury ledger |

---

## Architecture

```
behavior_pack/scripts/
├── main.js
├── core/
├── villagers/
├── jobs/
├── schedules/
├── families/
├── economy/          ← Phase 2
│   ├── economy-manager.js
│   ├── wallet.js
│   ├── goods-registry.js
│   ├── inventory.js
│   ├── transactions.js
│   ├── prices.js
│   ├── production.js
│   ├── consumption.js
│   ├── shops.js
│   ├── businesses.js
│   └── economy-data.js
└── simulation/
```

See [docs/architecture.md](docs/architecture.md) and [docs/roadmap.md](docs/roadmap.md).

---

## Economy design (short)

- **Money is not spawned from nowhere.** Production creates goods; selling/producing yields income; consumption spends it.
- **Shops** restock from a village stockpile filled by workers and farmers.
- **Prices** move slowly toward a target based on recent demand vs supply.
- **Unloaded villagers** still participate via lightweight data ticks (no entity required).

---

## Performance

- Economy runs about every 15 seconds, not every tick.
- No world-wide entity scans for economic logic.
- Transaction history is a fixed-size ring buffer.
- Designed for mobile Bedrock clients.

---

## Planned Systems

1. Living Village ✅  
2. Economy ✅  
3. Government ✅  
4. Laws & Justice ✅  
5. Police & Emergency ✅  
6. Healthcare & Education ✅  
7. Cities & Infrastructure ✅  
8. Housing & Population ✅  
9. Politics & Elections  
10. Multiple Nations & Diplomacy  
11. Media & Dynamic Events  
12. Advanced Civilization Simulation  

---

## Tests

```bash
node tests/validate-structure.js
node tests/economy/wallet.test.js
node tests/economy/prices.test.js
node tests/government/government.test.js
node tests/justice/justice.test.js
node tests/police/police.test.js
node tests/emergency/emergency.test.js
node tests/healthcare/healthcare.test.js
node tests/education/education.test.js
node tests/settlements/settlements.test.js
node tests/population/population.test.js
node tests/dailylife/daily-life.test.js
node tests/dailylife/food.test.js
```

Static/structure tests only — in-game behavior requires a Bedrock client.

---

## License

MIT — see [LICENSE](LICENSE).

Repository: https://github.com/ar5813053-droid/CivilCraft

## Phase 5 Features (Police & Emergency)

Police officers, ranks, station records, lightweight patrols, justice-backed crime reports, arrest records, treasury-funded salaries, and emergency dispatch. No prisons, pathfinding, or automatic crime scans.

## Phase 6 Features (Healthcare & Education)

Health records, clinics, treatments billed through wallets, medical emergency hook, schools, teachers, classes, and bounded skill bonuses. No physical buildings or per-tick simulation.

## Phase 7 Features (Cities & Infrastructure)

Settlements progress village → town → city → metro without downgrades. Infrastructure and roads are data bindings. Existing clinic, school, and station records are referenced, not copied. No procedural city generation.

## Phase 8 Features (Housing, Population & Families)

Houses and households are data records. Simulated citizens do not spawn entities. Existing villager ids, wallets, and jobs are preserved. Homelessness is tracked. Rent cannot drive a wallet negative. World data version is 8.

## Phase 9 Features (Daily Life)

Activity, needs, happiness, and stress are simulation state. Health, money, housing, and jobs stay in their existing systems. Evaluations run in batches of 40 about every 30 seconds. No pathfinding.

## Phase 10 Features (Household Food)

One food purchase decision per household per day through purchaseGoods. Economy owns wallets and inventories. No free food. World data version is 10.
