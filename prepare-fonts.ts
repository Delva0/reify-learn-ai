import fs from 'node:fs';
import path from 'node:path';
const out='public/assets/fonts';fs.mkdirSync(out,{recursive:true});
function mdxFiles(dir: string): string[]{return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?mdxFiles(path.join(dir,e.name)):e.name.endsWith('.mdx')?[path.join(dir,e.name)]:[]);}
const corpus=mdxFiles('content').map(p=>fs.readFileSync(p,'utf8')).join('')+fs.readdirSync('src/scripts').filter(f=>/\.[cm]?[jt]s$/.test(f)).map(f=>fs.readFileSync(path.join('src/scripts',f),'utf8')).join('');
// Nested code links encode their note text at each URL level.
let decodedCorpus=corpus,previousCorpus;
do{
 previousCorpus=decodedCorpus;
 decodedCorpus=decodedCorpus.replace(/(?:%[\da-f]{2})+/gi,value=>{try{return decodeURIComponent(value);}catch{return value;}});
}while(decodedCorpus!==previousCorpus);
const text=[...new Set([...(corpus+decodedCorpus)].filter(c=>/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(c)))].sort().join('')+Array.from({length:95},(_,i)=>String.fromCharCode(i+32)).join('');
const fonts: [string,string,string][]=[['noto','Noto Sans SC:wght@400..600',text],['plex','IBM Plex Mono:wght@400;500','']];
const headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'};
let combined='';
for(const [id,family,subset]of fonts){
 const url='https://fonts.googleapis.com/css2?family='+family.replaceAll(' ','+')+'&display=swap'+(subset?'&text='+encodeURIComponent(subset):'');
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Font stylesheet: ${response.status}`);
 let css=await response.text(),i=0;
 for(const remote of new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]))){
   const font=await fetch(remote,{signal:AbortSignal.timeout(30000)});if(!font.ok)throw Error(`Font binary: ${font.status}`);
   const filename=`${id}-${i++}.woff2`;fs.writeFileSync(path.join(out,filename),Buffer.from(await font.arrayBuffer()));css=css.split(remote).join(filename);
 }
 combined+=css+'\n';
 const license=await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${id==='noto'?'notosanssc':'ibmplexmono'}/OFL.txt`,{signal:AbortSignal.timeout(30000)});
 if(!license.ok)throw Error('Missing font license');fs.writeFileSync(path.join(out,id+'-OFL.txt'),await license.text());
}
fs.writeFileSync(path.join(out,'fonts.css'),combined);console.log('Prepared self-hosted Noto Sans SC and IBM Plex Mono.');
