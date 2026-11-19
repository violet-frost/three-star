const {spawnSync}=require('node:child_process');
const path=require('node:path');
const script=path.join(__dirname,'package.py');
let result=spawnSync('python',[script],{stdio:'inherit'});
if(result.error?.code==='ENOENT')result=spawnSync('py',['-3',script],{stdio:'inherit'});
if(result.error){console.error('打包需要Python 3：',result.error.message);process.exit(1);}
process.exit(result.status??1);
