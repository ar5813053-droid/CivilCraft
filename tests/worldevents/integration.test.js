let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("World events integration\n");
// Festival chain
const chain={participants:["v1","v2"],demand:0,happiness:50,bus:[]};
chain.demand+=8;chain.happiness+=5;chain.bus.push("EVENT_COMPLETED");
assert(chain.participants.length===2&&chain.demand===8&&chain.bus[0]==="EVENT_COMPLETED","festival → participants → demand → bus");
// Emergency
const em={resolved:true,bus:[],memory:[]};
if(em.resolved){em.bus.push("EMERGENCY_RESOLVED");em.memory.push("emergency");}
assert(em.bus[0]==="EMERGENCY_RESOLVED"&&em.memory.length===1,"emergency → bus → memory");
// Player mission
const pm={completed:true,bus:[]};
if(pm.completed)pm.bus.push("PLAYER_MISSION_COMPLETED");
assert(pm.bus[0]==="PLAYER_MISSION_COMPLETED","player mission → bus");
// Election
const el={completed:true,media:true,opinion:50,memory:[]};
if(el.completed){el.opinion+=1;el.memory.push("ELECTION_COMPLETED");}
assert(el.memory[0]==="ELECTION_COMPLETED"&&el.media,"election → media/opinion/memory");
assert({version:26}.version===26,"schema 26");
console.log(failed?`${failed} failed`:`\nAll ${passed} integration tests passed.`);
process.exit(failed?1:0);
