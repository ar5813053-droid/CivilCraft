# CivilCraft Roadmap

## Phase 1 — Living Village ✅

- Persistent villager identity
- Job registry (Farmer, Worker, Trader, Builder, Citizen)
- Default daily schedule
- Household / family data model
- Active vs lightweight simulation manager
- Village aggregate statistics
- World-level persistence
- Development debug commands

## Phase 2 — Economy ✅

- Integer currency (CivilCoin / CC)
- Wallet credit / debit / transfer with validation
- Goods registry (wheat, bread, wood, stone, coal, iron, tools)
- Job production cycles → village stock + income
- Villager inventories and consumption (food)
- Shops (general, food, building, tools) with restock
- Trader ↔ shop ownership and dividends
- Supply/demand pricing (gradual)
- Centralized transactions + bounded ledger
- Village economic aggregates
- Economy debug commands

**Out of scope for Phase 2:** government, taxes, laws, police, courts, military, politics, multi-nation systems.

---

## Phase 3 — Government

- Village / town leadership roles
- Basic tax collection
- Public works budget
- Claim / territory markers

## Phase 4 — Laws & Justice

- Law definitions (data-driven)
- Crime detection hooks
- Court proceedings (lightweight)
- Sentences & prisons

## Phase 5 — Police & Emergency

- Guard / police jobs
- Patrol schedules
- Fire & disaster response stubs
- Emergency gathering points

## Phase 6 — Healthcare & Education

- Healer / doctor job
- Injury & disease states
- Schools & skill progression
- Knowledge / literacy flags

## Phase 7 — Cities & Infrastructure

- Multi-district cities
- Road / path networks
- Housing density rules
- Infrastructure upkeep

## Phase 8 — Military

- Soldier / officer jobs
- Training grounds
- Defense of claimed territory
- Simple combat orders

## Phase 9 — Politics & Elections

- Candidate registration
- Voting events
- Term limits
- Policy platforms affecting laws/taxes

## Phase 10 — Multiple Nations & Diplomacy

- Nation data model
- Borders & claims
- Treaties / trade agreements
- War / peace states

## Phase 11 — Media & Dynamic Events

- Town crier / news system
- Rumors & public opinion
- Random & scripted world events
- Player-facing newspapers / notices

## Phase 12 — Advanced Civilization Simulation

- Full background simulation for unloaded regions
- Multi-generation family trees
- Cultural traits
- Long-term historical logging
- Player roles inside the civilization (citizen, official, ruler)

---

Each phase should ship with:

1. Data model extensions (versioned)
2. Modular systems that do not break prior phases
3. Documentation updates
4. Performance review against mobile targets
