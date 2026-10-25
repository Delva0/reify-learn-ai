import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {indexTree} from 'reify/lib/github-files.js';
import {gitBlobLines} from 'reify/build/git-blob-lines.mjs';

const root=path.resolve(import.meta.dirname,'..');
const clones=path.resolve(process.argv[2]||path.join(root,'..'));
const repositories=JSON.parse(await fs.readFile(path.join(root,'content/repositories.json'),'utf8'));
for(const repository of repositories)for(const version of repository.versions){
 const checkout=path.join(clones,repository.name.split('/').at(-1));
 const records=execFileSync('git',['-C',checkout,'ls-tree','--full-tree','-r','-t','-l','-z',version.commit],{maxBuffer:64*1024*1024}).toString('utf8').split('\0').filter(Boolean);
 const objects=new Map();
 const entries=records.map(record=>{
  const match=record.match(/^\d+ (blob|tree|commit) ([0-9a-f]+)\s+(-|\d+)\t([\s\S]+)$/);
  if(!match)throw Error('Invalid Git tree entry');
  const [,type,object,size,name]=match;objects.set(name,object);
  return size==='-'?{path:name,type}:{path:name,type,size:Number(size)};
 });
 console.log(`${repository.name}@${version.id}: counting source lines`);
 const blobs=entries.filter(entry=>entry.type==='blob'),counts=await gitBlobLines(checkout,[...new Set(blobs.map(entry=>objects.get(entry.path)))]);
 for(const entry of blobs)entry.lines=counts.get(objects.get(entry.path));
 const data={schema:3,repository:repository.name,commit:version.commit,statistics:{tool:'ghloc',version:'4d52e65853353de0709214e818e6d7bcbf525f36',metric:'non-empty-lines'},entries};
 indexTree(data,repository.name,version.commit);
 const directory=path.join(root,'public/data/trees/v3',repository.id),json=JSON.stringify(data);
 await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,version.commit+'.json'),json);
 console.log(`${repository.name}@${version.id}: ${entries.length} entries, ${Buffer.byteLength(json)} bytes`);
}
