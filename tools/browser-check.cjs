/* 使用专用的无头Chrome会话测试本项目，不访问用户浏览器数据。 */
const fs=require('node:fs'),path=require('node:path');
class CDP{
 async connect(url){this.ws=new WebSocket(url);this.seq=0;this.pending=new Map();await new Promise((resolve,reject)=>{this.ws.onopen=resolve;this.ws.onerror=reject;});this.ws.onmessage=e=>{const data=JSON.parse(e.data);if(data.id){const p=this.pending.get(data.id);if(p){this.pending.delete(data.id);data.error?p.reject(data.error):p.resolve(data.result);}}else this.onEvent?.(data);};return this;}
 call(method,params={}){return new Promise((resolve,reject)=>{const id=++this.seq;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
 async eval(expression){const r=await this.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
 close(){this.ws.close();}
}
module.exports=CDP;
if(require.main===module)(async()=>{
 const tabs=await(await fetch('http://127.0.0.1:9227/json')).json();const tab=tabs.find(t=>t.type==='page');const c=await new CDP().connect(tab.webSocketDebuggerUrl),errors=[];
 c.onEvent=e=>{if(e.method==='Runtime.exceptionThrown')errors.push(e.params.exceptionDetails);};await c.call('Runtime.enable');await c.call('Page.enable');await c.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await c.call('Page.navigate',{url:'http://127.0.0.1:8080'});await new Promise(r=>setTimeout(r,1600));
 const out=path.resolve(__dirname,'../output');fs.mkdirSync(out,{recursive:true});
 async function snap(name){const r=await c.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.data,'base64'));}
 await snap('desktop-menu');console.log('INIT',await c.eval(`({ready:!!ThreeStar.app,mode:ThreeStar.app.mode,loaded:ThreeStar.app.renderer.atlas.complete,body:document.body.scrollWidth,screen:innerWidth})`));
 await c.eval(`document.querySelector('#start').click()`);await new Promise(r=>setTimeout(r,3300));await snap('desktop-battle');
 const p=await c.eval(`({...ThreeStar.app.sim.teams[0].center})`);await c.call('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD'});await new Promise(r=>setTimeout(r,1000));await c.call('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD'});
 console.log('MOVE',await c.eval(`({before:${JSON.stringify(p)},after:ThreeStar.app.sim.teams[0].center,mode:ThreeStar.app.mode,time:ThreeStar.app.sim.time})`));
 await c.eval(`document.querySelector('[data-formation="1"]').click()`);await c.eval(`document.querySelector('#pause').click()`);const frozen=await c.eval('ThreeStar.app.sim.time');await new Promise(r=>setTimeout(r,400));console.log('PAUSE',await c.eval(`({mode:ThreeStar.app.mode,time:ThreeStar.app.sim.time,expected:${frozen}})`));await snap('desktop-pause');
 await c.eval(`document.querySelector('#resume').click()`);await new Promise(r=>setTimeout(r,3300));
 await c.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await c.call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await new Promise(r=>setTimeout(r,400));await snap('mobile-battle');
 console.log('MOBILE',await c.eval(`({width:innerWidth,scroll:document.documentElement.scrollWidth,shell:document.querySelector('#game-shell').getBoundingClientRect().toJSON(),mode:ThreeStar.app.mode})`));
 await c.eval(`ThreeStar.app.sim.generated+=25;ThreeStar.app.sim.gain(ThreeStar.app.sim.teams[0],25,'browser-check');ThreeStar.app.updateHUD()`);await snap('mobile-awakening');
 await c.eval(`document.querySelector('[data-awaken]').click()`);console.log('CHOICE',await c.eval(`({pending:ThreeStar.app.sim.teams[0].pending,stacks:ThreeStar.app.sim.teams[0].stacks})`));
 await c.eval(`ThreeStar.app.sim.teams[0].controller='ai';for(let i=0;i<5400&&!ThreeStar.app.sim.ended;i++)ThreeStar.app.sim.step();ThreeStar.app.showResults()`);await snap('mobile-results');console.log('RESULT',await c.eval(`({mode:ThreeStar.app.mode,rows:document.querySelectorAll('.result-row').length,time:ThreeStar.app.sim.time})`));
 await c.eval(`document.querySelector('#restart').click()`);console.log('RESTART',await c.eval(`({mode:ThreeStar.app.mode,time:ThreeStar.app.sim.time,dust:ThreeStar.app.sim.teams[0].carried,heroes:ThreeStar.app.sim.teams[0].heroes.length})`));
 console.log('ERRORS',JSON.stringify(errors));c.close();
})().catch(e=>{console.error(e);process.exit(1);});
