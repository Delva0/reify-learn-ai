import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../triton-inference-server-ge-backend');
const sha=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const paths=execFileSync('git',['-C',root,'-c','core.quotepath=false','ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const files=paths.map(p=>{const b=fs.readFileSync(path.join(root,p));const binary=b.includes(0)||/\.(png|jpg|jpeg)$/.test(p);return {path:p,bytes:b.length,lines:binary?0:b.toString('utf8').trimEnd().split('\n').length,text:binary?null:b.toString('utf8')};});
fs.writeFileSync(path.join(import.meta.dirname,'public/data/source-data.json'),JSON.stringify({sha,repository:'https://github.com/hicann/triton-inference-server-ge-backend',date:'2026-10-24',files}));
console.log(JSON.stringify({sha,files:files.length,textFiles:files.filter(f=>f.text!==null).length,cpp:files.filter(f=>f.path.endsWith('.cpp')).length,headers:files.filter(f=>f.path.endsWith('.h')).length}));
