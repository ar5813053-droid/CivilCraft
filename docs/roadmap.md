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

## Phase 3 — Government ✅

- Persistent municipal government record (regional/national are type extension points)
- Leadership seats: mayor, deputy mayor, treasurer, department head
- Departments: Finance and Public Works active; Health, Education, Public Safety reserved
- Treasury separate from villager wallets
- Income tax on newly earned income only (threshold, rate, max tax)
- Budget categories: public works, administration, reserve
- Public works project records funded only from treasury
- Approval metric from economy, tax, unemployment, spending, food
- Government debug commands

**Out of scope for Phase 3:** elections, parties, laws, police, courts, military, diplomacy, multi-nation behavior.

---

## Phase 4 — Laws & Justice ✅

- Data-driven law registry
- Explicit violation reports with cooldowns
- Case records and status transitions
- Penalties and treasury-backed fines
- Outstanding fines preserved
- Derived legal status
- Bounded justice event log

**Out of scope:** police AI, court hearings, prisons, elections, military.

---

## Phase 4 notes


- Law definitions (data-driven)
- Crime detection hooks
- Court proceedings (lightweight)
- Sentences & prisons

## Phase 5 — Police & Emergency ✅

- Public Safety department active
- Officer job, ranks, station and patrol records
- Crime reports through Phase 4
- Arrest records only (no prisons)
- Emergency dispatch and police units
- Treasury-funded salaries

---

## Phase 5 notes

- Guard / police jobs
- Patrol schedules
- Fire & disaster response stubs
- Emergency gathering points

## Phase 6 — Healthcare & Education ✅

- Health records, clinics, treatments
- Healer, nurse, doctor, teacher jobs
- Schools, classes, graduation
- Treasury-backed public services

---

## Phase 6 notes

- Healer / doctor job
- Injury & disease states
- Schools & skill progression
- Knowledge / literacy flags

## Phase 7 — Cities & Infrastructure ✅

- Settlement hierarchy and growth
- Infrastructure and road records
- Facility links to existing services

---

## Phase 7 notes

- Multi-district cities
- Road / path networks
- Housing density rules
- Infrastructure upkeep

## Phase 8 — Housing, Population & Families ✅

- Houses, households, relationships
- Simulated citizens without entity spawn
- Migration and homelessness records

---

## Phase 8 notes

## Phase 8b — Military

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

## Phase 9 — Citizen Daily Life ✅

- Activity states and routines
- Needs, happiness, stress
- Attendance aggregates
- No pathfinding
