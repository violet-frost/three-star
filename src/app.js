(function(G){
  'use strict';
  const T=G.ThreeStar,C=T.Config,R=T.Rules,$=id=>document.getElementById(id);
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch(_){return fallback;}}
  function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}}
  // All formation references share the same vector assets, including awakening cards.
  const iconMarkup=icon=>['wedge','circle','line'].includes(icon)?`<img class="formation-icon" src="assets/formation-${icon}.svg" alt="" aria-hidden="true" draggable="false">`:icon;
  const timeLabel=n=>{const seconds=Math.ceil(Math.max(0,n));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};
  class App{
    constructor(){
      this.mode='menu';this.settings={music:true,sfx:true,vibration:true,...read('three-star-settings',{})};this.tutorialDone=read('three-star-tutorial',false);this.audio=new T.AudioEngine(this.settings);this.renderer=new T.Renderer($('battle'));
      this.sim=new T.Simulation(20261119);this.viewTeam=0;this.keys=new Set();this.stick={x:0,y:0};this.pointer=null;this.accumulator=0;this.lastFrame=performance.now();this.lastHud=0;this.lastEvent=0;this.toastUntil=0;this.offerKey='';this.logsSaved=false;
      this.bind();this.resize();new ResizeObserver(()=>this.resize()).observe($('game-shell'));this.updateHUD();this.renderer.minimap($('tactical-map'),this.sim,0);
      const ready=()=>{$('loading').classList.add('hidden');};
      if(this.renderer.atlas.complete)ready();else{this.renderer.atlas.addEventListener('load',ready,{once:true});this.renderer.atlas.addEventListener('error',()=>{$('loading').innerHTML='角色资源未能加载。<br>请完整解压运行包，再打开 index.html。';$('loading').classList.add('fatal');},{once:true});}
      requestAnimationFrame(now=>this.loop(now));
    }
    bind(){
      document.querySelectorAll('[data-formation-icon]').forEach(el=>el.innerHTML=iconMarkup(C.formations[Number(el.dataset.formationIcon)].icon));
      $('start').onclick=()=>this.start();$('restart').onclick=()=>this.start();$('result-return').onclick=()=>this.toMenu();$('pause').onclick=()=>this.pause();$('fullscreen').onclick=()=>this.fullscreen();
      document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{this.audio.unlock();if(b.dataset.action==='help')this.help();else this.showSettings();});
      document.querySelectorAll('[data-formation]').forEach(b=>this.combatButton(b,()=>this.formation(Number(b.dataset.formation))));
      $('spectate-prev').onclick=()=>this.spectate(-1);$('spectate-next').onclick=()=>this.spectate(1);$('spectate-return').onclick=()=>this.confirmReturn();
      document.addEventListener('pointerdown',()=>this.audio.unlock(),{passive:true});
      const field=$('game-shell');
      field.addEventListener('pointerdown',e=>{
        if(this.mode!=='playing'||this.pointer!=null||!R.alive(this.sim.teams[0]).length||e.button!==0)return;
        if(e.target.closest('button,.hero-status,.awakening,.spectator,#modal'))return;
        e.preventDefault();this.pointer=e.pointerId;const bounds=field.getBoundingClientRect(),joystick=$('joystick');
        joystick.style.left=(e.clientX-bounds.left-field.clientLeft)+'px';joystick.style.top=(e.clientY-bounds.top-field.clientTop)+'px';joystick.classList.add('visible');
        field.setPointerCapture(e.pointerId);this.updateStick(e);
      });
      field.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer){e.preventDefault();this.updateStick(e);}});
      const end=e=>{if(e.pointerId===this.pointer)this.releaseStick();};field.addEventListener('pointerup',end);field.addEventListener('pointercancel',end);field.addEventListener('lostpointercapture',end);
      window.addEventListener('keydown',e=>{
        if(e.repeat&&[' ','Escape','f','F'].includes(e.key))return;
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();this.audio.unlock();this.keys.add(e.key.toLowerCase());
        if(['1','2','3'].includes(e.key))this.formation(Number(e.key)-1);
        if(e.key===' '||e.key==='Escape'){if(this.mode==='playing')this.pause();else if(this.mode==='paused')this.resume();}
        if(e.key.toLowerCase()==='f')this.fullscreen();
      });
      window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
      document.addEventListener('visibilitychange',()=>{if(document.hidden&&['playing','countdown'].includes(this.mode))this.pause();});
      window.addEventListener('blur',()=>{if(['playing','countdown'].includes(this.mode))this.pause();});
    }
    combatButton(button,handler){
      // Secondary touch pointers do not reliably synthesize a click on mobile browsers.
      // Activate on touch down and suppress its later compatibility click.
      let suppressUntil=0;
      button.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){e.preventDefault();suppressUntil=performance.now()+700;handler(e);}});
      button.onclick=e=>{if(e.detail>0&&performance.now()<suppressUntil)return;handler(e);};
    }
    resize(){if(this.pointer!=null)this.releaseStick();const r=$('game-shell').getBoundingClientRect();this.renderer.resize(r.width,r.height);}
    updateStick(e){const b=$('joystick').getBoundingClientRect(),dx=e.clientX-b.x-b.width/2,dy=e.clientY-b.y-b.height/2,r=b.width/2,n=Math.hypot(dx,dy),scale=Math.min(1,r/(n||1));this.stick={x:dx*scale/r,y:dy*scale/r};$('stick').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;}
    releaseStick(){const pointer=this.pointer;this.pointer=null;this.stick={x:0,y:0};$('stick').style.transform='';$('joystick').classList.remove('visible');const field=$('game-shell');if(pointer!=null&&field.hasPointerCapture(pointer))field.releasePointerCapture(pointer);}
    clearInput(){this.keys.clear();this.releaseStick();}
    input(){let x=(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0),y=(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0);if(!x&&!y)return this.stick;return R.normalize(x,y);}
    start(){
      this.audio.unlock();this.clearInput();this.sim=new T.Simulation((Date.now()^(Math.random()*0xffffffff))>>>0);this.viewTeam=0;this.accumulator=0;this.lastEvent=0;this.offerKey='';this.logsSaved=false;this.lastHud=0;this.toastUntil=0;this.renderer.lastTeam=-1;
      $('menu').classList.add('hidden');$('results').classList.add('hidden');$('modal').classList.add('hidden');$('hud').classList.remove('hidden');$('spectator').classList.add('hidden');$('bottom-controls').classList.remove('hidden');$('toast').classList.add('hidden');this.beginCountdown('小队集结');this.updateHUD();
    }
    beginCountdown(caption){this.mode='countdown';this.countdown=C.countdown;$('countdown-caption').textContent=caption;$('countdown-number').textContent=C.countdown;$('countdown').classList.remove('hidden');this.clearInput();}
    formation(id){if(this.mode!=='playing'||this.sim.teams[0].eliminatedAt!=null)return;const t=this.sim.teams[0];if(this.sim.changeFormation(t,id)){this.updateHUD();}else if(t.formation!==id){this.audio.play({type:'reject'});}}
    loop(now){
      const elapsed=Math.min(.25,(now-this.lastFrame)/1000);this.lastFrame=now;
      if(this.mode==='countdown'){
        this.countdown-=elapsed;$('countdown-number').textContent=Math.max(1,Math.ceil(this.countdown));
        if(this.countdown<=0){this.mode='playing';this.accumulator=0;$('countdown').classList.add('hidden');}
      }
      if(this.mode==='playing'){
        this.accumulator+=elapsed;
        while(this.accumulator>=C.tick&&this.mode==='playing'){
          this.sim.step(C.tick,this.sim.teams[0].eliminatedAt!=null?{x:0,y:0}:this.input());this.accumulator-=C.tick;this.processEvents();
          if(this.sim.ended)this.showResults();
        }
      }
      if(this.mode!=='menu')this.renderer.render(this.sim,this.viewTeam,elapsed);
      if(now-this.lastHud>90){this.updateHUD();this.lastHud=now;}
      this.audio.update(this.mode,C.duration-this.sim.time);
      requestAnimationFrame(t=>this.loop(t));
    }
    processEvents(){
      const events=this.sim.events.filter(e=>e.seq>this.lastEvent);for(const e of events){this.lastEvent=Math.max(this.lastEvent,e.seq);const own=e.team==null||e.team===0;
        if(e.type==='attack'||e.type==='damage'){
          const unit=this.sim.livingIncludingNewDead().find(h=>h.id===(e.source??e.target));if(unit&&R.distance(unit,this.sim.teams[this.viewTeam].center)>550)continue;
        }
        if(e.type!=='match_end')this.audio.play(e,own);
        if(e.type==='core_spawn')this.toast('中央星核已出现');
        if(e.type==='core_captured')this.toast(`${C.teams[e.team].name}占领星核 · 星尘 +15`);
        if(e.type==='phase'){const text={100:'暗幕将在5秒后收缩',105:'暗幕收缩 · 向安全区转移',145:'5秒后进入最终决胜',150:'最终决胜'}[e.phase];this.toast(text);}
        if(e.type==='hero_dead'&&e.team===0)this.toast(`${C.heroes[e.hero].name}已阵亡`);
        if(e.type==='synergy'&&e.team===0)this.toast('破阵集火 · 荧惑下一击强化',1.5);
        if(e.type==='awakening_selected'&&e.team===0)this.toast(`觉醒 · ${C.awakenings[e.id].name}${e.auto?'（自动选择）':''}`,1.8);
        if(e.type==='team_eliminated'&&e.team===0){this.clearInput();this.toast('小队已淘汰 · 可继续观战',3);const team=this.sim.teams.filter(t=>t.eliminatedAt==null).sort((a,b)=>b.carried-a.carried||a.id-b.id)[0];if(team)this.viewTeam=team.id;}
        if(this.settings.vibration&&navigator.vibrate){if(e.type==='team_eliminated'&&e.team===0)navigator.vibrate(100);else if(e.type==='damage'&&e.hp>=20&&this.sim.teams[0].heroes.some(h=>h.id===e.target))navigator.vibrate(25);}
      }
      if(!this.tutorialDone){const t=this.sim.tutorial;if(t.move>=120&&t.formation&&t.damage&&t.dust){this.tutorialDone=true;save('three-star-tutorial',true);}}
    }
    toast(text,seconds=2.6){$('toast').textContent=text;$('toast').classList.remove('hidden');this.toastUntil=this.sim.time+seconds;}
    updateHUD(){
      const s=this.sim,t=s.teams[0],view=s.teams[this.viewTeam],time=Math.max(0,C.duration-s.time),rank=R.rank(s.teams),dead=t.eliminatedAt!=null;
      $('timer').textContent=timeLabel(time);$('timer').classList.toggle('final',time<=30);$('timer').classList.toggle('urgent',time<=10);
      const leaderboard=rank.map(({team:o})=>`<div class="leader-entry ${o.id===0?'mine':''} ${o.eliminatedAt!=null?'dead':''}" style="--team-color:${o.color}"><small>${o.symbol} ${o.id===0?'我方':o.name.replace('小队','')}</small><b>${o.eliminatedAt==null?o.carried:o.dustBefore}</b><em aria-label="${R.alive(o).length}名英雄存活，共3名">${R.alive(o).length}/3</em></div>`).join('');
      if($('leaderboard').innerHTML!==leaderboard)$('leaderboard').innerHTML=leaderboard;
      $('dust-count').textContent='✦ '+(dead?t.dustBefore:t.carried);const next=Math.min(150,(Math.floor(t.earned/25)+1)*25),fill=t.earned>=150?100:(t.earned%25)/25*100;$('growth-fill').style.width=fill+'%';$('growth-label').textContent=t.earned>=150?'觉醒已满':`${t.earned} / ${next}`;
      const progress=Math.max(...s.core.progress),pid=s.core.progress.indexOf(progress);$('core-status').textContent=s.core.active?(s.core.contested?'中央星核 · 争夺中':progress>0?`${pid===0?'我方':C.teams[pid].name}占领中 ${Math.min(100,Math.floor(progress/C.core.capture*100))}%`:'中央星核 · 可占领'):`星核 ${Math.max(0,Math.ceil(s.core.next-s.time))}秒后${s.time<45?'出现':'刷新'}`;
      const heroHtml=t.heroes.map(h=>{const a=h.hp<=0,cd=Math.max(0,h.skillReady-s.time);return `<div class="hero-status ${a?'dead':''}" data-hero="${h.heroType}"><i class="portrait h${h.heroType}"></i><div class="hero-status-info"><b>${h.cfg.name}${h.shield>0?' ◇'+Math.ceil(h.shield):''}</b><div class="health-meter"><div style="width:${h.hp/h.maxHp*100}%"></div></div><small>${a?'已阵亡':Math.ceil(h.hp)+'/'+h.maxHp+' · '+(cd>0?Math.ceil(cd)+'s':h.cfg.skill)}</small></div></div>`;}).join('');if($('hero-panel').innerHTML!==heroHtml){$('hero-panel').innerHTML=heroHtml;$('hero-panel').querySelectorAll('.hero-status').forEach(el=>el.onclick=()=>{if(t.heroes[+el.dataset.hero].hp<=0)this.toast('已阵亡',1);});}
      const cd=Math.max(0,t.formationReady-s.time);document.querySelectorAll('[data-formation]').forEach(b=>{b.classList.toggle('active',+b.dataset.formation===t.formation);const cover=b.querySelector('.cooldown');cover.style.display=cd>0?'grid':'none';cover.textContent=cd.toFixed(1);});
      const description=dead?'观战中 · 对局结束后显示完整排名':iconMarkup(C.formations[t.formation].icon)+C.formations[t.formation].name+' · '+C.formations[t.formation].description;
      if($('formation-description').innerHTML!==description)$('formation-description').innerHTML=description;
      $('bottom-controls').classList.toggle('hidden',dead);$('spectator').classList.toggle('hidden',!dead||s.ended);$('spectate-name').textContent=view.name;
      if(dead&&view.eliminatedAt!=null&&!s.ended)this.spectate(1);
      $('storm-warning').classList.toggle('hidden',!R.alive(view).some(h=>R.distance(h,C.map.center)>R.safeRadius(s.time))||s.time<105);
      if(this.toastUntil<s.time)$('toast').classList.add('hidden');
      const importantNotice=!$('toast').classList.contains('hidden')||!$('storm-warning').classList.contains('hidden');
      const tutorial=!this.tutorialDone&&!dead&&!s.ended&&!importantNotice?this.nextTutorial():'';$('tutorial').textContent=tutorial;
      this.updateOffer(t);
      if(this.mode!=='menu')this.renderer.minimap($('mini'),s,this.viewTeam);this.renderer.minimap($('tactical-map'),s,this.viewTeam);
      $('objective-title').textContent=s.time<45?'击败野怪，积累第一轮星尘':s.time<105?'中央星核 · 高价值争夺':s.time<150?'暗幕收缩 · 保护残存英雄':'最终决胜 · 生存与星尘';
      $('objective-description').textContent=s.time<45?'击败野怪获取星尘，每累计25点获得一次觉醒。中央星核在45秒出现，成功占领获得15点星尘。':s.time<105?'进入星核范围连续占领2秒可获得15星尘。多队在场暂停占领，受到敌方英雄伤害会清空进度。':s.time<150?'暗幕正在向中央收缩，圈外英雄持续失血。使用圆阵撤退，或切换楔形阵突破包围。':'优先保持小队存活。180秒时按存活状态、携带星尘、存活人数、队伍击杀数依次排名。';
    }
    nextTutorial(){const t=this.sim.tutorial;if(t.move<120)return '按住战场任意空白处拖动，或使用 WASD 移动';if(!t.formation)return '点击右侧按钮，切换一次阵型';if(!t.damage)return '沿野区箭头靠近野怪，英雄会自动攻击';if(!t.dust)return '靠近金色星尘拾取，累计25点即可觉醒';return '';}
    updateOffer(t){
      const offer=t.offer;$('awakening').classList.toggle('hidden',!offer||this.sim.ended);if(!offer){this.offerKey='';return;}
      const valid=new Set(this.sim.validAwakenings(t).map(a=>a.id)),key=offer.created+':'+offer.ids.join(',')+':'+[...valid].join(',');$('choice-time').textContent=Math.max(0,Math.ceil(offer.expires-this.sim.time))+'秒后自动选择';
      if(this.offerKey!==key){this.offerKey=key;$('awakening-cards').innerHTML=offer.ids.map(id=>{const a=C.awakenings[id];return `<button class="awakening-card" data-awaken="${id}" ${valid.has(id)?'':'disabled'}><i>${iconMarkup(a.icon)}</i><b>${a.name}</b><p>${a.description}</p><small>${a.category} · ${t.stacks[id]+1}/${a.max}层</small></button>`;}).join('');$('awakening-cards').querySelectorAll('button').forEach(b=>this.combatButton(b,()=>{if(this.mode==='playing'&&this.sim.choose(t,+b.dataset.awaken)){this.offerKey='';this.processEvents();this.updateHUD();}}));}
    }
    pause(){if(!['playing','countdown'].includes(this.mode))return;this.mode='paused';this.clearInput();$('countdown').classList.add('hidden');this.showSettings(true);}
    showSettings(paused=false){
      if(this.mode==='playing'||this.mode==='countdown'){this.pause();return;}
      this.settingsPaused=paused||this.mode==='paused';$('modal').classList.remove('hidden');const content=$('modal-content');content.innerHTML=`<h2>${this.settingsPaused?'战斗暂停':'设置'}</h2>${[['music','背景音乐'],['sfx','游戏音效'],['vibration','触控振动']].map(([key,label])=>`<div class="setting-row"><span>${label}</span><button class="toggle" role="switch" aria-label="${label}" aria-checked="${this.settings[key]}" data-setting="${key}"></button></div>`).join('')}<div class="modal-actions">${this.settingsPaused?'<button id="resume" class="primary">继续游戏</button><button id="return-confirm" class="danger">结束本局并返回</button>':'<button id="close-settings">返回</button>'}</div>`;
      content.querySelectorAll('[data-setting]').forEach(b=>b.onclick=()=>{const key=b.dataset.setting;this.settings[key]=!this.settings[key];b.setAttribute('aria-checked',String(this.settings[key]));save('three-star-settings',this.settings);this.audio.unlock();});
      if(this.settingsPaused){$('resume').onclick=()=>this.resume();$('return-confirm').onclick=()=>this.confirmReturn();}else $('close-settings').onclick=()=>this.closeModal();
    }
    closeModal(){$('modal').classList.add('hidden');$('start').focus({preventScroll:true});}
    resume(){if(this.mode!=='paused')return;$('modal').classList.add('hidden');this.beginCountdown('准备继续');}
    confirmReturn(){if(this.mode==='playing'){this.mode='paused';this.clearInput();}$('modal').classList.remove('hidden');$('modal-content').innerHTML='<h2>结束本局并返回？</h2><p>本局进度将结束。再次挑战会重新开始。</p><div class="modal-actions"><button id="confirm-exit" class="danger">结束本局并返回</button><button id="cancel-exit">继续本局</button></div>';$('confirm-exit').onclick=()=>{const t=this.sim.teams[0];$('last-result').textContent=`上次挑战：${t.eliminatedAt!=null?'小队淘汰':'提前结束'} · 星尘 ${t.eliminatedAt!=null?t.dustBefore:t.carried}`;this.toMenu();};$('cancel-exit').onclick=()=>this.resume();}
    help(){
      $('modal').classList.remove('hidden');$('modal-content').innerHTML=`<h2>出征手册</h2><h3>带领整支小队</h3><p>按住战场任意空白处呼出摇杆，拖动移动，松开隐藏；电脑也可使用 WASD 或方向键。靠近敌人会自动攻击，移动时也能战斗。</p><div class="help-formations"><p><b>${iconMarkup(C.formations[0].icon)} 楔形 · 进攻</b><br>攻击×1.10，镇星自动突进，命中英雄触发荧惑强化集火。</p><p><b>${iconMarkup(C.formations[1].icon)} 圆阵 · 防守</b><br>防御×1.20、攻击×0.90、移动×0.90；分摊单体弹道伤害，持续保持可让荧惑蓄能。</p><p><b>${iconMarkup(C.formations[2].icon)} 横阵 · 分散</b><br>攻击×0.95，远程射程×1.20；拉开队形，重华生成减速区域。</p></div><h3>星尘与觉醒</h3><p>地图开局随机散落${C.scatter.initial}枚星尘，每${C.scatter.interval}秒补充${C.scatter.batch}枚，每枚${C.scatter.value}点。普通野怪掉落3点，精英掉落10点。星核45秒出现，单队连续占领2秒获得15点。争夺时暂停，受英雄伤害中断。累计每25点三选一觉醒，10秒未选自动选择；战斗持续进行。</p><h3>生存与胜负</h3><p>英雄拥有独立生命，阵亡不能复活。全队淘汰掉落一半星尘。105秒暗幕收缩，150秒形成最终安全区。只剩一队立即决胜；180秒按存活优先，再比较星尘、存活人数和队伍击杀数，完全同分可并列。</p><button id="help-close" class="primary">准备出征</button>`;$('help-close').onclick=()=>this.closeModal();
    }
    spectate(direction){const live=this.sim.teams.filter(t=>t.eliminatedAt==null);if(!live.length)return;const index=live.findIndex(t=>t.id===this.viewTeam);this.viewTeam=live[(Math.max(0,index)+direction+live.length)%live.length].id;this.renderer.lastTeam=-1;}
    showResults(){
      this.mode='result';this.clearInput();$('countdown').classList.add('hidden');$('modal').classList.add('hidden');$('hud').classList.add('hidden');$('results').classList.remove('hidden');const summary=this.sim.summary(),mine=summary.teams[0],winners=this.sim.rankings.filter(x=>x.rank===1).length;
      $('result-title').textContent=mine.rank===1?(winners>1?'并列第一':'胜利'):'最终名次：第'+mine.rank+'名';$('result-kicker').textContent=this.sim.reason==='all_dead'?'全员淘汰':this.sim.reason==='time'?'终局结算':'最后的小队';$('result-subtitle').textContent=`${timeLabel(this.sim.time)} · ${mine.alive}名英雄存活 · 累计获得${mine.earned}星尘`;
      $('result-teams').innerHTML=this.sim.rankings.map(({team:t,rank})=>{const a=summary.teams[t.id];return `<div class="result-row ${t.id===0?'mine':''}" style="--team-color:${t.color}"><span class="rank">${rank}</span><div><b>${t.symbol} ${t.id===0?'我方 · ':''}${t.name}</b><small>${a.alive}人存活 · 英雄击杀 ${a.heroKills} · 队伍击杀 ${a.teamKills}<br>伤害 ${Math.round(a.damage)} · 存活 ${a.survival.toFixed(1)}秒</small></div><div class="result-dust">✦ ${a.dust}<small>${t.eliminatedAt==null?'携带星尘':'淘汰前星尘'}</small></div></div>`;}).join('');
      $('result-detail').innerHTML=`<strong>我的战绩</strong>　伤害 ${Math.round(mine.damage)}　英雄击杀 ${mine.heroKills}　队伍击杀 ${mine.teamKills}<br><strong>本局觉醒</strong><div class="result-awakenings">${mine.awakenings.some(Boolean)?mine.awakenings.map((n,i)=>n?`<span>${iconMarkup(C.awakenings[i].icon)} ${C.awakenings[i].name} ×${n}</span>`:'').join(''):'<span>本局未获得觉醒</span>'}</div>`;
      $('last-result').textContent=`上次挑战：第${mine.rank}名 · 星尘 ${mine.dust}`;this.audio.play({type:'match_end',win:mine.rank===1});this.saveLog(summary);
    }
    saveLog(summary){if(this.logsSaved)return;this.logsSaved=true;let logs=read('three-star-logs',[]);logs.push(summary);logs=logs.slice(-20);while(logs.length&&!save('three-star-logs',logs))logs.shift();}
    toMenu(){this.mode='menu';this.clearInput();$('modal').classList.add('hidden');$('results').classList.add('hidden');$('hud').classList.add('hidden');$('countdown').classList.add('hidden');$('menu').classList.remove('hidden');this.renderer.minimap($('tactical-map'),new T.Simulation(20261119),0);$('start').focus({preventScroll:true});}
    fullscreen(){if(!document.fullscreenElement){const f=$('game-shell').requestFullscreen;if(f)f.call($('game-shell')).catch(()=>{});}else document.exitFullscreen?.().catch(()=>{});}
  }
  try{T.app=new App();}catch(error){$('loading').classList.remove('hidden');$('loading').classList.add('fatal');$('loading').textContent='启动失败：'+error.message+'。请完整解压运行包后重试。';console.error(error);}
})(globalThis);
