const fs = require("fs");
const { execSync } = require("child_process");
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Package\n");
execSync("python3 tools/package_release.py", {stdio:"pipe"});
assert(fs.existsSync("dist/CivilCraft.mcaddon"), "mcaddon exists");
assert(fs.existsSync("dist/CivilCraft-Complete.mcworld"), "mcworld exists");
assert(fs.statSync("dist/CivilCraft.mcaddon").size > 10000, "mcaddon size");
assert(fs.statSync("dist/CivilCraft-Complete.mcworld").size > 10000, "mcworld size");
console.log(failed?`${failed} failed`:`\nAll ${passed} package tests passed.`);
process.exit(failed?1:0);
