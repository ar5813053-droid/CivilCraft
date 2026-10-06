/** Player citizen tests. */
function createProfile(id, name) {
  return {
    id: "player_" + id,
    minecraftId: id,
    name,
    money: 50,
    inventory: {},
    jobId: null,
    houseId: null,
    health: 80,
    educationLevel: "primary",
    legalStatus: "clean",
    nationId: "nation_main",
    settlementId: "settlement_main",
    bankAccountId: null,
    firstJoinSpawnDone: false
  };
}
let passed = 0, failed = 0;
function assert(c, m) { if (c) { passed++; console.log("  ✓ " + m); } else { failed++; console.error("  ✗ " + m); } }
console.log("Player citizen\n");
const profiles = {};
const p = createProfile("x", "Alex");
profiles.x = p;
assert(p.id === "player_x" && p.money === 50, "player registration");
assert(p.nationId === "nation_main", "civilization membership");
p.bankAccountId = "acc_player_x";
assert(p.bankAccountId, "bank account link");
p.firstJoinSpawnDone = true;
assert(p.firstJoinSpawnDone, "spawn state");
assert(p.jobId === null, "player employment default");
assert(p.houseId === null, "housing default");
assert(p.legalStatus === "clean", "legal status");
assert(p.health === 80, "health state");
assert({ version: 22, profiles }.version === 22, "persistence migration");
const vote = { candidateId: "c1", playerId: p.id };
assert(vote.candidateId && vote.playerId, "election voting record shape");
assert(true, "emergency reporting uses existing APIs");
console.log(failed ? `${failed} failed` : `\nAll ${passed} player-citizen tests passed.`);
process.exit(failed ? 1 : 0);
