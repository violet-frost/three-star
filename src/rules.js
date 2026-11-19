(function(G){
  'use strict';
  const T=G.ThreeStar,C=T.Config,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const R=T.Rules={
    clamp,round:n=>Math.round((n+Number.EPSILON)*100)/100,
    distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
    normalize(x,y){const n=Math.hypot(x,y);return n?{x:x/n,y:y/n}:{x:0,y:0};},
    damage(atk,def,skill=1,formation=1,synergy=1){return R.round(Math.max(1,atk-def)*skill*formation*synergy);},
    shares(damage,count,protect){return protect&&count?[damage*.7,...Array(count).fill(damage*.3/count)]:[damage];},
    safeRadius(t){const s=C.storm;return s.startRadius-(s.startRadius-s.endRadius)*clamp((t-s.start)/(s.final-s.start),0,1);},
    stormDps(t){let n=0;for(const [time,dps] of C.storm.stages)if(t>=time)n=dps;return n;},
    alive:team=>team.heroes.filter(h=>h.hp>0),
    compare(a,b){
      const aa=a.eliminatedAt==null,bb=b.eliminatedAt==null;
      if(aa!==bb)return aa?-1:1;
      if(aa)return b.carried-a.carried||R.alive(b).length-R.alive(a).length||b.teamKills-a.teamKills;
      return b.eliminatedAt-a.eliminatedAt||b.dustBefore-a.dustBefore||b.aliveBefore-a.aliveBefore||b.teamKills-a.teamKills;
    },
    rank(teams){const order=[...teams].sort((a,b)=>R.compare(a,b)||a.id-b.id);let rank=1;return order.map((team,i)=>{if(i&&R.compare(order[i-1],team)!==0)rank=i+1;return {team,rank};});},
    walkable(p,r=0){return p.x>=r&&p.y>=r&&p.x<=C.map.width-r&&p.y<=C.map.height-r&&!C.map.obstacles.some(o=>p.x>o.x-r&&p.x<o.x+o.w+r&&p.y>o.y-r&&p.y<o.y+o.h+r);},
    project(p,r=0){
      const q={x:clamp(p.x,r,C.map.width-r),y:clamp(p.y,r,C.map.height-r)};
      for(const o of C.map.obstacles){
        if(q.x>o.x-r&&q.x<o.x+o.w+r&&q.y>o.y-r&&q.y<o.y+o.h+r){
          const candidates=[{x:o.x-r,y:q.y},{x:o.x+o.w+r,y:q.y},{x:q.x,y:o.y-r},{x:q.x,y:o.y+o.h+r}];
          candidates.sort((a,b)=>R.distance(a,q)-R.distance(b,q));Object.assign(q,candidates[0]);
        }
      }return q;
    },
    move(p,dx,dy,r=0){
      // Sweep in small steps to prevent fast dash/knockback from crossing walls.
      const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8));let q={x:p.x,y:p.y};
      for(let i=0;i<steps;i++){
        const nx={x:q.x+dx/steps,y:q.y},ny={x:q.x,y:q.y+dy/steps};
        if(R.walkable(nx,r))q.x=nx.x;
        ny.x=q.x;if(R.walkable(ny,r))q.y=ny.y;
      }return q;
    },
    lineClear(a,b,padding=0){
      return !C.map.obstacles.some(o=>R.segmentRect(a,b,{x:o.x-padding,y:o.y-padding,w:o.w+padding*2,h:o.h+padding*2}));
    },
    segmentRect(a,b,o){
      let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
      for(const [p,q] of [[-dx,a.x-o.x],[dx,o.x+o.w-a.x],[-dy,a.y-o.y],[dy,o.y+o.h-a.y]]){
        if(!p){if(q<0)return false;continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;
      }return true;
    },
    pointSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,n=dx*dx+dy*dy,t=n?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/n,0,1):0;return {distance:Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t),t};},
    rng(seed){let x=seed>>>0;return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};},
    shuffle(items,rng){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;},
    route(start,end,radius=C.centerRadius){
      const goal=R.project(end,radius);if(R.lineClear(start,goal,radius))return [goal];
      // Visibility graph around the four expanded rectangular obstacles.
      const nodes=[start,goal];for(const o of C.map.obstacles)for(const x of [o.x-radius-2,o.x+o.w+radius+2])for(const y of [o.y-radius-2,o.y+o.h+radius+2])if(R.walkable({x,y},radius))nodes.push({x,y});
      const cost=nodes.map(()=>Infinity),prev=[],open=new Set(nodes.map((_,i)=>i));cost[0]=0;
      while(open.size){let u=-1;for(const i of open)if(u<0||cost[i]<cost[u])u=i;if(!Number.isFinite(cost[u]))break;open.delete(u);if(u===1)break;
        for(const v of open)if(R.lineClear(nodes[u],nodes[v],radius)){const alt=cost[u]+R.distance(nodes[u],nodes[v]);if(alt<cost[v]){cost[v]=alt;prev[v]=u;}}
      }
      if(!Number.isFinite(cost[1]))return [goal];const path=[];let i=1;while(i!==0&&i!=null){path.unshift(nodes[i]);i=prev[i];}return path;
    }
  };
})(globalThis);
