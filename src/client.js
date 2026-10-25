import './demos.css';
import {$,downloadText,notice} from 'reify/lib/dom.js';
import {sourceText} from 'reify/client/sources.js';
if(document.querySelector('#runtime-state,#batch-state'))import('./scripts/demos.js').then(({initDemos})=>initDemos());
$('#download-client')?.addEventListener('click',async()=>{try{const text=await sourceText('example/client.py');if(typeof text!=='string')throw Error('Missing client.py');downloadText(text,'client.py');}catch{notice('客户端源码暂时无法加载，请重试');}});
