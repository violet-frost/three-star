const {test}=require('node:test'),assert=require('node:assert/strict');
require('../src/config.js');require('../src/rules.js');require('../src/simulation.js');
const {Simulation,Config:C}=globalThis.ThreeStar;
function scene(){const s=new Simulation(41);s.time=10;s.frame=300;s.monsters=[];s.teams.forEach((t,i)=>{t.controller='player';t.center={x:400+i*500,y:500};t.heroes.forEach((h,j)=>Object.assign(h,{x:t.center.x,y:500+j*30}));});return s;}
test('圆阵镇星不再突进，只在普攻范围内起手',()=>{
 const s=scene(),t=s.teams[0],tank=t.heroes[0],enemy=s.teams[1].heroes[1];t.formation=1;Object.assign(enemy,{x:500,y:500});tank.target=enemy;
 s.updateAction(tank,C.tick);assert.equal(tank.action,null);assert.equal(tank.x,400);
 enemy.x=430;s.updateAction(tank,C.tick);assert.equal(tank.action.kind,'attack');s.time+=.2;s.updateAction(tank,C.tick);s.resolveDamage();assert.ok(enemy.hp<80);assert.equal(enemy.knock,undefined);assert.ok(!s.events.some(e=>e.type==='skill'||e.type==='synergy'));
});
test('重华普通攻击不再减速，敌队移动速度不受命中影响',()=>{
 const s=scene(),source=s.teams[0].heroes[2],t=s.teams[1],target=t.heroes[1];s.hit(source,target,s.snapshot(source),'attack');s.resolveDamage();assert.ok(target.hp<80);assert.ok(!target.slowUntil);
 const before=t.center.x;s.moveTeam(t,{x:1,y:0},C.tick);assert.ok(Math.abs(t.center.x-before-C.speed*C.tick)<1e-6);
});
test('旧协同与控制觉醒不再提供或接受，保留生存护盾觉醒',()=>{
 const s=scene(),t=s.teams[0],ids=s.validAwakenings(t).map(a=>a.id);assert.ok(!ids.includes(6));assert.ok(!ids.includes(7));assert.ok(ids.includes(8));
 s.gain(t,25,'fixture');t.offer.ids=[6,7,8];assert.equal(s.choose(t,6),false);assert.equal(s.choose(t,7),false);assert.equal(s.choose(t,8),true);
});
