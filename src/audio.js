(function(G){
  'use strict';
  class AudioEngine{
    constructor(settings){this.settings=settings;this.ctx=null;this.nextNote=0;this.note=0;this.last={};}
    unlock(){try{this.ctx??=new(window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch(_){}}
    tone(freq,duration=.1,type='sine',volume=.04,delay=0,end=null){
      if(!this.ctx||this.ctx.state!=='running')return;const now=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);if(end)o.frequency.exponentialRampToValueAtTime(end,now+duration);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);g.connect(this.ctx.destination);o.start(now);o.stop(now+duration+.02);
    }
    play(event,own=true){
      if(!this.settings.sfx)return;const type=event.type,now=this.ctx?.currentTime||0,min=type==='attack'?.12:type==='damage'?.1:.08;if(now-(this.last[type]??-10)<min)return;this.last[type]=now;
      const v=own?.04:.018;
      if(type==='attack'){const f=[170,430,570][event.hero||0];this.tone(f,.09,event.hero===0?'triangle':'sine',v,0,f*.55);}
      else if(type==='damage')this.tone(110,.065,'triangle',v*.65,0,70);
      else if(type==='skill'){[330,440,550].forEach((f,i)=>this.tone(f,.15,'triangle',v,i*.04));}
      else if(type==='synergy'){[523,659,784].forEach((f,i)=>this.tone(f,.22,'sine',v,i*.05));}
      else if(type==='dust_gain'){this.tone(880,.13,'sine',v);this.tone(1175,.16,'sine',v*.65,.06);}
      else if(type==='formation_changed'){this.tone(330+event.to*70,.13,'triangle',v);}
      else if(type==='hero_dead'||type==='team_eliminated'){this.tone(220,.35,'triangle',v,0,82);}
      else if(type==='awakening_offer'||type==='awakening_selected'){[523,659,784,1046].forEach((f,i)=>this.tone(f,.25,'sine',v,i*.08));}
      else if(type==='core_spawn'||type==='core_captured'){[392,523,659].forEach((f,i)=>this.tone(f,.5,'triangle',.045,i*.12));}
      else if(type==='phase'){this.tone(164,.6,'triangle',.045);this.tone(246,.6,'sine',.025,.2);}
      else if(type==='match_end'){const win=event.win,notes=win?[523,659,784,1046]:[392,330,262];notes.forEach((f,i)=>this.tone(f,.6,'triangle',.05,i*.15));}
      else if(type==='reject')this.tone(140,.08,'triangle',.025);
    }
    update(mode,remaining){
      if(!this.settings.music||!this.ctx||this.ctx.state!=='running'||mode==='paused'||mode==='countdown'||mode==='result')return;
      const now=this.ctx.currentTime;if(now<this.nextNote)return;
      const battle=mode==='playing',urgent=battle&&remaining<30,melody=battle?[220,0,330,293.66,261.63,0,329.63,392,349.23,0,293.66,261.63,220,0,196,0]:[261.63,329.63,392,0,349.23,293.66,261.63,0];
      const n=melody[this.note++%melody.length];if(n)this.tone(n,battle?.6:1.2,'sine',urgent?.021:.014);if(this.note%4===0)this.tone(battle?110:130.81,1.5,'sine',.016);this.nextNote=now+(urgent?.22:battle?.34:.48);
    }
  }
  G.ThreeStar.AudioEngine=AudioEngine;
})(globalThis);
