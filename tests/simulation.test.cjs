const {test}=require('node:test'),assert=require('node:assert/strict');
require('../src/config.js');require('../src/rules.js');require('../src/simulation.js');
const {Simulation,Config:C,Rules:R}=globalThis.ThreeStar;
function quiet(seed=42){const s=new Simulation(seed);s.monsters=[];s.drops=[];s.generated=0;s.teams.forEach(t=>t.controller='player');return s;}
function advance(s,seconds,input={x:0,y:0}){for(let i=0;i<Math.round(seconds*30);i++)s.step(C.tick,input);}
test('直线与斜线十秒均移动1800，松杆中心立即停止',()=>{
 const obstacles=C.map.obstacles;C.map.obstacles=[];
 try{
 for(const v of [{x:1,y:0},{x:1,y:1}]){
  const s=quiet();const t=s.teams[0];t.center={x:120,y:120};t.heroes.forEach((h,i)=>{h.x=100+i*25;h.y=120;});
  const p={...t.center};advance(s,10,v);assert.ok(Math.abs(R.distance(t.center,p)-1800)<.01);
  const x=t.center.x,y=t.center.y;s.step(C.tick,{x:0,y:0});assert.equal(t.center.x,x);assert.equal(t.center.y,y);
 }
 }finally{C.map.obstacles=obstacles;}
});
test('切阵保留独立攻击和技能冷却，1秒内拒绝再次切换',()=>{
 const s=quiet(),t=s.teams[0];t.heroes[0].skillReady=8;t.heroes[0].attackReady=2;
 assert.equal(s.changeFormation(t,1),true);assert.equal(s.changeFormation(t,2),false);
 assert.equal(t.heroes[0].skillReady,8);assert.equal(t.heroes[0].attackReady,2);
 advance(s,1.01);assert.equal(s.changeFormation(t,2),true);
});
test('同帧全灭不会按处理顺序制造幸存者，31尘掉落15',()=>{
 const s=quiet();s.time=10;const a=s.teams[0],b=s.teams[1];a.carried=31;a.earned=31;
 s.generated=31;a.heroes.forEach(h=>s.queueDamage(null,h,999,'storm'));b.heroes.forEach(h=>s.queueDamage(null,h,999,'storm'));
 s.resolveDamage();assert.notEqual(a.eliminatedAt,null);assert.notEqual(b.eliminatedAt,null);
 assert.equal(s.drops.filter(d=>d.value===15).length,1);assert.equal(s.removed,16);assert.equal(s.resourceBalance(),0);
});
test('单包仅拾取一次且累计与携带同时增加；超门槛觉醒排队',()=>{
 const s=quiet();s.time=10;const t=s.teams[0];s.addDrop(t.heroes[0],54);s.pickup();s.pickup();
 assert.equal(t.carried,54);assert.equal(t.earned,54);assert.equal(t.issued,2);assert.equal(t.pending,2);
 assert.equal(t.offer.ids.length,3);assert.equal(new Set(t.offer.ids).size,3);
 assert.equal(s.choose(t,t.offer.ids[0]),true);assert.equal(t.pending,1);assert.ok(t.offer);
});
test('星核争夺暂停、离场后续占、受伤中断、完成后45秒刷新',()=>{
 const s=quiet();s.time=45;s.core.active=true;const a=s.teams[0],b=s.teams[1];
 a.heroes.forEach(h=>Object.assign(h,{x:1200,y:1600}));b.heroes.forEach(h=>Object.assign(h,{x:1500,y:1600}));
 s.updateCore(1.2);b.heroes[0].x=1200;s.updateCore(.8);assert.equal(s.core.progress[0],1.2);
 b.heroes[0].x=1500;s.updateCore(.8);assert.equal(a.carried,15);assert.equal(s.core.next,90);
 s.core.active=true;s.core.progress[0]=1.9;s.queueDamage(b.heroes[0],a.heroes[0],1,'attack');s.resolveDamage();
 s.updateCore(.1);assert.equal(s.core.progress[0],0);assert.equal(a.carried,15);
});
test('圆阵单体弹道分摊，穿透不分摊',()=>{
 const s=quiet();s.time=10;const a=s.teams[0],b=s.teams[1];a.formation=1;
 a.heroes.forEach((h,i)=>Object.assign(h,{x:800+i*24,y:800}));const [x,h,y]=a.heroes;
 s.hit(b.heroes[2],h,{atk:8,formation:.95,skill:1,synergy:1,maxHits:1,slow:0},'attack');s.resolveDamage();
 assert.equal(h.hp,76.28);assert.equal(x.hp,139.2);assert.equal(y.hp,79.2);
 s.hit(b.heroes[1],h,{atk:20,formation:1.1,skill:1,synergy:1,maxHits:2,slow:0},'attack');s.resolveDamage();
 assert.equal(h.hp,56.92);assert.equal(x.hp,139.2);assert.equal(y.hp,79.2);
});
test('出生保护跳过伤害；180秒冻结全部后续事件',()=>{
 const s=quiet(),h=s.teams[0].heroes[0];s.queueDamage(null,h,100,'storm');s.resolveDamage();assert.equal(h.hp,140);
 advance(s,180);const time=s.time,hp=h.hp;s.step(C.tick,{x:1,y:0});assert.equal(s.time,time);assert.equal(h.hp,hp);assert.ok(s.ended);
});
test('暗幕跨125秒阶段积分，无视护盾，不因每帧舍入多扣生命',()=>{
 const s=quiet();s.time=124;s.frame=3720;const t=s.teams[0];t.center={x:120,y:120};
 for(const h of t.heroes)Object.assign(h,{x:120,y:120,hp:10000,maxHp:10000,shield:20,shieldUntil:200});
 advance(s,1);for(const h of t.heroes)assert.ok(Math.abs(h.hp-9995)<.02,h.hp);
 advance(s,1);for(const h of t.heroes){assert.ok(Math.abs(h.hp-9985)<.02,h.hp);assert.equal(h.shield,20);}
});
test('固定种子20局资源守恒、无非法数值、均能结束',()=>{
 for(let seed=1;seed<=20;seed++){
  const s=new Simulation(seed);s.teams[0].controller='ai';advance(s,180);
  assert.ok(s.ended,'seed '+seed);assert.equal(s.resourceBalance(),0,'资源 seed '+seed);
  for(const t of s.teams)for(const h of t.heroes){assert.ok(Number.isFinite(h.x)&&Number.isFinite(h.y)&&Number.isFinite(h.hp));assert.ok(h.hp>=0);}
  assert.equal(s.rankings.length,4);
 }
});
test('随机散落星尘初始数量、可拾取与资源守恒',()=>{
 const s=new Simulation(42);const drops=s.drops.filter(d=>d.origin==='scatter');
 assert.equal(drops.length,80);assert.equal(s.generated,80);assert.equal(s.resourceBalance(),0);
 for(const d of drops){assert.equal(d.value,1);assert.equal(R.walkable(d,28),true);}
 const t=s.teams[0],d=drops[0];Object.assign(t.heroes[0],{x:d.x,y:d.y});s.pickup();
 assert.ok(t.carried>=1);assert.equal(t.carried,t.earned);assert.equal(s.resourceBalance(),0);
});
test('散落星尘按20秒补充，遵守上限、确定种子与安全区',()=>{
 const a=new Simulation(112),b=new Simulation(112);assert.deepEqual(a.drops,b.drops);
 a.time=20;a.refreshScatter();assert.equal(a.drops.filter(d=>d.origin==='scatter').length,92);
 a.time=40;a.refreshScatter();assert.equal(a.drops.filter(d=>d.origin==='scatter').length,100);
 a.drops=a.drops.filter(d=>d.origin!=='scatter');a.time=140;a.refreshScatter();
 assert.equal(a.drops.length,12);for(const d of a.drops)assert.ok(R.distance(d,C.map.center)<=R.safeRadius(140)-C.scatter.safeMargin);
});
