function applyOnce(inst,key,fn){
  inst.completedEffects=inst.completedEffects||{};
  if(inst.completedEffects[key])return false;
  inst.completedEffects[key]=true;fn();return true;
}
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Effects\n");
const inst={completedEffects:{},participantIds:["a"]};
let demand=0,hap=50,opinion=50,media=0,mem=0;
applyOnce(inst,"demand",()=>{demand+=8;});
assert(demand===8,"economy demand");
assert(!applyOnce(inst,"demand",()=>{demand+=8;}),"duplicate protection");
assert(demand===8,"no double demand");
applyOnce(inst,"hap",()=>{hap=Math.min(100,hap+5);});
assert(hap===55,"happiness");
applyOnce(inst,"op",()=>{opinion=Math.min(100,opinion+2);});
assert(opinion===52,"opinion");
applyOnce(inst,"media",()=>{media++;});
assert(media===1,"media");
applyOnce(inst,"mem",()=>{mem++;});
assert(mem===1,"memory");
console.log(failed?`${failed} failed`:`\nAll ${passed} effects tests passed.`);
process.exit(failed?1:0);
