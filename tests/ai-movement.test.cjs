const {test}=require('node:test'),assert=require('node:assert/strict');
require('../src/config.js');require('../src/rules.js');require('../src/simulation.js');
const {Simulation,Rules:R,Config:C}=ThreeStar;
function scene(){const s=new Simulation(1);s.time=10;s.frame=300;s.monsters=[];s.drops=[];s.teams.forEach(t=>{t.controller='player';t.center={x:100,y:100};t.heroes.forEach(h=>Object.assign(h,{x:100,y:100}));});const t=s.teams[1];t.center={x:800,y:700};t.facing={x:0,y:1};return {s,t};}
function advance(s,t,seconds){for(let i=0;i<seconds/C.tick;i++){if(i%30===0)s.decide(t);s.moveTeam(t,s.aiInput(t),C.tick);s.pickup();s.time+=C.tick;}}
test('双人阵型拾取落在队伍中心的星尘，不会原地等待',()=>{const {s,t}=scene();t.formation=2;t.heroes[0].hp=130;t.heroes[1].hp=0;t.heroes.forEach((h,i)=>Object.assign(h,s.slotPosition(t,C.formations[2].duo[i?1:0])));s.addDrop({x:800,y:700},1);advance(s,t,4);assert.equal(s.drops.length,0);assert.equal(t.carried,1);});
test('无法触及的星尘不会永久占据AI目标',()=>{const {s,t}=scene();s.addDrop({x:800,y:700},1);s.pickup=()=>{};advance(s,t,12);assert.notEqual(t.aiState,'拾取');});
test('仅近战存活时必须进入真实射程再停止刷野移动',()=>{const {s,t}=scene();t.heroes[1].hp=t.heroes[2].hp=0;Object.assign(t.heroes[0],t.center);s.spawnMonster('normal',{x:850,y:700},0);s.decide(t);assert.ok(R.distance(t.goal,t.center)>0);});

test('原故障种子完整对局不再出现超过十秒的拾取原地等待',()=>{
 for(const seed of [1,2,3]){const s=new Simulation(seed),records=new Map();
  while(!s.ended){s.step();for(const t of s.teams.slice(1)){
   if(t.eliminatedAt!=null)continue;const previous=records.get(t.id);
   if(!previous||R.distance(previous.pos,t.center)>12||t.lastCombat>previous.at){records.set(t.id,{pos:{...t.center},at:s.time});continue;}
   if(t.aiState==='拾取')assert.ok(s.time-previous.at<=10,`seed=${seed}, team=${t.id}, time=${s.time}`);
  }}
 }
});
