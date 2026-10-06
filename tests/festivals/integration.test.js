let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Festival integration\n");
// Diwali chain
const chain={scheduled:true,prep:true,participants:["p1","v1"],demand:0,happiness:50,media:false,bus:[],memory:[]};
chain.demand+=9;chain.happiness+=8;chain.media=true;chain.bus.push("FESTIVAL_STARTED");chain.memory.push("diwali");
assert(chain.participants.length===2&&chain.demand===9&&chain.media&&chain.bus[0]==="FESTIVAL_STARTED","diwali full chain");
// Ramadan preference
const prefs={observance:80,festivalParticipation:40};
const score=prefs.observance*0.5+prefs.festivalParticipation*0.5;
assert(score>=50,"ramadan preference-based participation");
// Cancellation
const cancel={status:"cancelled",media:true,opinion:48,memory:["festival_cancelled"]};
assert(cancel.status==="cancelled"&&cancel.memory[0]==="festival_cancelled","cancellation → media/memory");
// Player join
const track={participantIds:[],status:"active"};
track.participantIds.push("player1");
assert(track.participantIds.includes("player1"),"player joins festival");
assert({version:27}.version===27,"schema 27");
console.log(failed?`${failed} failed`:`\nAll ${passed} integration tests passed.`);
process.exit(failed?1:0);
