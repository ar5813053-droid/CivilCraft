# CivilCraft Final Architecture Map

```
Calendar (120-day year)
  → Festivals (fixed DOY) → Culture → Appearance/Decorations → Economy demand
  → Elections (DOY ~28–40) → Politics → Government leadership/policies

Citizens (records)
  → Personality/Goals (Citizen AI)
  → Daily Life (needs, activity)
  → Employment → Businesses/Gov payroll → Economy wallets
  → Households → Housing → Settlements
  → Lifecycle (age, marriage, birth, death)
  → Memory ← Event Bus ← systems

Player
  → Citizen profile → Banking → Economy
  → Jobs/Missions → Employment
  → Vote/Party → Politics
  → Festivals → Culture

Nations → Diplomacy/Trade → Logistics → Economy
Media/Opinion ← Events (elections, festivals, crises)
Civilization score ← derived stats
```

Authoritative ownership is preserved per module; no duplicate money or job systems.
