/* 零依赖静态服务器；仅提供本游戏目录，供手机通过同一局域网访问。 */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT||8080);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{
  let filename;try{filename=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch(_){res.writeHead(400);res.end();return;}
  const target=path.resolve(root,'.'+filename+(filename.endsWith('/')?'index.html':''));
  if(target!==root&&!target.startsWith(root+path.sep)||filename.includes('/.')){res.writeHead(403);res.end('Forbidden');return;}
  fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);});
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口${port}已被占用，可设置环境变量 PORT=8081 后重试。`:e.message);process.exitCode=1;});
server.listen(port,'0.0.0.0',()=>{
 console.log('\n三芒星 · 网页版已启动\n');console.log(`电脑访问：http://localhost:${port}`);
 for(const interfaces of Object.values(os.networkInterfaces()))for(const i of interfaces||[])if(i.family==='IPv4'&&!i.internal)console.log(`同一Wi-Fi手机访问：http://${i.address}:${port}`);
 console.log('\n保持此窗口打开；按 Ctrl+C 停止服务。\n');
 if(process.argv.includes('--open'))require('node:child_process').spawn('cmd.exe',['/c','start','',`http://localhost:${port}`],{windowsHide:true,stdio:'ignore'});
});
