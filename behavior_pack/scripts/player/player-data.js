export const PLAYER_VERSION = 1;
export const MAX_PLAYERS = 40;
export const MAX_PLAYER_TX = 100;

export function createDefaultPlayers() {
  return {
    version: PLAYER_VERSION,
    profiles: {},
    spawnInitialized: false,
    spawnLocation: null,
    stats: { registered: 0 }
  };
}

export function normalizePlayers(raw) {
  const base = createDefaultPlayers();
  if (!raw || typeof raw !== "object") return base;
  return {
    version: raw.version || PLAYER_VERSION,
    profiles: raw.profiles && typeof raw.profiles === "object" ? raw.profiles : {},
    spawnInitialized: !!raw.spawnInitialized,
    spawnLocation: raw.spawnLocation || null,
    stats: { ...base.stats, ...(raw.stats || {}) }
  };
}

export function createPlayerProfile(playerId, name) {
  return {
    id: `player_${playerId}`,
    minecraftId: playerId,
    name: name || "Citizen",
    age: 25,
    lifeStage: "adult",
    money: 50,
    inventory: {},
    employmentId: null,
    jobId: null,
    houseId: null,
    householdId: null,
    health: 80,
    educationLevel: "primary",
    legalStatus: "clean",
    nationId: "nation_main",
    settlementId: "settlement_main",
    bankAccountId: null,
    joinedDay: Math.floor(Date.now() / 86400000),
    firstJoinSpawnDone: false
  };
}
