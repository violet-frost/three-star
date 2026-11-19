(function(G){
  'use strict';
  const T=G.ThreeStar,C=T.Config,R=T.Rules;
  class Renderer{
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.camera={x:400,y:500};this.width=540;this.height=960;this.atlas=new Image();this.atlas.src='assets/characters.png';this.terrain=this.makeTerrain();this.lastTeam=-1;this.floor=new Image();this.floor.onload=()=>this.applyFloor();this.floor.src='assets/arena-floor.png';}
    applyFloor(){
      const c=this.terrain.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(this.floor,0,0,C.map.width,C.map.height);
      // Illustration contains only walkable ground. These four blocks are the sole interior colliders.
      for(const o of C.map.obstacles){c.fillStyle='#46504455';c.fillRect(o.x+8,o.y+10,o.w,o.h);for(let y=o.y;y<o.y+o.h;y+=40)for(let x=o.x;x<o.x+o.w;x+=40)this.wallBlock(c,x,y,39,39);c.fillStyle='#95473f';c.fillRect(o.x+o.w/2-15,o.y+14,30,49);c.fillStyle='#efd198';c.fillRect(o.x+o.w/2-2,o.y+24,4,24);c.fillRect(o.x+o.w/2-10,o.y+34,20,4);}
      // Match game coordinates rather than decorative floor mosaics.
      for(const p of C.map.camps){c.strokeStyle='#d4c38b88';c.lineWidth=3;c.setLineDash([8,9]);c.beginPath();c.arc(p.x,p.y,105,0,Math.PI*2);c.stroke();}c.setLineDash([]);
    }
    resize(w,h){this.height=960;this.width=960*w/h;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);this.ctx.imageSmoothingEnabled=false;}
    makeTerrain(){
      const canvas=document.createElement('canvas');canvas.width=C.map.width;canvas.height=C.map.height;const x=canvas.getContext('2d'),rng=R.rng(90423),center=C.map.center;
      const paths=C.map.camps.map(p=>[p,center]);
      x.fillStyle='#a6b779';x.fillRect(0,0,canvas.width,canvas.height);
      for(let y=0;y<canvas.height;y+=32)for(let k=0;k<canvas.width;k+=32){
        const p={x:k+16,y:y+16},distance=R.distance(p,center),path=paths.some(([a,b])=>R.pointSegment(p,a,b).distance<86),plaza=distance<360;
        if(path||plaza){
          const colors=plaza?['#c3bca1','#beb69b','#c8c0a4','#b9b497']:['#b4b6a0','#bcbca6','#b6b6a0'];x.fillStyle=colors[Math.floor(rng()*colors.length)];x.fillRect(k,y,31,31);x.fillStyle='#d0c9b1';x.fillRect(k+1,y+1,29,2);x.fillStyle='#939e85';x.fillRect(k+2,y+29,28,2);
          if(rng()<.08){x.fillStyle='#9da58d';x.fillRect(k+12,y+3,2,9);x.fillRect(k+8,y+10,5,2);}
        }else{
          x.fillStyle=['#a8b77b','#a4b277','#aabb7f','#9fac73'][Math.floor(rng()*4)];x.fillRect(k,y,32,32);
          for(let j=0;j<4;j++){const xx=k+rng()*29,yy=y+rng()*29;x.fillStyle=rng()>.4?'#8fa66b':'#bac58a';x.fillRect(xx,yy,2,3);x.fillRect(xx+2,yy+2,2,2);}
        }
      }
      // Four wide lanes and the circular central dais read clearly from the minimap.
      for(const radius of [353,323,175,145]){x.strokeStyle=radius>300?'#868f77':'#d4c7a0';x.lineWidth=radius>300?8:4;x.beginPath();x.arc(center.x,center.y,radius,0,Math.PI*2);x.stroke();}
      const star=(p,size,color)=>{x.save();x.translate(p.x,p.y);x.fillStyle=color;x.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,r=i%2?size*.23:size;x.lineTo(Math.cos(a)*r,Math.sin(a)*r);}x.closePath();x.fill();x.restore();};
      star(center,130,'#dbc28b');star(center,90,'#a99d7c');
      C.map.camps.forEach((p,i)=>{
        x.strokeStyle=['#bd8b6f','#87ad92','#d4b270','#ab8eb1'][i];x.lineWidth=5;x.beginPath();x.arc(p.x,p.y,145,0,Math.PI*2);x.stroke();
        star(p,48,'#c9bd8c');
        for(let j=0;j<16;j++){const a=rng()*Math.PI*2,r=150+rng()*35;this.bush(x,p.x+Math.cos(a)*r,p.y+Math.sin(a)*r,18+rng()*15,i);}
      });
      C.map.elites.forEach(p=>{x.strokeStyle='#8e977c';x.lineWidth=3;x.beginPath();x.arc(p.x,p.y,52,0,Math.PI*2);x.stroke();star(p,24,'#c7b889');});
      // Sparse decorative flowers and bushes, kept away from lanes and obstacles.
      for(let j=0;j<1450;j++){
        const p={x:50+rng()*(canvas.width-100),y:50+rng()*(canvas.height-100)};
        if(R.distance(p,center)<400||paths.some(([a,b])=>R.pointSegment(p,a,b).distance<110)||!R.walkable(p,40))continue;
        if(j%7===0)this.bush(x,p.x,p.y,12+rng()*16,Math.floor(rng()*4));
        else{const color=j%3===0?'#e8ce7c':'#e5dfb4';x.fillStyle='#7d9a61';x.fillRect(p.x,p.y,2,8);x.fillStyle=color;x.fillRect(p.x-2,p.y-2,6,4);x.fillRect(p.x,p.y-4,2,8);}
      }
      // Low perimeter battlements are outside the playable inset.
      for(let k=0;k<canvas.width;k+=40){this.wallBlock(x,k,5,38,30);this.wallBlock(x,k,canvas.height-30,38,30);}
      for(let y=35;y<canvas.height-30;y+=40){this.wallBlock(x,2,y,30,38);this.wallBlock(x,canvas.width-32,y,30,38);}
      C.map.obstacles.forEach(o=>{
        x.fillStyle='#66715e55';x.fillRect(o.x+12,o.y+12,o.w,o.h);
        for(let y=o.y;y<o.y+o.h;y+=40)for(let k=o.x;k<o.x+o.w;k+=40)this.wallBlock(x,k,y,39,39);
        // Burgundy pennants refer to the supplied arena art.
        x.fillStyle='#854741';x.fillRect(o.x+o.w/2-13,o.y+15,26,42);x.fillStyle='#e4c078';star({x:o.x+o.w/2,y:o.y+35},9,'#e4c078');
      });
      return canvas;
    }
    wallBlock(x,k,y,w,h){x.fillStyle='#727e72';x.fillRect(k,y,w,h);x.fillStyle='#9c9e8e';x.fillRect(k,y-10,w,h-1);x.fillStyle='#c6c0a8';x.fillRect(k+2,y-10,w-4,8);x.fillStyle='#b1ad96';x.fillRect(k+2,y-2,w-4,h-10);x.fillStyle='#d4ccb1';x.fillRect(k+3,y-9,w-6,2);}
    bush(x,k,y,r,i){const colors=[['#807d4c','#b17a53','#d29865'],['#487455','#6e9565','#96b378'],['#82904e','#a3a357','#c7b36c'],['#73648a','#9783a1','#b6a0b5']][i];x.fillStyle='#61745166';x.fillRect(k-r,y+r*.3,r*2,r*.6);for(let n=0;n<5;n++){const dx=Math.cos(n*1.3)*r*.5,dy=Math.sin(n*1.3)*r*.4;x.fillStyle=colors[n%3];x.fillRect(k+dx-r*.6,y+dy-r*.5,r*1.2,r);x.fillRect(k+dx-r*.4,y+dy-r*.7,r*.8,r*1.4);}}
    render(sim,teamId,dt=.016){
      const c=this.ctx,w=this.width,h=this.height,scale=this.canvas.width/w,t=sim.teams[teamId]||sim.teams[0],target=t.center;
      const cx=R.clamp(target.x,w/2,C.map.width-w/2),cy=R.clamp(target.y,h/2,C.map.height-h/2);
      if(this.lastTeam!==teamId){this.camera={x:cx,y:cy};this.lastTeam=teamId;}else{const a=1-Math.exp(-dt/.15);this.camera.x+=(cx-this.camera.x)*a;this.camera.y+=(cy-this.camera.y)*a;}
      const left=this.camera.x-w/2,top=this.camera.y-h/2;
      c.setTransform(scale,0,0,scale,0,0);c.fillStyle='#344a3c';c.fillRect(0,0,w,h);c.save();c.translate(-left,-top);
      c.drawImage(this.terrain,Math.max(0,left),Math.max(0,top),Math.min(w,C.map.width-Math.max(0,left)),Math.min(h,C.map.height-Math.max(0,top)),Math.max(0,left),Math.max(0,top),Math.min(w,C.map.width-Math.max(0,left)),Math.min(h,C.map.height-Math.max(0,top)));
      for(const area of sim.areas){c.fillStyle='#42885b40';c.strokeStyle='#8cd99b';c.lineWidth=2;c.beginPath();c.arc(area.x,area.y,area.radius,0,Math.PI*2);c.fill();c.stroke();for(let j=0;j<8;j++){const a=j*Math.PI/4+sim.time;c.fillStyle='#85ba73';c.fillRect(area.x+Math.cos(a)*area.radius*.8,area.y+Math.sin(a)*area.radius*.8,5,3);}}
      this.drawCore(c,sim);
      for(const d of sim.drops)if(this.visible(d,left,top,w,h)){const bob=Math.sin(sim.time*4+d.id)*2;c.fillStyle='#9d742f44';c.beginPath();c.ellipse(d.x,d.y+6,9,4,0,0,Math.PI*2);c.fill();this.diamond(c,d.x,d.y-4+bob,d.value>=10?10:7,'#ffdc81','#a77637');}
      for(const team of sim.teams){
        if(team.eliminatedAt!=null)continue;const alive=R.alive(team);
        if(team.id===teamId||sim.time-team.changedAt<.3){c.strokeStyle=team.color+'66';c.lineWidth=1.5;c.setLineDash([4,5]);c.beginPath();alive.forEach((u,i)=>i?c.lineTo(u.x,u.y):c.moveTo(u.x,u.y));if(team.formation===1)c.closePath();c.stroke();c.setLineDash([]);}
        if(team.id===teamId){c.strokeStyle=team.color+'88';c.lineWidth=2;c.beginPath();c.ellipse(team.center.x,team.center.y,17,8,0,0,Math.PI*2);c.stroke();}
      }
      const units=[...sim.teams.flatMap(t=>t.heroes),...sim.monsters].filter(u=>this.visible(u,left,top,w,h)).sort((a,b)=>a.y-b.y||a.id-b.id);
      for(const u of units)this.drawUnit(c,u,sim,teamId);
      for(const p of sim.projectiles){const flame=p.source.heroType===1;c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.dir.y,p.dir.x));c.fillStyle=flame?'#f0823a':'#82cc8c';c.fillRect(-16,-4,21,8);c.fillStyle=flame?'#ffe6a2':'#d5f3bc';c.fillRect(-6,-3,11,6);if(p.snapshot.synergy>1){c.strokeStyle='#ffdc81';c.lineWidth=2;c.strokeRect(-14,-6,23,12);}c.restore();}
      for(const e of sim.effects)this.drawEffect(c,e,sim.time);
      // Dark curtain uses even-odd fill so the playable circle remains clear.
      const r=R.safeRadius(sim.time),center=C.map.center;
      c.fillStyle='#39204cc4';c.beginPath();c.rect(left-10,top-10,w+20,h+20);c.moveTo(center.x+r,center.y);c.arc(center.x,center.y,r,0,Math.PI*2);c.fill('evenodd');
      c.strokeStyle='#d6a3f3';c.lineWidth=4;c.setLineDash([14,8]);c.beginPath();c.arc(center.x,center.y,r,0,Math.PI*2);c.stroke();c.setLineDash([]);
      c.restore();
      this.drawArrow(c,sim,t,left,top,w,h);
      // Quiet edge shading keeps DOM HUD legible without obscuring the play field.
      let gradient=c.createLinearGradient(0,0,0,210);gradient.addColorStop(0,'#1b2939c9');gradient.addColorStop(1,'#1b293900');c.fillStyle=gradient;c.fillRect(0,0,w,210);
      gradient=c.createLinearGradient(0,h-180,0,h);gradient.addColorStop(0,'#172c3100');gradient.addColorStop(1,'#172c316b');c.fillStyle=gradient;c.fillRect(0,h-180,w,180);
    }
    visible(u,l,t,w,h){return u.x>l-100&&u.x<l+w+100&&u.y>t-100&&u.y<t+h+100;}
    diamond(c,x,y,r,color,stroke){c.fillStyle=color;c.strokeStyle=stroke;c.lineWidth=2;c.beginPath();c.moveTo(x,y-r*1.4);c.lineTo(x+r*.65,y);c.lineTo(x,y+r);c.lineTo(x-r*.65,y);c.closePath();c.fill();c.stroke();c.fillStyle='#fff1b7';c.beginPath();c.moveTo(x,y-r*1.2);c.lineTo(x,y+r*.6);c.lineTo(x-r*.45,y);c.fill();}
    drawCore(c,s){const p=C.map.center;c.strokeStyle='#ab9d72';c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,60,0,Math.PI*2);c.stroke();
      if(s.core.active){const glow=c.createRadialGradient(p.x,p.y-25,4,p.x,p.y-25,75);glow.addColorStop(0,'#ffe7a070');glow.addColorStop(1,'#ffdc8100');c.fillStyle=glow;c.fillRect(p.x-80,p.y-105,160,160);c.strokeStyle='#ffda85';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y-26,32,10,Math.sin(s.time)*.3,0,Math.PI*2);c.stroke();this.diamond(c,p.x,p.y-32+Math.sin(s.time*2)*4,23,'#ffb941','#9b642b');
        const best=Math.max(...s.core.progress),id=s.core.progress.indexOf(best);c.strokeStyle=s.core.contested?'#fff6d8':C.teams[id].color;c.lineWidth=6;c.beginPath();c.arc(p.x,p.y,63,-Math.PI/2,-Math.PI/2+(best/C.core.capture)*Math.PI*2);c.stroke();
      }else{c.fillStyle='#8b947b';c.fillRect(p.x-8,p.y-8,16,16);}
    }
    drawUnit(c,u,s,view){
      if(u.hp<=0){if(s.time-u.deadAt<2.5){c.globalAlpha=R.clamp(1-(s.time-u.deadAt)/2.5,0,1);c.fillStyle='#695d65';c.fillRect(u.x-9,u.y-3,18,6);c.fillRect(u.x-3,u.y-9,6,18);c.globalAlpha=1;}return;}
      const hero=u.kind==='hero',elite=u.type==='elite',team=hero?s.teams[u.team]:null,color=hero?team.color:elite?'#eac184':'#d8a677',size=elite?112:hero?94:65,bob=u.moving?Math.sin(s.time*15+u.id)*2:Math.sin(s.time*2+u.id)*.6;
      c.fillStyle='#293d3d55';c.beginPath();c.ellipse(u.x,u.y+5,hero?20:elite?25:16,hero?9:7,0,0,Math.PI*2);c.fill();c.strokeStyle=color;c.lineWidth=hero&&u.team===view?2:1.2;c.beginPath();c.ellipse(u.x,u.y+3,hero?21:elite?27:17,9,0,0,Math.PI*2);c.stroke();
      let col=0;if(Math.abs(u.facing.x)>Math.abs(u.facing.y))col=u.facing.x<0?1:2;else col=u.facing.y<0?3:0;
      if(this.atlas.complete&&this.atlas.naturalWidth){const cell=this.atlas.naturalWidth/4;c.save();if(u.hitAt>s.time-.08)c.filter='brightness(2)';else if(elite)c.filter='hue-rotate(255deg) saturate(0.85)';c.drawImage(this.atlas,col*cell,(hero?u.heroType:3)*cell,cell,cell,u.x-size/2,u.y-size*.83+bob,size,size);c.restore();}
      else{c.fillStyle=hero?['#a75140','#d7813c','#6a9059'][u.heroType]:'#9b805c';c.fillRect(u.x-12,u.y-26,24,30);}
      if(hero&&s.time<C.protection||u.shield>0){c.strokeStyle=u.shield>0?'#b4e9ff':'#e4e6bd';c.fillStyle='#bbeaff12';c.lineWidth=2;c.beginPath();c.ellipse(u.x,u.y-24,31,38,0,0,Math.PI*2);c.fill();c.stroke();}
      if(u.chargeUntil>s.time||u.synergyUntil>s.time){c.strokeStyle=u.synergyUntil>s.time?'#ffd275':'#f3a265';c.lineWidth=2;c.beginPath();c.arc(u.x,u.y-22,30,s.time*2,s.time*2+Math.PI*1.7);c.stroke();}
      const bw=hero?44:elite?52:30,by=u.y-(hero?66:elite?79:44);
      c.fillStyle='#273d3d';c.fillRect(u.x-bw/2-1,by-1,bw+2,6);c.fillStyle=hero?(u.team===view?'#6bcbea':'#e9807c'):'#d6ac6b';c.fillRect(u.x-bw/2,by,bw*(u.hp/u.maxHp),4);
      if(u.shield>0){c.fillStyle='#d5f2ff';c.fillRect(u.x-bw/2,by-3,bw*Math.min(1,u.shield/u.maxHp),2);}
      if(hero){c.textAlign='center';c.font='bold 9px "Microsoft YaHei",sans-serif';c.strokeStyle='#263338';c.lineWidth=3;c.strokeText(team.symbol+' '+u.cfg.name,u.x,by-6);c.fillStyle=u.team===view?'#e4f7ff':color;c.fillText(team.symbol+' '+u.cfg.name,u.x,by-6);}
      if(u.slowUntil>s.time){c.fillStyle='#adf0a0';c.font='12px serif';c.textAlign='center';c.fillText('↓',u.x,u.y+20);}
    }
    drawEffect(c,e,time){
      const p=R.clamp((time-e.start)/e.duration,0,1);c.save();c.globalAlpha=1-p;
      if(e.kind==='number'){c.font='bold '+(e.value>=20?19:15)+'px "Microsoft YaHei",sans-serif';c.textAlign='center';c.strokeStyle='#263239';c.lineWidth=3;const y=e.y-48-p*35;c.strokeText(Math.max(1,Math.round(e.value)),e.x,y);c.fillStyle=e.storm?'#e0b7fb':e.team===0?'#ffab9a':'#ffedbd';c.fillText(Math.max(1,Math.round(e.value)),e.x,y);}
      else if(e.kind==='slash'){c.translate(e.x,e.y);c.rotate(Math.atan2(e.dir.y,e.dir.x));c.strokeStyle='#ffe1a0';c.lineWidth=5*(1-p);c.beginPath();c.arc(0,0,40+p*6,-Math.PI/4,Math.PI/4);c.stroke();}
      else if(e.kind==='synergy'){c.strokeStyle='#ffd981';c.lineWidth=3;c.setLineDash([7,4]);c.beginPath();c.moveTo(e.x,e.y-20);c.lineTo(e.target.x,e.target.y-20);c.stroke();}
      else if(e.kind==='dust'){c.textAlign='center';c.font='bold 20px serif';c.fillStyle='#ffe39c';c.strokeStyle='#5a4b2c';c.lineWidth=3;c.strokeText('✦ +'+e.value,e.x,e.y-70-p*30);c.fillText('✦ +'+e.value,e.x,e.y-70-p*30);}
      else if(['awaken','core','formation','charge'].includes(e.kind)){c.strokeStyle=e.kind==='awaken'?'#ffe7ac':e.kind==='formation'?C.teams[e.team].color:'#ffc675';c.lineWidth=3*(1-p);c.beginPath();c.ellipse(e.x,e.y,20+p*75,10+p*35,0,0,Math.PI*2);c.stroke();}
      else if(e.kind==='cast'){c.strokeStyle=e.heroType===2?'#addc96':'#ffce86';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y,16+p*12,0,Math.PI*2);c.stroke();}
      c.restore();
    }
    drawArrow(c,s,t,left,top,w,h){
      const inStorm=R.alive(t).some(u=>R.distance(u,C.map.center)>R.safeRadius(s.time));let target=null,label='';
      if(inStorm){target=C.map.center;label='安全区';}
      else if(s.core.active){target=C.map.center;label='中央星核';}
      else if(t.id===0&&t.earned<25){target=s.monsters.filter(m=>m.hp>0).sort((a,b)=>R.distance(a,t.center)-R.distance(b,t.center))[0];label='野区';}
      if(!target)return;const px=target.x-left,py=target.y-top;if(px>45&&px<w-45&&py>190&&py<h-180)return;
      const dir=R.normalize(px-w/2,py-h/2),scale=Math.min((w/2-48)/(Math.abs(dir.x)||.001),(h/2-210)/(Math.abs(dir.y)||.001)),x=w/2+dir.x*scale,y=h/2+dir.y*scale;
      c.save();c.translate(x,y);c.rotate(Math.atan2(dir.y,dir.x));c.fillStyle=inStorm?'#e6b0ff':'#ffe3a1';c.strokeStyle='#4e4946';c.lineWidth=2;c.beginPath();c.moveTo(13,0);c.lineTo(-7,-9);c.lineTo(-3,0);c.lineTo(-7,9);c.closePath();c.fill();c.stroke();c.restore();c.textAlign='center';c.font='bold 11px "Microsoft YaHei",sans-serif';c.lineWidth=3;c.strokeStyle='#293b3c';c.strokeText(label,x,y+24);c.fillStyle='#fff0cd';c.fillText(label,x,y+24);
    }
    minimap(canvas,sim,view){const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,s=w/C.map.width;c.clearRect(0,0,w,h);c.drawImage(this.terrain,0,0,w,h);c.save();c.scale(s,s);const center=C.map.center,r=R.safeRadius(sim.time);c.fillStyle='#442954a0';c.beginPath();c.rect(0,0,C.map.width,C.map.height);c.moveTo(center.x+r,center.y);c.arc(center.x,center.y,r,0,Math.PI*2);c.fill('evenodd');c.strokeStyle='#efc4ff';c.lineWidth=18;c.beginPath();c.arc(center.x,center.y,r,0,Math.PI*2);c.stroke();if(sim.core.active)this.diamond(c,center.x,center.y,65,'#ffdb8c','#8e612f');for(const t of sim.teams)if(t.eliminatedAt==null){c.fillStyle=t.color;c.beginPath();c.arc(t.center.x,t.center.y,t.id===view?55:40,0,Math.PI*2);c.fill();c.strokeStyle='#26343f';c.lineWidth=14;c.stroke();}const vw=this.width,vh=this.height;c.strokeStyle='#f7f0d4';c.lineWidth=10;c.strokeRect(this.camera.x-vw/2,this.camera.y-vh/2,vw,vh);c.restore();}
  }
  T.Renderer=Renderer;
})(globalThis);
