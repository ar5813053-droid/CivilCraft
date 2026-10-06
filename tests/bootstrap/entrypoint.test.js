const fs = require("fs");
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Bootstrap entrypoint\n");
const main = fs.readFileSync("behavior_pack/scripts/main.js","utf8");
assert(!/from\s+"\.\//.test(main), "main.js has no local imports");
assert(main.includes('from "@minecraft/server"'), "main imports @minecraft/server");
assert(main.includes("CivilCraft runtime OK"), "ping response string");
assert(main.includes('import("./civilcraft-app.js")'), "dynamic app import");
assert(fs.existsSync("behavior_pack/scripts/civilcraft-app.js"), "app module exists");
const man = JSON.parse(fs.readFileSync("behavior_pack/manifest.json","utf8"));
assert(man.modules.some(m => m.entry === "scripts/main.js"), "manifest entry scripts/main.js");
assert(man.dependencies.some(d => d.module_name === "@minecraft/server" && d.version === "2.9.0"), "API 2.9.0");
console.log(failed?`${failed} failed`:`\nAll ${passed} bootstrap tests passed.`);
process.exit(failed?1:0);
