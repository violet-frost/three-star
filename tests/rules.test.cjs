const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../src/config.js');
require('../src/rules.js');
const {Rules:R,Config:C}=globalThis.ThreeStar;
test('伤害核算：普通攻击、阵型倍率及强化弹',()=>{
 assert.equal(R.damage(20,8*1.2,1,1.5,1),15.6);
 assert.equal(R.damage(12,3,1,1),9);
 assert.equal(R.damage(22,2,2,1.5),60);
 assert.equal(R.damage(1,99,1,.8,1),.8);
});
test('楔形第三发伤害恰为同目标普通火焰弹两倍',()=>{
 const atk=C.heroes[1].atk,def=C.heroes[0].def*C.formations[1].defense;
 const normal=R.damage(atk,def,1,C.formations[0].attack);
 assert.equal(R.damage(atk,def,2,C.formations[0].attack),normal*2);
});

test('暗幕阶段和最终圈边界',()=>{
  assert.equal(R.safeRadius(105),2000); assert.equal(R.safeRadius(150),260);
  assert.equal(R.safeRadius(180),260);assert.equal(R.stormDps(124.99),5);
  assert.equal(R.stormDps(125),10);assert.equal(R.stormDps(150),20);
});
test('并列名次采用竞赛排名，ID不能决定胜利',()=>{
  const team=(id,dust,alive=3)=>({id,carried:dust,heroes:Array.from({length:alive},()=>({hp:10})),teamKills:0,eliminatedAt:null});
  const a=team(9,20),b=team(1,20),c=team(2,10),d=team(3,8,0);d.eliminatedAt=80;d.dustBefore=8;d.aliveBefore=1;
  assert.deepEqual(R.rank([a,b,c,d]).map(x=>[x.team.id,x.rank]),[[1,1],[9,1],[2,3],[3,4]]);
});
test('同帧全灭优先星尘和帧前人数',()=>{
 const a={id:0,carried:0,dustBefore:12,aliveBefore:2,teamKills:0,eliminatedAt:100,heroes:[]};
 const b={...a,id:1,dustBefore:11};assert.equal(R.rank([b,a])[0].team.id,0);
});
test('对角归一化、矩形遮挡和合法投影',()=>{
 const d=R.normalize(1,1);assert.ok(Math.abs(Math.hypot(d.x,d.y)-1)<1e-10);
 assert.equal(R.lineClear({x:900,y:950},{x:1500,y:950}),false);
 assert.equal(R.lineClear({x:900,y:700},{x:1500,y:700}),true);
 const p=R.project({x:1200,y:950},12);assert.equal(R.walkable(p,12),true);
});
test('配置满足文档固定规模',()=>{
 assert.equal(C.heroes.length,3);assert.equal(C.awakenings.length,9);
 assert.equal(C.duration,180);assert.equal(C.map.width,2400);assert.equal(C.map.height,3200);
});
