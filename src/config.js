/* 数值修改入口。运行时不依赖构建工具，经典脚本兼容 file://。 */
(function(G){
  'use strict';
  const T=G.ThreeStar=G.ThreeStar||{};
  T.Config={
    version:'0.2.1-web',tick:1/30,duration:180,countdown:3,protection:3,
    speed:180,heroRadius:12,centerRadius:90,formationCooldown:1,formationBlend:.3,
    followSpeed:360,followStep:12,returnDistance:220,searchRadius:220,searchInterval:.2,
    pickupRadius:28,awakeningStep:25,awakeningCap:6,choiceTimeout:10,
    scatter:{enabled:true,initial:80,interval:20,batch:12,value:1,maxGround:100,safeMargin:70,minSpacing:65},
    core:{first:45,respawn:45,capture:2,radius:60,reward:15,interrupt:.5},
    storm:{start:105,final:150,startRadius:2000,endRadius:260,stages:[[105,5],[125,10],[150,20]]},
    map:{width:2400,height:3200,center:{x:1200,y:1600},
      spawns:[{x:400,y:500},{x:2000,y:500},{x:400,y:2700},{x:2000,y:2700}],
      camps:[{x:600,y:800},{x:1800,y:800},{x:600,y:2400},{x:1800,y:2400}],
      elites:[{x:900,y:1200},{x:1500,y:1200},{x:900,y:2000},{x:1500,y:2000}],
      obstacles:[{x:1000,y:850,w:400,h:200},{x:1000,y:2150,w:400,h:200},{x:350,y:1400,w:200,h:400},{x:1850,y:1400,w:200,h:400}]},
    formations:[
      {id:0,name:'楔形',role:'进攻',icon:'△',attack:1.1,defense:1,move:1,coverage:1,slots:[[0,40],[-24,0],[24,-40]],duo:[[0,24],[0,-24]],description:'集火突破 · 镇星自动突进'},
      {id:1,name:'圆阵',role:'防守',icon:'◉',attack:.9,defense:1.2,move:.9,coverage:1,slots:[[0,36],[-31,-18],[31,-18]],duo:[[-24,0],[24,0]],description:'单体弹道分摊 · 荧惑蓄能'},
      {id:2,name:'横阵',role:'分散',icon:'↔',attack:.95,defense:1,move:1,coverage:1.2,slots:[[0,0],[-72,0],[72,0]],duo:[[-48,0],[48,0]],description:'远程覆盖扩大 · 重华释放绊索'}],
    heroes:[
      {id:0,name:'镇星',role:'前排 / 突进',hp:140,atk:12,def:8,interval:1,range:45,windup:.15,recovery:.2,projectileSpeed:0,maxHits:Infinity,skill:'破阵',skillCd:6,skillWindup:.15,skillRecovery:.2,skillMin:60,skillRange:160,dashSpeed:600,dashDistance:120,skillDamage:1.5,knockback:40},
      {id:1,name:'荧惑',role:'法师 / 穿透',hp:80,atk:20,def:2,interval:1.5,range:180,windup:.2,recovery:.25,projectileSpeed:420,maxHits:2,skill:'蓄能',skillCd:8,skillWindup:.3,skillRecovery:0,chargeWait:2,markDuration:4},
      {id:2,name:'重华',role:'辅助 / 控场',hp:80,atk:8,def:3,interval:1.2,range:150,windup:.15,recovery:.2,projectileSpeed:360,maxHits:1,skill:'绊索',skillCd:10,skillWindup:.25,skillRecovery:.2,skillRadius:70,skillDuration:3,skillDamage:.8,slowDuration:1.5,areaLinger:.5}],
    synergy:{cooldown:8,duration:4,damage:1.3,pierce:1},
    monsters:{normal:{hp:40,atk:6,def:0,speed:100,interval:1.2,windup:.2,range:30,radius:12,aggro:160,leash:260,reward:3},elite:{hp:160,atk:12,def:4,speed:120,interval:1.5,windup:.3,range:40,radius:20,aggro:180,leash:300,reward:10},waves:[45,90,135],returnSpeed:180},
    ai:{interval:1,retreat:.30,exit:.35,strengthRatio:1.25,chase:300,chaseTimeout:5,hold:2},
    teams:[{name:'星火小队',color:'#69d5fb',symbol:'◆'},{name:'赤曜小队',color:'#ff7679',symbol:'▲'},{name:'翠羽小队',color:'#8cde92',symbol:'✦'},{name:'紫鸢小队',color:'#c09bff',symbol:'●'}],
    awakenings:[
      {id:0,code:'A01',name:'锐意',icon:'⚔',category:'战斗',max:3,value:.10,description:'全队基础攻击力 +10%'},
      {id:1,code:'A02',name:'疾攻',icon:'»',category:'战斗',max:3,value:.10,description:'全队攻击速度 +10%'},
      {id:2,code:'A03',name:'生机',icon:'✚',category:'战斗',max:3,value:15,description:'存活英雄生命上限与当前生命 +15'},
      {id:3,code:'A04',name:'锋势',icon:'△',category:'阵型',max:3,value:.10,description:'楔形阵攻击倍率 +0.10'},
      {id:4,code:'A05',name:'坚守',icon:'◈',category:'阵型',max:3,value:.10,description:'圆阵防御倍率 +0.10'},
      {id:5,code:'A06',name:'展翼',icon:'↔',category:'阵型',max:3,value:.20,description:'横阵远程基础覆盖额外 +20%'},
      {id:6,code:'A07',name:'共鸣',icon:'✧',category:'协同',max:3,value:.15,requires:[0,1],description:'破阵集火伤害倍率 +0.15'},
      {id:7,code:'A08',name:'缠绕',icon:'❧',category:'协同',max:3,value:1,requires:[2],description:'重华普攻减速、绊索离场减速 +1秒'},
      {id:8,code:'A09',name:'余荧惑守护',icon:'◇',category:'协同',max:1,value:20,duration:3,description:'英雄阵亡后，存活队友获得20护盾，持续3秒'}]
  };
})(globalThis);
