# CivilCraft

**Deep, realistic Villager civilization simulation for Minecraft Bedrock Edition.**

CivilCraft turns vanilla villagers into persistent citizens with identities, jobs, households, daily schedules, and a living economy.

> **Current status:** Phase 3 — Government  
> Version: `1.2.0`  
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

**Not implemented yet:** elections, parties, laws, police, courts, military, diplomacy.

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

**Not implemented yet:** elections, parties, laws, police, courts, military, diplomacy.


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

## Tests

```bash
node tests/validate-structure.js
node tests/economy/wallet.test.js
node tests/economy/prices.test.js
node tests/government/government.test.js
```

Static/structure tests only — in-game behavior requires a Bedrock client.

---

## License

MIT — see [LICENSE](LICENSE).

Repository: https://github.com/ar5813053-droid/CivilCraft
