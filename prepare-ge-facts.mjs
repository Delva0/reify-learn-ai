import fs from 'node:fs';
import path from 'node:path';
const root=import.meta.dirname,infra=path.resolve(root,'..');
const report=JSON.parse(fs.readFileSync(path.join(infra,'ge-source-notes.json'),'utf8'));
const repos=Object.fromEntries(Object.entries(report.repositories).map(([key,r])=>[key,{url:r.url,commit:r.commit,directory:r.directory.split('/').at(-1)}]));
const facts=report.facts.map(f=>({id:f.id,claim:f.claim,evidence:f.evidence.map(e=>{
 const original=report.repositories[e.repository],relative=e.path.slice(original.directory.length+1);
 const lines=fs.readFileSync(path.join(infra,repos[e.repository].directory,relative),'utf8').split('\n');
 if(e.line_start<1||e.line_end>lines.length)throw Error('Invalid source range '+e.path);
 return {repository:e.repository,file:relative,line:e.line_start,end:e.line_end,url:e.url};
})}));
fs.writeFileSync(path.join(root,'data/ge-facts.json'),JSON.stringify({repositories:repos,facts}));
console.log(JSON.stringify({facts:facts.length,evidence: facts.reduce((n,f)=>n+f.evidence.length,0)}));
