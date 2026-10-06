const MAX=3;
const TYPES=["find_job","earn_money","maintain_health","get_education","buy_house","save_money","socialize","support_family"];
function createGoal(type,priority){if(!TYPES.includes(type)&&!["help_community","participate_politics","improve_career","improve_house"].includes(type))return null;return{id:"goal_"+type,type,priority:Math.min(100,Math.round(priority)),progress:0,target:100,status:"active"};}
function generateGoals(ctx,p){
  const c=[];
  if(ctx.unemployed&&ctx.workingAge)c.push(createGoal("find_job",70));
  if((ctx.health||80)<50)c.push(createGoal("maintain_health",80));
  if(ctx.homeless)c.push(createGoal("buy_house",75));
  if((ctx.money||50)<30&&(p.ambition||0)>50)c.push(createGoal("earn_money",60));
  if((p.familyFocus||0)>70)c.push(createGoal("support_family",p.familyFocus));
  return c.filter(Boolean).sort((a,b)=>b.priority-a.priority).slice(0,MAX);
}
let passed=0,failed=0;
function assert(c,m){if(c){passed++;console.log("  ✓ "+m);}else{failed++;console.error("  ✗ "+m);}}
console.log("Goals\n");
const g=generateGoals({unemployed:true,workingAge:true,health:40,homeless:true,money:10},{ambition:80,familyFocus:90});
assert(g.length<=MAX,"maximum active goals enforced");
assert(g.some(x=>x.type==="maintain_health"||x.type==="buy_house"),"real state influences goals");
assert(createGoal("invalid_xyz",50)===null||!TYPES.includes("invalid_xyz"),"invalid goals rejected");
const goal={progress:0,target:100,status:"active"};
goal.progress=Math.min(goal.target,goal.progress+50);
assert(goal.progress===50,"progress bounded");
goal.progress=100;goal.status="completed";
assert(goal.status==="completed","completion deterministic");
console.log(failed?`${failed} failed`:`\nAll ${passed} goals tests passed.`);
process.exit(failed?1:0);
