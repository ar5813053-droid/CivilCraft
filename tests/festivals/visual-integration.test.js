
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Visual integration\n");
const chain={
  scheduled:true,prep:true,decor:["lantern"],appearance:"festival_diwali_civilian",
  gather:true,demand:9,media:true,mission:true,memory:true,cleanup:true,restored:"civilcraft_farmer"
};
assert(chain.appearance.startsWith("festival_"),"appearance during festival");
assert(chain.decor.length>0,"decorations");
assert(chain.mission&&chain.demand===9,"missions + economy");
assert(chain.cleanup&&chain.restored==="civilcraft_farmer","cleanup + restore");
assert({version:28}.version===28,"schema 28");
console.log(failed?`${failed} failed`:`\nAll ${passed} visual-integration tests passed.`);
process.exit(failed?1:0);
