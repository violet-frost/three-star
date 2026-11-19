const {test}=require('node:test'),assert=require('node:assert/strict');
require('../src/config.js');require('../src/rules.js');require('../src/simulation.js');
const {Simulation,Config:C}=globalThis.ThreeStar;
function scene(){const s=new Simulation(123);s.time=10;s.frame=300;s.monsters=[];s.teams.forEach(t=>{t.controller='player';t.center={x:100,y:100};t.heroes.forEach((h,i)=>Object.assign(h,{x:100+i*30,y:100,skillReady:999}));});return s;}
test('破阵命中只强化下一发荧惑弹；蓄能叠加至4次命中',()=>{
 const s=scene(),t=s.teams[0],h=t.heroes[0],mage=t.heroes[1],enemy=s.teams[1].heroes[0];
 Object.assign(h,{x:700,y:700});Object.assign(mage,{x:680,y:730});Object.assign(enemy,{x:745,y:700});
 h.dash={dir:{x:1,y:0},remaining:120,snapshot:s.snapshot(h,1.5)};s.updateDash(h,C.tick);s.updateDash(h,C.tick);s.resolveDamage();
 assert.ok(enemy.hp<140);assert.ok(enemy.knock);assert.ok(mage.synergyUntil>s.time);assert.equal(t.synergyReady,18);
 mage.chargeUntil=s.time+4;s.execute(mage,{kind:'attack',target:enemy,snapshot:s.snapshot(mage)});
 assert.equal(s.projectiles.length,1);assert.equal(s.projectiles[0].snapshot.maxHits,4);assert.equal(s.projectiles[0].snapshot.synergy,1.3);
 assert.equal(mage.synergyUntil,0);assert.equal(mage.chargeUntil,0);
});
test('圆阵蓄能离阵保留，绊索施法者死亡后区域继续减速',()=>{
 const s=scene(),t=s.teams[0],mage=t.heroes[1],support=t.heroes[2],enemy=s.teams[1].heroes[0];
 s.execute(mage,{kind:'skill'});assert.equal(mage.chargeUntil,14);s.changeFormation(t,2);assert.equal(mage.chargeUntil,14);
 Object.assign(support,{x:700,y:700});Object.assign(enemy,{x:800,y:700});
 s.execute(support,{kind:'skill',point:{x:800,y:700},snapshot:s.snapshot(support,.8)});s.resolveDamage();
 assert.equal(s.areas.length,1);s.queueDamage(null,support,999,'storm');s.resolveDamage();assert.equal(support.hp,0);
 s.time=11;s.updateAreas();assert.ok(enemy.slowUntil>=11.5);assert.equal(s.areas.length,1);
});
test('单体弹道不能穿墙，已生成弹道不受施法者阵亡影响',()=>{
 const s=scene(),mage=s.teams[0].heroes[1],enemy=s.teams[1].heroes[0];
 Object.assign(mage,{x:990,y:950});Object.assign(enemy,{x:1410,y:950});
 s.projectiles.push({id:99,x:990,y:950,dir:{x:1,y:0},speed:420,remaining:500,source:mage,snapshot:s.snapshot(mage),hits:new Set(),dead:false});
 for(let i=0;i<40;i++)s.updateProjectiles(C.tick);s.resolveDamage();assert.equal(enemy.hp,140);assert.equal(s.projectiles.length,0);
 Object.assign(mage,{x:700,y:700});Object.assign(enemy,{x:790,y:700});s.execute(mage,{kind:'attack',target:enemy,snapshot:s.snapshot(mage)});s.queueDamage(null,mage,999,'storm');s.resolveDamage();
 for(let i=0;i<10;i++)s.updateProjectiles(C.tick);s.resolveDamage();assert.ok(enemy.hp<140);
});
test('同批死亡护盾不能挽回死者，仅保护剩余英雄',()=>{
 const s=scene(),t=s.teams[0];t.stacks[8]=1;s.queueDamage(null,t.heroes[0],999,'storm');s.queueDamage(null,t.heroes[1],999,'storm');s.resolveDamage();
 assert.equal(t.heroes[0].hp,0);assert.equal(t.heroes[1].hp,0);assert.equal(t.heroes[2].shield,20);assert.equal(t.heroes[2].shieldUntil,13);
});
test('精英固定波次不堆叠，死亡点仅下一波补刷',()=>{
 const s=scene();s.time=44.96666666666667;s.frame=1349;s.step();assert.equal(s.monsters.filter(m=>m.type==='elite').length,4);
 s.time=89.96666666666667;s.frame=2699;s.step();assert.equal(s.monsters.filter(m=>m.type==='elite').length,4);
 const m=s.monsters[0];s.queueDamage(null,m,999,'storm');s.resolveDamage();s.time=134.96666666666667;s.frame=4049;s.step();
 assert.equal(s.monsters.filter(m=>m.type==='elite'&&m.hp>0).length,4);assert.equal(s.monsters.length,5);
});
test('英雄死亡后候选变灰；10秒超时只选择仍有效觉醒',()=>{
 const s=scene(),t=s.teams[0];s.gain(t,25,'fixture');t.offer.ids=[6,7,0];s.queueDamage(null,t.heroes[2],999,'storm');s.resolveDamage();
 assert.equal(s.choose(t,7),false);s.time=20;s.updateChoices();assert.equal(t.pending,0);assert.ok(t.stacks[6]||t.stacks[0]);
});
test('低血量AI会撤离精英，不持续近战送死',()=>{
 const s=scene(),t=s.teams[0];t.center={x:700,y:700};t.heroes.forEach((h,i)=>Object.assign(h,{x:700+i*25,y:700,hp:10}));
 s.spawnMonster('elite',{x:760,y:700},0);s.monsters[0].target=t.heroes[0];s.decide(t);assert.equal(t.aiState,'撤退');assert.ok(t.goal.x<700);assert.equal(t.formation,1);
});
