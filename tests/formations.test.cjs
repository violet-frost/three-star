const {test}=require('node:test'),assert=require('node:assert/strict');
require('../src/config.js');require('../src/rules.js');require('../src/simulation.js');
const {Simulation,Config:C}=globalThis.ThreeStar;
function scene(){const s=new Simulation(725);s.time=10;s.frame=300;s.monsters=[];s.teams.forEach(t=>t.controller='player');return s;}
function advance(s,seconds){for(let i=0;i<Math.round(seconds*30);i++)s.step();}
test('新版倍率、显示顺序与默认楔形',()=>{
 assert.deepEqual(C.formationOrder,[1,0,2]);assert.equal(new Simulation(1).teams[0].formation,0);
 assert.deepEqual(C.formations.map(f=>[f.attack,f.defense,f.move]),[[1.5,.8,1],[1,1.2,1],[.8,1,1]]);
 assert.equal(C.formations[2].icon,'sprout');
});
test('圆阵由镇星承受普攻、穿透、野怪与暗幕，伤害按镇星防御计算',()=>{
 const s=scene(),t=s.teams[0],[tank,mage,support]=t.heroes,source=s.teams[1].heroes[1];t.formation=1;
 for(const kind of ['attack','attack','melee','monster'])s.hit(source,mage,{atk:20,formation:1,bonus:1,maxHits:2},kind);
 s.queueDamage(null,support,5,'storm');s.resolveDamage();
 assert.equal(mage.hp,80);assert.equal(support.hp,80);assert.equal(tank.hp,93.4);
 assert.equal(s.teams[1].damage,41.6);assert.equal(tank.lastEnemy,1);
});
test('圆阵镇星倒下后同批后续命中恢复原目标承伤；暗幕不走护盾',()=>{
 const s=scene(),t=s.teams[0],[tank,mage]=t.heroes;t.formation=1;tank.hp=1;tank.shield=20;
 s.queueDamage(null,mage,5,'storm');s.queueDamage(null,mage,7,'storm');s.resolveDamage();
 assert.equal(tank.hp,0);assert.equal(tank.shield,20);assert.equal(mage.hp,73);
});
test('楔形第三发双伤且切阵保留计数',()=>{
 const s=scene(),t=s.teams[0],tank=t.heroes[0],mage=t.heroes[1],enemy=s.teams[1].heroes[0];
 Object.assign(tank,{x:700,y:700});Object.assign(mage,{x:700,y:730});Object.assign(enemy,{x:800,y:700});
 const fire=()=>{s.execute(mage,{kind:'attack',target:enemy,snapshot:s.snapshot(mage)});return s.projectiles.at(-1);};
 assert.equal(fire().snapshot.bonus,1);assert.equal(fire().snapshot.bonus,1);assert.equal(mage.fireballCount,2);
 s.changeFormation(t,1);assert.equal(fire().snapshot.bonus,1);assert.equal(mage.fireballCount,2);
 s.time+=1;s.changeFormation(t,0);const third=fire();assert.equal(third.snapshot.bonus,2);assert.equal(third.snapshot.charged,true);assert.equal(mage.fireballCount,0);
 assert.equal(third.snapshot.maxHits,2);assert.equal(fire().snapshot.bonus,1);
 const count=mage.fireballCount;enemy.hp=0;fire();assert.equal(mage.fireballCount,count);
});
test('横阵每累计一秒治疗最低血量受伤队友2点，切阵不刷治疗',()=>{
 const s=scene(),t=s.teams[0],[tank,mage,support]=t.heroes;t.formation=2;tank.hp=25;mage.hp=10;support.hp=30;
 advance(s,.5);assert.equal(mage.hp,10);advance(s,.5);assert.equal(mage.hp,12);assert.equal(tank.hp,25);
 t.formation=0;advance(s,1);assert.equal(mage.hp,12);t.formation=2;advance(s,1);assert.equal(mage.hp,14);
 assert.ok(s.events.some(e=>e.type==='heal'&&e.target===mage.id&&e.amount===2));
});
test('复苏支持自疗、上限截断，重华阵亡与离开横阵立即停疗',()=>{
 const s=scene(),t=s.teams[0],[tank,mage,support]=t.heroes;t.formation=2;support.hp=79;
 advance(s,1);assert.equal(support.hp,80);tank.hp=139;advance(s,1);assert.equal(tank.hp,140);
 mage.hp=10;s.queueDamage(null,support,999,'storm');s.resolveDamage();advance(s,2);assert.equal(mage.hp,10);assert.equal(support.hp,0);
});
