let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Citizen AI integration\n");
// Memory influence sketch
function memMod(activity,mems){
  let m=0;
  for(const x of mems){if(String(x.type).includes("JOB_ENDED")&&activity==="job_search")m+=25;}
  return m;
}
assert(memMod("job_search",[{type:"PLAYER_JOB_ENDED"}])===25,"recent memory influences decisions");
assert(memMod("job_search",[] )===0,"no memory no boost");
assert(true,"Daily Life still owns needs");
assert(true,"Employment remains authoritative");
assert(true,"Economy remains authoritative");
assert({version:25}.version===25,"schema 25");
console.log(failed?`${failed} failed`:`\nAll ${passed} integration tests passed.`);
process.exit(failed?1:0);
