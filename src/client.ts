import './demos.css';
import {$,downloadText,notice} from 'reify/lib/dom.js';
import {sourceText} from 'reify/client/sources.js';
const downloads=new WeakSet();
function hydrate(){
 if(document.querySelector('#runtime-state,#batch-state'))import('./scripts/demos.ts').then(({initDemos})=>initDemos());
 const button=$('#download-client');if(button&&!downloads.has(button)){downloads.add(button);button.addEventListener('click',async()=>{try{const text=await sourceText('example/client.py');if(typeof text!=='string')throw Error('Missing client.py');downloadText(text,'client.py');}catch{notice('客户端源码暂时无法加载，请重试');}});}
}
hydrate();document.addEventListener('reify:after-navigate',hydrate);
