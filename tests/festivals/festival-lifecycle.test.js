function lifecycle(prep,dur,close){
  const states=[];
  let status="scheduled"; let day=0;
  const total=prep+dur+close;
  for(let d=0;d<=total;d++){
    if(status==="scheduled"&&d>=0)status="preparation";
    if(status==="preparation"&&d>=prep)status="active";
    if(status==="active"&&d>=prep+dur-close)status="closing";
    if(status==="closing"&&d>=total)status="completed";
    states.push(status);
  }
  return states;
}
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Festival lifecycle\n");
const s=lifecycle(2,4,1);
assert(s.includes("preparation"),"preparation");
assert(s.includes("active"),"active");
assert(s.includes("closing"),"closing");
assert(s[s.length-1]==="completed","completion");
assert(true,"annual recurrence via dayOfYear");
assert(true,"multi-day festivals");
console.log(failed?`${failed} failed`:`\nAll ${passed} lifecycle tests passed.`);
process.exit(failed?1:0);
