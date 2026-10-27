import {record,text,array,json,registry as parseRegistry,snapshot as parseSnapshot,tree as parseTree,manifest as parseManifest,resources as parseResources,json as parseJson} from './tools-data.ts';
import type {DefaultTreeAdapterTypes as HtmlTree} from 'parse5';
import type {CodeDefinition} from 'reify/lib/data-types.js';
type HtmlNode=HtmlTree.Node;type HtmlElement=HtmlTree.Element;
const entities: Record<string,string>={amp:'&',lt:'<',gt:'>',quot:String.fromCharCode(34),apos:String.fromCharCode(39)};
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {splitBatch,slices,resources} from './src/scripts/demos.ts';
import {PLAN_CODE} from './src/lib/code-samples.ts';
import {indexTree} from 'reify/lib/github-files.js';
import {codeDistribution} from 'reify/lib/code-distribution.js';
import {isWebFile} from 'reify/lib/code-props.js';
import {parseFpUrl} from 'reify/lib/fp-links.js';
import {fileResource} from 'reify/lib/file-resource.js';
import {linkKind} from 'reify/lib/links.js';
import {sidebarBootstrap} from 'reify/lib/sidebar-state.js';
import {articleBasePath} from 'reify/lib/article-pages.js';
import {internalCodeTargets} from 'reify/lib/code-links.js';
import {normalizeCodeBlock} from 'reify/lib/code-block.js';
import {resolveCodeAnnotations} from 'reify/lib/code-annotations.js';
import {parseFragment,serialize} from 'parse5';

const root=import.meta.dirname,dist=process.env.REIFY_CHECK_DIST||'dist',cache=new Map<string,string>(),read=(name: string)=>{const target=name==='dist'?dist:name.startsWith('dist/')?path.join(dist,name.slice(5)):name;let source=cache.get(target);if(source===undefined){source=fs.readFileSync(path.resolve(root,target),'utf8');cache.set(target,source);}return source;};
const snapshot=parseSnapshot(json(read('public/data/source-data.json')));
const files=new Map(snapshot.files.map(file=>[file.path,file]));
const registry=parseRegistry(json(read('content/repositories.json')));
const resourcesIndex=parseResources(json(read('dist/data/file-cache/index.json')));
for(const repo of registry)for(const version of repo.versions){
 const url=`data/trees/v3/${repo.id}/${version.commit}.json`,json=read('public/'+url);
 assert.equal(read('dist/'+url),json,repo.id+': published complete tree');
 const data=parseTree(parseJson(json)),tree=indexTree(data,repo.name,version.commit);assert(tree.has(''),repo.id+': indexed repository tree');
 assert.equal(data.schema,3);assert.equal(data.statistics.metric,'non-empty-lines');
 for(const entry of data.entries)if(entry.type==='blob')assert(Number.isSafeInteger(entry.lines)&&entry.lines>=0,entry.path+': source line statistics');
 const distribution=codeDistribution(tree);assert(distribution.languages.length,repo.id+': repository languages');
 assert.equal(distribution.total,data.entries.reduce((sum,entry)=>sum+(entry.type==='blob'?entry.lines:0),0),repo.id+': distribution conserves source lines');
}
const facts=record(json(read('data/ge-facts.json')));
const factIds=new Set(array(facts.facts).map(value=>text(record(value).id)));
const decode=(value: string)=>value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_: string,name: string)=>name[0]==='#'?String.fromCodePoint(name[1].toLowerCase()==='x'?parseInt(name.slice(2),16):+name.slice(1)):(entities[name]||''));
const attr=(attrs: string,name: string)=>decode(attrs.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"'))?.[1]||'');
const mathCss=read('dist/assets/katex/katex.min.css');
for(const font of mathCss.matchAll(/url\((fonts\/[^)]+)\)/g))assert(fs.existsSync(path.resolve(root,dist,'assets/katex',font[1])),font[1]+': bundled math font');
let highlightedSourceFiles=0;
for(const file of snapshot.files.filter((file): file is {path: string; text: string}=>typeof file.text==='string')){
 const html=read('dist/data/highlight/'+snapshot.sha+'/'+file.path+'.html');
 const code=html.match(/<code>([\s\S]*)<\/code>/)?.[1];assert(code!==undefined,file.path+': highlighted source');
 assert.equal(decode(code.replace(/<[^>]*>/g,'')),file.text.replace(/\r\n/g,'\n'),file.path+': source text preserved');
 assert.equal((code.match(/class="line"/g)||[]).length,file.text.split('\n').length,file.path+': source line count');
 if(/\.(cpp|h)$/.test(file.path))assert(html.includes('--shiki-dark:'),file.path+': dual themes');
 highlightedSourceFiles++;
}
const pageManifest=(html: string)=>parseManifest(json(html.match(/<script id="article-pages"[^>]*>([\s\S]*?)<\/script>/)?.[1]||'{}'));
function articleParts(html: string){
 const root=parseFragment(html),attribute=(node: HtmlNode,name: string)=>'attrs' in node?node.attrs.find(item=>item.name===name)?.value:undefined;
 const find=(node: HtmlNode,test: (node: HtmlNode)=>boolean): HtmlNode | undefined=>test(node)?node:('childNodes' in node?node.childNodes:[]).map(child=>find(child,test)).find(Boolean);
 const article=find(root,node=>'tagName' in node&&node.tagName==='article'&&attribute(node,'class')==='document'),sidebar=find(root,node=>attribute(node,'class')==='repo-tree');
 const isolate=(node: HtmlNode)=>{if('childNodes' in node){node.childNodes=node.childNodes.filter(child=>attribute(child,'data-file-document')===undefined);node.childNodes.forEach(isolate);}if('content' in node)isolate(node.content);};
 if(article)isolate(article);return {article:article&&'childNodes' in article?serialize(article):undefined,sidebar:sidebar&&'childNodes' in sidebar?serialize(sidebar):''};
}
const blockCatalog=new Map<string,Record<string,CodeDefinition>>();
function templates(html: string){const items: HtmlElement[]=[];const walk=(node: HtmlNode)=>{if('tagName' in node&&node.tagName==='template'&&node.attrs.some(attr=>attr.name==='data-code-definition'))items.push(node);for(const child of 'childNodes' in node?node.childNodes:[])walk(child);};walk(parseFragment(html));return items;}
function blocksFor(filename: string): Record<string,CodeDefinition>{
 const base=articleBasePath('/'+filename);if(blockCatalog.has(base))return blockCatalog.get(base)!;
 const blocks: Record<string,CodeDefinition>=Object.create(null),html=read('dist/'+filename),manifest=pageManifest(html);
 for(const page of manifest.pages||[])for(const template of templates(read('dist/'+page.href))){
  const raw=record(json(template.attrs.find(attr=>attr.name==='data-code-definition')!.value)),block=normalizeCodeBlock({...raw,lines:raw.ranges});assert(!Object.hasOwn(blocks,block.id),filename+': unique CodeBlock id '+block.id);
  assert.deepEqual(block,raw,filename+': normalized CodeBlock '+block.id);blocks[block.id]=block;
  assert(manifest.anchors[block.id],filename+': cross-page block location');
 }
 blockCatalog.set(base,blocks);return blocks;
}
const basePages=[...registry.flatMap(repo=>[repo.page,...repo.versions.map(version=>repo.id+'-'+version.id+'.html')]),'repos.html'];
const filenames=[...new Set(basePages.flatMap(filename=>pageManifest(read('dist/'+filename)).pages?.map(page=>page.href)||[filename]))];
assert.deepEqual(fs.readdirSync(path.resolve(root,dist)).filter(name=>name.endsWith('.html')).sort(),[...filenames].sort(),'only current logical pages are published');
let refs=0,pages=0;
for(const filename of filenames){
 const html=read('dist/'+filename),{article,sidebar:sidebarHtml}=articleParts(html);pages++;
 assert(html.includes('Astro v7.'),filename+': Astro generator');assert(article,filename+': article');
 assert(html.indexOf(sidebarBootstrap)>0&&html.indexOf(sidebarBootstrap)<html.indexOf('rel="stylesheet"'),filename+': sidebar preferences restored before styles and first paint');
 assert.equal((html.match(/id="control-tip"/g)||[]).length,1,filename+': shared control tip');
 assert(/<dialog\b[^>]*data-code-viewer[^>]*data-floating-dismiss="explicit"/.test(html),filename+': code viewers require explicit closing');
 assert(!/<(?:button|a)\b[^>]*\btitle=/.test(html),filename+': controls use site tips');
 assert(html.includes('href="/assets/katex/katex.min.css"'),filename+': explicit KaTeX stylesheet');
 assert(!article.includes('katex-error'),filename+': valid KaTeX');
 const definitions=new Map<string,string>();
 for(const match of article.matchAll(/data-note-definitions="([^"]+)"/g))for(const [id,desc]of Object.entries(record(json(decode(match[1]))))){
  assert(!definitions.has(id),filename+': duplicate annotation '+id);assert(typeof desc==='string');assert(desc.trim());definitions.set(id,desc);
 }
 for(const match of article.matchAll(/\bdata-note="([^"]+)"/g))assert(definitions.has(decode(match[1])),filename+': undefined annotation '+match[1]);
 for(const match of article.matchAll(/<(a|button|span)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/g)){
  const [,tag,attrs]=match,href=attr(attrs,'href');if(!attr(attrs,'data-note-description'))continue;
  assert.equal(tag,href?'a':'span',filename+': annotation link semantics');
  assert(attr(attrs,'data-note-description').trim(),filename+': annotation description');
 }
 if(article.includes('class="katex"'))assert(article.includes('var(--math-'),filename+': theme-aware formula colors');
 assert(!html.includes('<footer'));assert(!html.includes('reading-crumb'));assert(!html.includes('astro-island'));
 for(const obsolete of ['src="app.js"','src="source-data.js"','src="ge-facts.js"','src="repositories.js"'])assert(!html.includes(obsolete),obsolete);
 assert(!/\bdata-source=/.test(html),filename+': no legacy source buttons');
 const cachedFiles=parseResources(json(html.match(/<script id="file-resources"[^>]*>([\s\S]*?)<\/script>/)?.[1]||'{}'));
 const blocks=blocksFor(filename),hrefs=[...article.matchAll(/<a\b([^>]*)>/g)].map(match=>attr(match[1],'href'));
 const repo=registry.find(repo=>articleBasePath('/'+filename)==='/'+repo.page.replace(/\.html$/,'')||repo.versions.some(version=>articleBasePath('/'+filename)==='/'+repo.id+'-'+version.id)),version=repo?.versions.find(version=>articleBasePath('/'+filename)==='/'+repo.id+'-'+version.id)||repo?.versions.find(version=>version.id===repo.defaultVersion),context={repository:repo?.name,commit:version?.commit};
 for(const block of Object.values(blocks)){
  let code=block.code;
  if(block.src){const resource=fileResource(block.src,context),entry=resourcesIndex[resource.url];assert(entry?.kind==='code',filename+': published CodeBlock source '+block.id);const highlighted=read('dist'+decodeURIComponent(text(entry.asset)));code=decode(highlighted.match(/<code[^>]*>([\s\S]*?)<\/code>/)![1].replace(/<[^>]*>/g,''));refs++;}
  assert(typeof code==='string',filename+': CodeBlock source text '+block.id);resolveCodeAnnotations(code,block);assert(block.ranges.every(range=>range.to<=code.split('\n').length),filename+': CodeBlock ranges '+block.id);
  for(const {href}of block.links)for(const state of parseFpUrl(href,'https://check.test/'+filename,{samePage:false})||[])if(state.type==='code'&&state.props.block)assert(Object.hasOwn(blocksFor(new URL(href,'https://check.test/'+filename).pathname.slice(1)),state.props.block),filename+': annotation block target '+state.props.block);
 }
 for(const {target}of internalCodeTargets(hrefs,'https://check.test/'+filename,blocks)){
  const resource=fileResource(target.file,context),entry=cachedFiles[resource.url];assert(entry,filename+': reachable block resource pre-cache '+target.file);assert.deepEqual(entry,resourcesIndex[resource.url]);
 }
 for(const match of article.matchAll(/<a\b([^>]*)>/g)){
  const href=attr(match[1],'href'),kind=linkKind(href,'https://check.test/'+filename);assert.equal(attr(match[1],'data-link-kind'),kind||'',filename+': link destination marker '+href);
  for(const state of parseFpUrl(href,'https://check.test/'+filename,{samePage:false})||[]){if(state.type!=='code')continue;const target=state.props;if(target.block){const targetHtml=read('dist/'+new URL(href,'https://check.test/'+filename).pathname.slice(1));assert(Object.hasOwn(pageManifest(targetHtml).anchors,target.block),filename+': referenced block '+target.block);continue;}if(!target.file)continue;
  const destination=articleBasePath(new URL(href,'https://check.test/'+filename).pathname).slice(1)+'.html';
  const repo=registry.find(repo=>repo.page===destination||repo.versions.some(version=>repo.id+'-'+version.id+'.html'===destination));
  const version=repo?.versions.find(version=>repo.id+'-'+version.id+'.html'===destination)||repo?.versions.find(version=>version.id===repo.defaultVersion);
  const resource=fileResource(target.file,{repository:repo?.name,commit:version?.commit}),cached=cachedFiles[resource.url];assert(cached,filename+': pre-cached '+target.file);assert.deepEqual(resourcesIndex[resource.url],cached,filename+': shared cross-article cache');
  if(cached.asset){const assetPath=decodeURIComponent(cached.asset);assert(fs.existsSync(path.join(path.resolve(root,dist),assetPath)),filename+': published file cache '+target.file);if(cached.kind==='code'){const highlighted=read('dist'+assetPath);assert(highlighted.includes('<pre'),target.file+': cached syntax highlighting');assert.equal((highlighted.match(/class="line"/g)||[]).length,cached.lines,target.file+': cached line count');}}
  for(const range of target.ranges||[])assert(!cached.lines||(range.to||range.from)<=cached.lines,filename+': cached line range');
  if(isWebFile(target.file)){refs++;continue;}
  assert(repo&&version,filename+': repository context');const tree=indexTree(json(read('public/data/trees/v3/'+repo.id+'/'+version.commit+'.json')),repo.name,version.commit);
  const parts=target.file.split('/'),name=parts.pop(),entry=tree.get(parts.join('/'))?.find(entry=>entry.path===name);assert(entry&&entry.type!=='tree',filename+': '+target.file);
  if(version.commit===snapshot.sha){const source=files.get(target.file)?.text;assert(source,target.file);for(const range of target.ranges||[])assert((range.to||range.from)<=source.split('\n').length,target.file+': line range');}
  refs++;
  }
 }
 for(const match of html.matchAll(/data-ge-facts="([^"]+)"/g))for(const id of match[1].split(' '))assert(factIds.has(id),id);
 const headingMatches=[...article.matchAll(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/g)];
 const headings=headingMatches.map(m=>({id:attr(m[2],'id'),text:attr(m[2],'data-exact-heading')||decode(m[3].replace(/<[^>]*>/g,'')),level:+m[1]}));
 const manifest=pageManifest(html);assert.equal(headings.filter(h=>h.level===1).length,1,filename+': exactly one H1 per logical page');
 assert.deepEqual(headings,manifest.headings.map(h=>({id:h.slug,text:h.text,level:h.depth})),filename+': original global heading identities survive pagination');
 headings.forEach(heading=>{assert(/[\u4e00-\u9fff]/.test(heading.text));assert(!/[：:]/.test(heading.text));});
 headingMatches.forEach(match=>assert(/<a\b[^>]*href=/.test(match[3]),filename+': every heading has a native link'));
 if(filename!=='repos.html'){
  assert(html.includes('class="github-files"'),filename+': repository file browser');
  assert(/data-tree-url="\/data\/trees\/[^"]+\.json"/.test(html),filename+': pinned directory snapshot');
  const sidebar=[...sidebarHtml.matchAll(/<a\b([^>]*data-heading[^>]*)>([^<]*)<\/a>/g)].filter(m=>attr(m[1],'href').startsWith('#')).map(m=>({id:attr(m[1],'data-heading'),text:decode(m[2])}));
  assert.deepEqual(sidebar,headings.map(({id,text})=>({id,text})),filename+': exact MDX directory');
 }
 for(const link of html.matchAll(/href="([a-z][\w.-]*\.html)(?:#([^"]+))?"/g)){
  const target=read('dist/'+link[1]);if(!link[2])continue;
  const page=pageManifest(target).anchors?.[link[2]],destination=page?read('dist/'+page):target;
  assert(destination.includes(`id="${link[2]}"`),filename+': '+link[0]);
 }
 const codeBlocks=(article.match(/class="code-block"/g)||[]).length,labels=(article.match(/class="code-language"/g)||[]).length;
 assert.equal(codeBlocks,labels,filename+': code languages');
 for(const match of article.matchAll(/<(a|button)\b([^>]*\bdata-code-toggle\b[^>]*)>/g)){
  assert.equal(match[1],'a',filename+': code expansion uses a native link');
  const state=parseFpUrl(attr(match[2],'href'),'https://check.test/'+filename);
  assert(state?.length===1&&state[0].type==='code'&&article.includes('id="'+state[0].props.block+'"'),filename+': expansion URL targets its article code block');
 }
 if(codeBlocks)assert(article.includes('astro-code'),filename+': build-time Shiki');
}
let cases=0;
for(let B=1;B<=100;B++)for(let p=1;p<=16;p++){const parts=splitBatch(B,p);assert.equal(parts[0].start,0);assert.equal(parts.at(-1)!.end,B);assert.equal(parts.reduce((n,s)=>n+s.end-s.start,0),B);for(let k=1;k<p;k++)assert.equal(parts[k].start,parts[k-1].end);cases++;}
for(let H=1;H<=16;H++)for(let D=1;D<=8;D++)for(let P=1;P<=8;P++){const r=resources(H,D,P,0);assert.equal(r.K,Math.ceil(H*P/D));assert(r.E>=H*P);assert(r.valid);assert.equal(r.maxRunning,H);cases++;}
assert(!resources(4,1,3,1).valid);assert.deepEqual(slices([1,2,4]),[{start:0,end:1},{start:1,end:3},{start:3,end:7}]);
assert.equal(read('public/batch_plan.py'),PLAN_CODE);
console.log(JSON.stringify({status:'passed',framework:'Astro',pages,sourceReferences:refs,highlightedSourceFiles,formulaCases:cases,commit:snapshot.sha}));
