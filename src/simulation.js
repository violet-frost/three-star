(function(G){
  'use strict';
  const T=G.ThreeStar,C=T.Config,R=T.Rules,EPS=1e-7;
  class Simulation{
    constructor(seed=Date.now()){
      this.seed=seed>>>0;this.random=R.rng(this.seed);this.time=0;this.frame=0;this.id=0;this.ended=false;
      this.events=[];this.logs=[];this.effects=[];this.projectiles=[];this.projectilePool=[];this.areas=[];this.drops=[];this.monsters=[];this.damageQueue=[];
      this.generated=0;this.removed=0;this.wave=0;this.nextSearch=0;this.tutorial={move:0,formation:false,damage:false,dust:false};
      this.core={active:false,next:C.core.first,progress:[0,0,0,0],lock:[0,0,0,0],contested:false};
      const spawns=R.shuffle(C.map.spawns,this.random);
      this.teams=C.teams.map((base,i)=>{
        const t={...base,id:i,controller:i?'ai':'player',center:{...spawns[i]},facing:R.normalize(C.map.center.x-spawns[i].x,C.map.center.y-spawns[i].y),formation:0,formationReady:0,changedAt:-1,circleSince:Infinity,carried:0,earned:0,issued:0,pending:0,offer:null,stacks:Array(9).fill(0),heroes:[],heroKills:0,teamKills:0,damage:0,eliminatedAt:null,dustBefore:0,aliveBefore:3,synergyReady:0,aiNext:0,goal:null,path:[],pathTarget:null,aiState:'刷野',lastCombat:-10,formationTime:[0,0,0]};
        t.heroes=C.heroes.map((cfg,j)=>({id:++this.id,kind:'hero',heroType:j,team:i,cfg,hp:cfg.hp,maxHp:cfg.hp,x:t.center.x,y:t.center.y,radius:C.heroRadius,facing:{...t.facing},attackReady:0,skillReady:0,recoveryUntil:0,action:null,dash:null,knock:null,knockImmune:0,slowUntil:0,shield:0,shieldUntil:0,chargeUntil:0,synergyUntil:0,synergyValue:1,hitAt:-10,deadAt:null,lastEnemy:null,lastEnemyAt:-10,recentDamage:[],target:null,moving:false,slot:null}));
        const slots=C.formations[0].slots;t.heroes.forEach((h,j)=>Object.assign(h,this.slotPosition(t,slots[j])));return t;
      });
      C.map.camps.forEach((camp,i)=>{for(const dx of [-60,60])for(const dy of [-60,60])this.spawnMonster('normal',{x:camp.x+dx,y:camp.y+dy},i);});
      this.emit('match_start',{seed:this.seed,config:C.version});
      this.nextScatter=C.scatter.interval;if(C.scatter.enabled)this.spawnScatter(C.scatter.initial,true);
    }
    emit(type,data={}){const e={type,time:R.round(this.time),seq:++this.id,...data};this.events.push(e);if(this.events.length>200)this.events.shift();this.logs.push(e);return e;}
    fx(kind,pos,data={}){this.effects.push({kind,x:pos.x,y:pos.y,start:this.time,duration:.6,...data});}
    spawnMonster(type,pos,camp){const cfg=C.monsters[type];this.monsters.push({id:++this.id,kind:'monster',type,cfg,team:-1,x:pos.x,y:pos.y,home:{...pos},camp,hp:cfg.hp,maxHp:cfg.hp,radius:cfg.radius,facing:{x:0,y:1},attackReady:0,action:null,target:null,returning:false,homeAt:null,lastCombat:0,hitAt:-10,deadAt:null,slowUntil:0,shield:0,moving:false});}
    slotPosition(t,slot){return {x:t.center.x-t.facing.y*slot[0]+t.facing.x*slot[1],y:t.center.y+t.facing.x*slot[0]+t.facing.y*slot[1]};}
    living(){return [...this.teams.flatMap(t=>R.alive(t)),...this.monsters.filter(m=>m.hp>0)];}
    enemies(h){return this.living().filter(e=>e.team!==h.team&&(h.kind==='hero'||e.kind==='hero'));}
    attrs(h,formation){
      if(h.kind==='monster')return {atk:h.cfg.atk,def:h.cfg.def,interval:h.cfg.interval,range:h.cfg.range,formation:1};
      const t=this.teams[h.team],f=C.formations[formation??t.formation],s=t.stacks;
      return {atk:h.cfg.atk*(1+C.awakenings[0].value*s[0]),def:h.cfg.def*(f.defense+(f.id===1?C.awakenings[4].value*s[4]:0)),interval:h.cfg.interval/(1+C.awakenings[1].value*s[1]),range:h.cfg.range*(h.heroType&&f.id===2?f.coverage*(1+C.awakenings[5].value*s[5]):1),formation:f.attack+(f.id===0?C.awakenings[3].value*s[3]:0)};
    }
    snapshot(h,skill=1){const a=this.attrs(h),t=this.teams[h.team];return {atk:a.atk,formation:a.formation,skill,synergy:1,maxHits:h.cfg.maxHits||1,slow:h.heroType===2?h.cfg.slowDuration+(t?.stacks[7]||0)*C.awakenings[7].value:0,range:a.range};}
    changeFormation(t,id){
      if(this.ended||t.eliminatedAt!=null||id===t.formation||id<0||id>2||this.time+EPS<t.formationReady)return false;
      const from=t.formation;t.formation=id;t.formationReady=this.time+C.formationCooldown;t.changedAt=this.time;t.circleSince=id===1?this.time:Infinity;
      t.heroes.forEach(h=>h.blendFrom={x:h.x,y:h.y});this.emit('formation_changed',{team:t.id,from,to:id});this.fx('formation',t.center,{team:t.id,duration:.3});if(t.id===0)this.tutorial.formation=true;return true;
    }
    step(dt=C.tick,input={x:0,y:0}){
      if(this.ended)return;const prev=this.time;this.time=Math.min(C.duration,(this.frame+1)*C.tick);dt=this.time-prev;this.frame++;
      this.frameAlive=this.teams.map(t=>R.alive(t).length);
      this.refreshScatter();
      while(this.wave<C.monsters.waves.length&&this.time+EPS>=C.monsters.waves[this.wave]){
        C.map.elites.forEach((p,i)=>{if(!this.monsters.some(m=>m.type==='elite'&&m.camp===i&&m.hp>0))this.spawnMonster('elite',p,i);});this.wave++;this.emit('elite_wave',{wave:this.wave});this.wakeAI();
      }
      if(!this.core.active&&this.time+EPS>=this.core.next){this.core.active=true;this.emit('core_spawn');this.fx('core',C.map.center,{duration:1.5});this.wakeAI();}
      for(const threshold of [100,105,145,150])if(prev<threshold&&this.time>=threshold)this.emit('phase',{phase:threshold});
      for(const t of this.teams){
        if(t.eliminatedAt!=null)continue;
        t.formationTime[t.formation]+=dt;
        if(t.controller==='ai'&&this.time+EPS>=t.aiNext){this.decide(t);t.aiNext=this.time+C.ai.interval;}
        this.moveTeam(t,t.controller==='ai'?this.aiInput(t):input,dt);
      }
      this.moveMonsters(dt);
      this.separate();
      if(this.time+EPS>=this.nextSearch){this.search();this.nextSearch=this.time+C.searchInterval;}
      for(const h of this.living())this.updateAction(h,dt);
      this.updateProjectiles(dt);this.updateAreas();
      // Integrate exact stage overlap (not a whole-second damage pulse).
      if(this.time>C.storm.start){
        for(const h of this.teams.flatMap(t=>R.alive(t)))if(R.distance(h,C.map.center)>R.safeRadius(this.time)){
          let amount=0;const boundaries=[prev,...C.storm.stages.map(s=>s[0]).filter(x=>x>prev&&x<this.time),this.time];
          for(let j=1;j<boundaries.length;j++)amount+=(boundaries[j]-boundaries[j-1])*R.stormDps((boundaries[j]+boundaries[j-1])/2);
          const accumulated=amount+(h.stormRemainder||0),quantized=Math.floor((accumulated+EPS)*100)/100;h.stormRemainder=accumulated-quantized;
          if(quantized)this.queueDamage(null,h,quantized,'storm');
        }
      }
      this.resolveDamage();this.pickup();this.updateCore(dt);this.updateChoices();
      this.effects=this.effects.filter(e=>this.time-e.start<e.duration);
      const alive=this.teams.filter(t=>t.eliminatedAt==null).length;
      if(alive<=1||this.time+EPS>=C.duration)this.finish(alive===0?'all_dead':alive===1?'last_team':'time');
    }
    moveTeam(t,input,dt){
      const n=Math.hypot(input.x,input.y),dir=n>.15?R.normalize(input.x,input.y):{x:0,y:0},alive=R.alive(t);
      const slowed=alive.some(h=>h.slowUntil>this.time),speed=C.speed*C.formations[t.formation].move*(alive.length===1?1.1:1)*(slowed?.7:1),old={...t.center};
      if(n>.15)t.facing=dir;
      t.center=R.move(t.center,dir.x*speed*dt,dir.y*speed*dt,C.centerRadius);
      if(t.id===0)this.tutorial.move+=R.distance(old,t.center);
      const slots=alive.length===3?C.formations[t.formation].slots:alive.length===2?C.formations[t.formation].duo:[[0,0]];
      alive.forEach((h,i)=>{
        if(h.shieldUntil<=this.time)h.shield=0;
        if(h.knock||h.dash)return;
        let goal=R.project(this.slotPosition(t,slots[i]),h.radius);h.slot=goal;
        const blend=R.clamp((this.time-t.changedAt)/C.formationBlend,0,1);
        if(blend<1&&h.blendFrom)goal=R.project({x:h.blendFrom.x+(goal.x-h.blendFrom.x)*blend,y:h.blendFrom.y+(goal.y-h.blendFrom.y)*blend},h.radius);
        if(!R.lineClear(h,goal,h.radius)){
          if(!h.routeAt||this.time>=h.routeAt){h.route=R.route(h,goal,h.radius);h.routeAt=this.time+.4;}
          while(h.route?.length&&R.distance(h,h.route[0])<10)h.route.shift();if(h.route?.length)goal=h.route[0];
        }else h.route=null;
        const d=R.distance(h,goal),v=R.normalize(goal.x-h.x,goal.y-h.y),step=Math.min(d,C.followStep,Math.max(speed*2,C.followSpeed)*(h.slowUntil>this.time?.7:1)*dt),p=R.move(h,v.x*step,v.y*step,h.radius);
        h.moving=R.distance(h,p)>.1;if(h.moving)h.facing=v;h.x=p.x;h.y=p.y;
      });
    }
    separate(){
      const units=this.living();for(let iter=0;iter<2;iter++)for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
        const a=units[i],b=units[j],d=R.distance(a,b),gap=a.radius+b.radius;
        if(d<gap-.05){const dir=d>EPS?{x:(b.x-a.x)/d,y:(b.y-a.y)/d}:{x:a.id%2?1:-1,y:0},push=(gap-d)/2+.01;
          Object.assign(a,R.move(a,-dir.x*push,-dir.y*push,a.radius));Object.assign(b,R.move(b,dir.x*push,dir.y*push,b.radius));}
      }
    }
    moveMonsters(dt){
      const heroes=this.teams.flatMap(t=>R.alive(t));
      for(const m of this.monsters){
        if(m.hp<=0)continue;m.moving=false;
        if(m.target&&(m.target.hp<=0||R.distance(m.target,m.home)>m.cfg.leash||this.time-m.lastCombat>=5)){m.target=null;m.returning=true;m.action=null;}
        if(!m.returning&&!m.target){const near=heroes.filter(h=>R.distance(h,m)<=m.cfg.aggro).sort((a,b)=>R.distance(a,m)-R.distance(b,m)||a.id-b.id)[0];if(near){m.target=near;m.lastCombat=this.time;}}
        let goal=null;
        if(m.returning){goal=m.home;if(R.distance(m,m.home)<3){m.homeAt??=this.time;if(this.time-m.homeAt>=1){m.hp=m.maxHp;m.returning=false;m.homeAt=null;}}}
        else if(m.target&&R.distance(m,m.target)>m.cfg.range-3)goal=m.target;
        else if(!m.target){m.patrol??={x:m.home.x+(this.random()-.5)*40,y:m.home.y+(this.random()-.5)*40};if(R.distance(m,m.patrol)<3)m.patrol=null;goal=m.patrol;}
        if(goal&&!m.action){const dir=R.normalize(goal.x-m.x,goal.y-m.y),speed=m.returning?C.monsters.returnSpeed:m.cfg.speed*(m.slowUntil>this.time?.7:1),d=Math.min(R.distance(m,goal),speed*dt),p=R.move(m,dir.x*d,dir.y*d,m.radius);m.moving=R.distance(m,p)>.1;Object.assign(m,p);m.facing=dir;}
      }
    }
    search(){
      const live=this.living();
      for(const t of this.teams){
        if(t.eliminatedAt!=null)continue;
        const possible=live.filter(e=>e.team!==t.id&&R.distance(e,t.center)<=C.searchRadius),hostiles=possible.filter(e=>e.kind==='hero');
        const threat=e=>t.heroes.reduce((s,h)=>s+h.recentDamage.filter(d=>d.source===e.id&&this.time-d.time<=2).reduce((v,d)=>v+d.amount,0),0);
        hostiles.sort((a,b)=>threat(b)-threat(a)||R.distance(a,t.center)-R.distance(b,t.center)||a.id-b.id);
        const focus=hostiles[0]||possible.filter(e=>e.kind==='monster').sort((a,b)=>R.distance(a,t.center)-R.distance(b,t.center)||a.id-b.id)[0];t.focus=focus;
        for(const h of R.alive(t)){
          h.recentDamage=h.recentDamage.filter(d=>this.time-d.time<=2);
          const range=this.attrs(h).range,valid=e=>e&&e.hp>0&&R.distance(e,h)<=range&&R.lineClear(h,e),pool=possible.filter(valid),enemy=pool.filter(e=>e.kind==='hero');
          enemy.sort((a,b)=>R.distance(a,h)-R.distance(b,h)||a.id-b.id);
          if(t.formation===2)h.target=enemy[0];
          else h.target=valid(focus)?focus:null;
          h.target??=enemy.sort((a,b)=>threat(b)-threat(a)||R.distance(a,h)-R.distance(b,h)||a.id-b.id)[0];
          h.target??=pool.filter(e=>e.kind==='monster').sort((a,b)=>R.distance(a,h)-R.distance(b,h)||a.id-b.id)[0]||null;
        }
      }
    }
    updateAction(h,dt){
      if(h.hp<=0)return;
      if(h.knock){const k=h.knock,step=Math.min(k.remaining,k.speed*dt);Object.assign(h,R.move(h,k.dir.x*step,k.dir.y*step,h.radius));k.remaining-=step;if(k.remaining<=EPS)h.knock=null;return;}
      if(h.dash){this.updateDash(h,dt);return;}
      if(h.action){if(this.time+EPS>=h.action.at){const a=h.action;h.action=null;this.execute(h,a);}return;}
      if(this.time<C.protection||this.time<h.recoveryUntil)return;
      if(h.kind==='monster'){
        if(h.target&&!h.returning&&R.distance(h,h.target)<=h.cfg.range&&this.time+EPS>=h.attackReady){h.action={kind:'monsterAttack',at:this.time+h.cfg.windup,target:h.target};h.attackReady=this.time+h.cfg.interval;}return;
      }
      const t=this.teams[h.team];if(R.distance(h,t.center)>C.returnDistance)return;
      if(this.time+EPS>=h.skillReady&&this.trySkill(h))return;
      const target=h.target,attrs=this.attrs(h);
      if(target?.hp>0&&R.distance(h,target)<=attrs.range&&R.lineClear(h,target)&&this.time+EPS>=h.attackReady){
        h.action={kind:'attack',at:this.time+h.cfg.windup,target,snapshot:this.snapshot(h)};h.attackReady=this.time+attrs.interval;h.facing=R.normalize(target.x-h.x,target.y-h.y);
      }
    }
    trySkill(h){
      const t=this.teams[h.team],type=h.heroType;if(t.formation!==type)return false;
      const enemy=this.teams.filter(x=>x.id!==t.id).flatMap(R.alive).filter(e=>R.lineClear(h,e)).sort((a,b)=>R.distance(a,h)-R.distance(b,h)||a.id-b.id);
      let target=null;
      if(type===0)target=enemy.find(e=>R.distance(e,h)>=h.cfg.skillMin&&R.distance(e,h)<=h.cfg.skillRange);
      if(type===1&&this.time-t.circleSince>=h.cfg.chargeWait)target=this.enemies(h).find(e=>R.distance(e,h)<=this.attrs(h).range&&R.lineClear(h,e));
      if(type===2)target=enemy.find(e=>R.distance(e,h)<=this.attrs(h).range);
      if(!target)return false;
      h.action={kind:'skill',at:this.time+h.cfg.skillWindup,target,point:{x:target.x,y:target.y},snapshot:this.snapshot(h,h.cfg.skillDamage||1)};h.skillReady=this.time+h.cfg.skillCd;
      this.fx('cast',h,{heroType:type,duration:h.cfg.skillWindup});return true;
    }
    execute(h,a){
      if(a.kind==='monsterAttack'){
        if(a.target.hp>0&&R.distance(h,a.target)<=h.cfg.range&&R.lineClear(h,a.target)){this.hit(h,a.target,{atk:h.cfg.atk,formation:1,skill:1,synergy:1},'monster');h.lastCombat=this.time;}return;
      }
      if(a.kind==='skill'){
        h.recoveryUntil=this.time+h.cfg.skillRecovery;
        if(h.heroType===0){
          if(a.target.hp<=0||R.distance(h,a.target)>h.cfg.skillRange||!R.lineClear(h,a.target))return;
          h.dash={dir:R.normalize(a.target.x-h.x,a.target.y-h.y),remaining:h.cfg.dashDistance,snapshot:a.snapshot};this.emit('skill',{team:h.team,hero:0});
        }else if(h.heroType===1){h.chargeUntil=this.time+h.cfg.markDuration;this.fx('charge',h,{duration:.5});this.emit('skill',{team:h.team,hero:1});}
        else{
          const area={id:++this.id,x:a.point.x,y:a.point.y,radius:h.cfg.skillRadius,until:this.time+h.cfg.skillDuration,source:h,snapshot:a.snapshot,linger:h.cfg.areaLinger+this.teams[h.team].stacks[7]*C.awakenings[7].value};this.areas.push(area);
          for(const e of this.enemies(h))if(R.distance(e,area)<=area.radius)this.hit(h,e,a.snapshot,'skill');this.emit('skill',{team:h.team,hero:2});
        }return;
      }
      if(a.kind==='attack'){
        h.recoveryUntil=this.time+h.cfg.recovery;const target=a.target,s=a.snapshot;
        if(target.hp<=0||R.distance(h,target)>s.range||!R.lineClear(h,target))return;
        const dir=R.normalize(target.x-h.x,target.y-h.y);h.facing=dir;
        if(h.heroType===0){
          for(const e of this.enemies(h)){const d=R.distance(h,e),v=R.normalize(e.x-h.x,e.y-h.y);if(d<=s.range&&v.x*dir.x+v.y*dir.y>=Math.SQRT1_2&&R.lineClear(h,e))this.hit(h,e,s,'melee');}
          this.fx('slash',h,{dir,duration:.22,team:h.team});
        }else{
          if(h.chargeUntil>this.time){s.maxHits++;h.chargeUntil=0;}
          if(h.synergyUntil>this.time){s.maxHits++;s.synergy=h.synergyValue;h.synergyUntil=0;}
          const p=this.projectilePool.pop()||{};Object.assign(p,{id:++this.id,x:h.x,y:h.y,dir,speed:h.cfg.projectileSpeed,remaining:s.range+40,source:h,snapshot:s,hits:new Set(),dead:false});this.projectiles.push(p);
          this.fx('muzzle',h,{heroType:h.heroType,duration:.12});
        }
        this.emit('attack',{team:h.team,hero:h.heroType});
      }
    }
    updateDash(h,dt){
      const dash=h.dash,dist=Math.min(dash.remaining,h.cfg.dashSpeed*dt),from={x:h.x,y:h.y},to=R.move(h,dash.dir.x*dist,dash.dir.y*dist,h.radius);
      const possible=this.enemies(h).map(e=>({e,...R.pointSegment(e,from,to)})).filter(o=>o.distance<=o.e.radius+h.radius).sort((a,b)=>a.t-b.t||a.e.id-b.e.id),first=possible[0];
      if(first){h.x=from.x+(to.x-from.x)*first.t;h.y=from.y+(to.y-from.y)*first.t;
        if(first.e.kind==='hero'){
          this.hit(h,first.e,dash.snapshot,'skill');this.knockback(first.e,dash.dir,h.cfg.knockback);
          const t=this.teams[h.team],mage=t.heroes[1];if(mage.hp>0&&this.time+EPS>=t.synergyReady){mage.synergyUntil=this.time+C.synergy.duration;mage.synergyValue=C.synergy.damage+C.awakenings[6].value*t.stacks[6];t.synergyReady=this.time+C.synergy.cooldown;this.fx('synergy',h,{target:mage,duration:.6});this.emit('synergy',{team:t.id});}
        }h.dash=null;
      }else{Object.assign(h,to);dash.remaining-=dist;if(dash.remaining<=EPS||R.distance(from,to)<dist*.5)h.dash=null;}
      if(!h.dash)h.recoveryUntil=this.time+h.cfg.skillRecovery;
    }
    knockback(h,dir,dist){if(this.time<h.knockImmune||this.time<C.protection)return;h.knock={dir,remaining:dist,speed:dist/.15};h.knockImmune=this.time+.5;h.action=null;h.dash=null;}
    updateProjectiles(dt){
      for(const p of this.projectiles){
        const step=Math.min(p.remaining,p.speed*dt),from={x:p.x,y:p.y},to={x:p.x+p.dir.x*step,y:p.y+p.dir.y*step};let wall=Infinity;
        // Earliest sampled wall prevents targets behind cover receiving a hit.
        for(let d=0;d<=step+1;d+=3){const q={x:from.x+p.dir.x*Math.min(step,d),y:from.y+p.dir.y*Math.min(step,d)};if(!R.walkable(q,6)){wall=Math.min(1,d/step);break;}}
        const candidates=this.enemies(p.source).filter(e=>!p.hits.has(e.id)).map(e=>({e,...R.pointSegment(e,from,to)})).filter(o=>o.distance<=o.e.radius+6&&o.t<wall).sort((a,b)=>a.t-b.t||a.e.id-b.e.id);
        for(const {e} of candidates){if(this.time<C.protection&&e.kind==='hero')continue;p.hits.add(e.id);this.hit(p.source,e,p.snapshot,'attack');if(p.hits.size>=p.snapshot.maxHits){p.dead=true;break;}}
        p.x=to.x;p.y=to.y;p.remaining-=step;if(wall!==Infinity||p.remaining<=EPS)p.dead=true;
      }
      const keep=[];for(const p of this.projectiles)if(p.dead)this.projectilePool.push(p);else keep.push(p);this.projectiles=keep;
    }
    updateAreas(){
      this.areas=this.areas.filter(a=>a.until>this.time);
      for(const a of this.areas)for(const e of this.enemies(a.source))if(R.distance(e,a)<=a.radius&&!(e.kind==='hero'&&this.time<C.protection))e.slowUntil=Math.max(e.slowUntil,this.time+a.linger);
    }
    hit(source,target,s,kind){
      if(target.hp<=0||this.time<C.protection)return;
      const def=this.attrs(target).def,total=R.damage(s.atk,def,s.skill,s.formation,s.synergy);
      const team=target.kind==='hero'?this.teams[target.team]:null,protect=team?.formation===1&&kind==='attack'&&s.maxHits===1;
      const guards=protect?R.alive(team).filter(h=>h!==target&&R.distance(h,target)<=60):[],shares=R.shares(total,guards.length,protect);
      this.queueDamage(source,target,shares[0],kind);guards.forEach((h,i)=>this.queueDamage(source,h,shares[i+1],kind));
      if(s.slow)target.slowUntil=Math.max(target.slowUntil||0,this.time+s.slow);
      if(target.kind==='monster'&&source){target.target=source;target.returning=false;target.homeAt=null;target.lastCombat=this.time;}
    }
    queueDamage(source,target,amount,kind){if(this.time<C.protection||amount<=0||target.hp<=0)return;this.damageQueue.push({source,target,amount,kind,seq:++this.id});}
    resolveDamage(){
      const aliveBefore=this.teams.map(t=>R.alive(t).length),credits=new Map();
      for(const e of this.damageQueue){
        const {source,target,kind}=e;if(target.deadAt!=null)continue;
        let amount=e.amount;const shieldLoss=kind==='storm'?0:Math.min(target.shield||0,amount);target.shield=R.round((target.shield||0)-shieldLoss);amount-=shieldLoss;
        const previous=target.hp;target.hp=Math.max(0,R.round(target.hp-amount));const hpLoss=previous-target.hp,effective=R.round(hpLoss+shieldLoss);
        if(effective<=0)continue;target.hitAt=this.time;
        if(source?.kind==='hero'){
          const t=this.teams[source.team];t.damage=R.round(t.damage+effective);t.lastCombat=this.time;
          if(source.team===0)this.tutorial.damage=true;
          if(target.kind==='hero'){
            target.lastEnemy=source.team;target.lastEnemyAt=this.time;target.recentDamage.push({source:source.id,amount:effective,time:this.time});
            const map=credits.get(target.id)||new Map(),credit=map.get(source.team)||{damage:0,seq:e.seq};credit.damage+=hpLoss;map.set(source.team,credit);credits.set(target.id,map);
            this.core.progress[target.team]=0;this.core.lock[target.team]=this.time+C.core.interrupt;this.teams[target.team].lastCombat=this.time;
          }
        }
        const recent=this.effects.findLast(x=>x.kind==='number'&&x.targetId===target.id&&this.time-x.start<=.1);
        if(recent)recent.value+=effective;else{if(this.effects.filter(x=>x.kind==='number').length>=24){const i=this.effects.findIndex(x=>x.kind==='number');this.effects.splice(i,1);}this.fx('number',target,{value:effective,team:target.team,targetId:target.id,storm:kind==='storm'});}
        this.emit('damage',{source:source?.id??null,target:target.id,kind,hp:hpLoss,shield:shieldLoss});
      }
      this.damageQueue=[];const dead=this.livingIncludingNewDead().filter(h=>h.hp<=0&&h.deadAt==null);
      for(const h of dead){
        h.deadAt=this.time;h.action=null;h.dash=null;h.knock=null;
        let killer=null;const credit=credits.get(h.id);
        if(credit?.size)killer=[...credit].sort((a,b)=>b[1].damage-a[1].damage||a[1].seq-b[1].seq)[0][0];
        else if(h.lastEnemy!=null&&this.time-h.lastEnemyAt<=5)killer=h.lastEnemy;
        h.killer=killer;this.fx('death',h,{heroType:h.heroType,team:h.team,duration:.5});
        if(h.kind==='monster'){this.addDrop(h,h.cfg.reward);this.generated+=h.cfg.reward;}
        else{if(killer!=null)this.teams[killer].heroKills++;this.emit('hero_dead',{team:h.team,hero:h.heroType,killer});}
      }
      for(const t of this.teams){
        if(t.eliminatedAt!=null)continue;const ownDead=dead.filter(h=>h.kind==='hero'&&h.team===t.id);if(!ownDead.length)continue;
        const alive=R.alive(t);
        if(!alive.length){
          t.eliminatedAt=this.time;t.dustBefore=t.carried;t.aliveBefore=aliveBefore[t.id];const drop=Math.floor(t.carried*.5);this.removed+=t.carried-drop;t.carried=0;
          const last=ownDead[ownDead.length-1];if(drop)this.addDrop(last,drop);if(last.killer!=null)this.teams[last.killer].teamKills++;
          t.offer=null;t.pending=0;this.core.progress[t.id]=0;this.emit('team_eliminated',{team:t.id,dust:t.dustBefore,drop});this.wakeAI();
        }else if(t.stacks[8])for(const h of alive){h.shield=Math.max(h.shield,C.awakenings[8].value);h.shieldUntil=this.time+C.awakenings[8].duration;}
        if(!t.heroes[0].hp||!t.heroes[1].hp)t.heroes[1].synergyUntil=0;
      }
    }
    livingIncludingNewDead(){return [...this.teams.flatMap(t=>t.heroes),...this.monsters];}
    addDrop(p,value){if(value>0)this.drops.push({id:++this.id,...R.project(p,0),value,origin:'drop'});}
    spawnScatter(count,balanced=false){
      const cfg=C.scatter,available=cfg.maxGround-this.drops.filter(d=>d.origin==='scatter').length,wanted=Math.min(count,available),radius=R.safeRadius(this.time)-cfg.safeMargin;let spawned=0;
      for(let tries=0;spawned<wanted&&tries<4000;tries++){
        let x,y;
        if(balanced){const quadrant=spawned%4;x=80+this.random()*(C.map.width/2-160)+(quadrant%2)*C.map.width/2;y=80+this.random()*(C.map.height/2-160)+Math.floor(quadrant/2)*C.map.height/2;}
        else{x=80+this.random()*(C.map.width-160);y=80+this.random()*(C.map.height-160);}
        const p={x:R.round(x),y:R.round(y)};
        if(!R.walkable(p,C.pickupRadius)||R.distance(p,C.map.center)>radius||this.drops.some(d=>R.distance(d,p)<cfg.minSpacing))continue;
        this.drops.push({id:++this.id,...p,value:cfg.value,origin:'scatter'});spawned++;
      }
      this.generated+=spawned*cfg.value;if(spawned)this.emit('dust_scattered',{count:spawned,value:cfg.value});
      return spawned;
    }
    refreshScatter(){if(!C.scatter.enabled||this.time+EPS<this.nextScatter)return;this.nextScatter=(Math.floor((this.time+EPS)/C.scatter.interval)+1)*C.scatter.interval;this.spawnScatter(C.scatter.batch);}
    gain(t,value,source){
      t.carried+=value;t.earned+=value;this.emit('dust_gain',{team:t.id,amount:value,source,C:t.carried,G:t.earned});this.fx('dust',t.center,{value,team:t.id,duration:1});if(t.id===0)this.tutorial.dust=true;
      const count=Math.min(C.awakeningCap,Math.floor(t.earned/C.awakeningStep));t.pending+=count-t.issued;t.issued=count;if(!t.offer)this.offer(t);
    }
    pickup(){
      const heroes=this.teams.flatMap(R.alive),remaining=[];
      for(const d of this.drops){const nearby=heroes.filter(h=>R.distance(h,d)<=C.pickupRadius).sort((a,b)=>R.distance(a,d)-R.distance(b,d)||a.team-b.team||a.id-b.id);if(nearby.length)this.gain(this.teams[nearby[0].team],d.value,d.origin||'drop');else remaining.push(d);}
      this.drops=remaining;
    }
    updateCore(dt){
      if(!this.core.active)return;const present=this.teams.filter(t=>t.eliminatedAt==null&&this.time>=C.protection&&R.alive(t).some(h=>R.distance(h,C.map.center)<=C.core.radius));
      const contested=present.length>=2;if(contested!==this.core.contested)this.emit('core_state',{state:contested?'contested':'open'});this.core.contested=contested;const ids=new Set(present.map(t=>t.id));
      this.teams.forEach(t=>{if(!ids.has(t.id))this.core.progress[t.id]=0;});
      if(present.length===1){const t=present[0];if(this.time+EPS>=this.core.lock[t.id])this.core.progress[t.id]+=dt;
        if(this.core.progress[t.id]+EPS>=C.core.capture){this.gain(t,C.core.reward,'core');this.generated+=C.core.reward;this.core.active=false;this.core.next=this.time+C.core.respawn;this.core.progress.fill(0);this.emit('core_captured',{team:t.id});this.fx('core',C.map.center,{duration:1.3});this.wakeAI();}}
    }
    validAwakenings(t){return C.awakenings.filter(a=>t.stacks[a.id]<a.max&&(!a.requires||a.requires.every(i=>t.heroes[i].hp>0)));}
    offer(t){if(t.pending<=0||t.eliminatedAt!=null)return;const ids=R.shuffle(this.validAwakenings(t),this.random).slice(0,3).map(a=>a.id);if(!ids.length)return;t.offer={ids,created:this.time,expires:this.time+C.choiceTimeout};this.emit('awakening_offer',{team:t.id,ids});}
    choose(t,id,auto=false){
      if(this.ended||!t.offer||!t.offer.ids.includes(id)||!this.validAwakenings(t).some(a=>a.id===id))return false;
      t.stacks[id]++;if(id===2)for(const h of R.alive(t)){h.maxHp+=C.awakenings[2].value;h.hp=Math.min(h.maxHp,h.hp+C.awakenings[2].value);}
      t.pending--;t.offer=null;this.emit('awakening_selected',{team:t.id,id,stack:t.stacks[id],auto});this.fx('awaken',t.center,{duration:1.2,team:t.id});this.offer(t);return true;
    }
    updateChoices(){
      for(const t of this.teams){
        if(!t.offer)continue;const valid=new Set(this.validAwakenings(t).map(a=>a.id)),ids=t.offer.ids.filter(id=>valid.has(id));
        if(!ids.length){t.offer=null;this.offer(t);continue;}
        if(t.controller==='ai'&&this.time-t.offer.created>=1){const hp=R.alive(t).reduce((s,h)=>s+h.hp,0)/R.alive(t).reduce((s,h)=>s+h.maxHp,0),order=hp<.6?[2,8,4,0,1,6,3,5,7]:[0,1,6,3,5,7,2,4,8];this.choose(t,order.find(id=>ids.includes(id)),true);}
        else if(this.time+EPS>=t.offer.expires)this.choose(t,ids[Math.floor(this.random()*ids.length)],true);
      }
    }
    wakeAI(){this.teams.forEach(t=>t.aiNext=0);}
    decide(t){
      const alive=R.alive(t),pos=t.center,center=C.map.center,hp=alive.reduce((s,h)=>s+h.hp,0)/alive.reduce((s,h)=>s+h.maxHp,0),strength=units=>units.reduce((v,h)=>v+h.hp*(1+this.attrs(h).atk/20),0),own=strength(alive);
      const visible=this.teams.filter(o=>o.id!==t.id&&o.eliminatedAt==null).map(o=>({team:o,units:R.alive(o).filter(h=>R.distance(h,pos)<=C.searchRadius)})).filter(o=>o.units.length),enemies=visible.flatMap(o=>o.units).sort((a,b)=>R.distance(a,pos)-R.distance(b,pos)),nearest=enemies[0];
      const monsters=this.monsters.filter(m=>m.hp>0&&R.distance(m,pos)<=C.searchRadius).sort((a,b)=>R.distance(a,pos)-R.distance(b,pos));
      const threat=nearest||monsters.find(m=>m.target?.team===t.id);
      const radius=R.safeRadius(this.time),futureRadius=R.safeRadius(Math.min(180,this.time+5)),danger=R.distance(pos,center)>Math.min(radius-100,futureRadius-100);
      let state,goal,formation=0;
      if(danger){state='进安全区';const dir=R.normalize(pos.x-center.x,pos.y-center.y),r=Math.max(0,futureRadius-150);goal={x:center.x+dir.x*r,y:center.y+dir.y*r};formation=nearest&&R.distance(nearest,pos)<100?1:0;}
      else if(threat&&(hp<C.ai.retreat||visible.some(o=>strength(o.units)>own*C.ai.strengthRatio))){state='撤退';formation=1;const away=R.normalize(pos.x-threat.x,pos.y-threat.y);goal=R.project({x:pos.x+away.x*230,y:pos.y+away.y*230},C.centerRadius);if(R.distance(goal,center)>radius-100)goal={...center};}
      else{
        const drops=this.drops.filter(d=>R.distance(d,pos)<=220&&!enemies.some(e=>R.pointSegment(e,pos,d).distance<120&&strength(R.alive(this.teams[e.team]))>own)).sort((a,b)=>R.distance(a,pos)-R.distance(b,pos)||b.value-a.value);
        if(drops.length){state='拾取';goal={x:drops[0].x,y:drops[0].y};}
        else if(nearest&&(hp>=.3)&&(visible.some(o=>{const a=R.alive(o.team);return a.reduce((s,h)=>s+h.hp,0)/a.reduce((s,h)=>s+h.maxHp,0)<.3;})||enemies.some(e=>alive.some(h=>R.distance(h,e)<=this.attrs(h).range)))){
          state='接战';goal={x:nearest.x,y:nearest.y};formation=enemies.filter(h=>R.distance(h,pos)<=150).length>=3?2:0;
          if(R.distance(pos,nearest)<65)goal={...pos};
          if(t.chaseStart&&R.distance(t.chaseStart,goal)>C.ai.chase||this.time-t.lastCombat>5&&t.aiState==='接战'){state='巡逻';goal={...center};}else t.chaseStart??={...pos};
        }else if(this.core.active&&hp>=.3){state='争核';goal={...center};if(R.distance(pos,center)<25){goal={...pos};formation=nearest?0:1;}}
        else{
          const known=monsters.filter(m=>hp>=C.ai.retreat||m.type==='normal');
          let target=known[0];
          if(!target&&hp>=C.ai.retreat){const camps=[...C.map.camps,...(this.time>=45?C.map.elites:[])];t.visited??=new Set();
            for(let i=0;i<camps.length;i++)if(R.distance(pos,camps[i])<170&&!this.monsters.some(m=>m.hp>0&&R.distance(m,camps[i])<150))t.visited.add(i);
            const unseen=camps.map((p,i)=>({...p,index:i})).filter(p=>!t.visited.has(p.index));unseen.sort((a,b)=>R.distance(a,pos)-R.distance(b,pos));target=unseen[0];
          }
          if(target){state='刷野';goal={x:target.x,y:target.y};if(target.kind==='monster'&&R.distance(target,pos)<55)goal={...pos};}
          else{state='巡逻';const angle=t.id*Math.PI/2+this.time*.07;goal={x:center.x+Math.cos(angle)*110,y:center.y+Math.sin(angle)*110};}
        }
      }
      if(state!=='接战')t.chaseStart=null;
      const urgent=['进安全区','撤退','拾取','争核'].includes(state),retain=t.goal&&this.time-(t.goalAt||0)<C.ai.hold&&state===t.aiState&&!urgent;
      if(!retain){t.goal=R.project(goal,C.centerRadius);t.goalAt=this.time;}
      t.aiState=state;this.changeFormation(t,formation);
      if(!t.pathTarget||R.distance(t.pathTarget,t.goal)>30||!t.path.length){t.path=R.route(pos,t.goal);t.pathTarget={...t.goal};}
    }
    aiInput(t){while(t.path.length&&R.distance(t.center,t.path[0])<6)t.path.shift();const goal=t.path[0];if(!goal)return {x:0,y:0};return R.normalize(goal.x-t.center.x,goal.y-t.center.y);}
    resourceBalance(){return this.generated-this.removed-this.teams.reduce((s,t)=>s+t.carried,0)-this.drops.reduce((s,d)=>s+d.value,0);}
    finish(reason){if(this.ended)return;this.ended=true;this.reason=reason;this.rankings=R.rank(this.teams);this.teams.forEach(t=>{t.offer=null;t.pending=0;});this.emit('match_end',{reason,duration:this.time,balance:this.resourceBalance()});}
    summary(){return {seed:this.seed,config:C.version,time:this.time,reason:this.reason,generated:this.generated,removed:this.removed,balance:this.resourceBalance(),teams:this.teams.map(t=>({id:t.id,name:t.name,rank:(this.rankings||R.rank(this.teams)).find(x=>x.team.id===t.id).rank,dust:t.eliminatedAt==null?t.carried:t.dustBefore,earned:t.earned,alive:R.alive(t).length,heroKills:t.heroKills,teamKills:t.teamKills,damage:t.damage,survival:t.eliminatedAt??this.time,awakenings:t.stacks,formationTime:t.formationTime})),events:this.logs};}
  }
  T.Simulation=Simulation;
})(globalThis);
