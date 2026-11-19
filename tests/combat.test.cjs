const {test}=require('node:test'),assert=require('node:assert/strict');
require('../src/config.js');require('../src/rules.js');require('../src/simulation.js');
const {Simulation,Config:C}=globalThis.ThreeStar;
function scene(){const s=new Simulation(123);s.time=10;s.frame=300;s.monsters=[];s.teams.forEach(t=>{t.controller='player';t.center={x:100,y:100};t.heroes.forEach((h,i)=>Object.assign(h,{x:100+i*30,y:100}));});return s;}
test('第三发强化弹穿透两个目标均为双伤，一次发射只累计一次',()=>{
 const s=scene(),mage=s.teams[0].heroes[1],[warrior,enemyMage]=s.teams[1].heroes;
 Object.assign(mage,{x:700,y:700,fireballCount:2});Object.assign(warrior,{x:780,y:700});Object.assign(enemyMage,{x:810,y:700});
 s.execute(mage,{kind:'attack',target:warrior,snapshot:s.snapshot(mage)});
 for(let i=0;i<10;i++)s.updateProjectiles(C.tick);s.resolveDamage();
 assert.equal(warrior.hp,99.2);assert.equal(enemyMage.hp,24.8);assert.equal(mage.fireballCount,0);
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
test('已停用觉醒不能选择；10秒超时只选择有效觉醒',()=>{
 const s=scene(),t=s.teams[0];s.gain(t,25,'fixture');t.offer.ids=[6,7,0];s.queueDamage(null,t.heroes[2],999,'storm');s.resolveDamage();
 assert.equal(s.choose(t,7),false);s.time=20;s.updateChoices();assert.equal(t.pending,0);assert.equal(t.stacks[0],1);
});
test('低血量AI会撤离精英，不持续近战送死',()=>{
 const s=scene(),t=s.teams[0];t.center={x:700,y:700};t.heroes.forEach((h,i)=>Object.assign(h,{x:700+i*25,y:700,hp:10}));
 s.spawnMonster('elite',{x:760,y:700},0);s.monsters[0].target=t.heroes[0];s.decide(t);assert.equal(t.aiState,'撤退');assert.ok(t.goal.x<700);assert.equal(t.formation,1);
});
