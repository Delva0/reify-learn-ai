import {required,$$} from 'reify/lib/dom.js';
const $=(selector: string)=>required<HTMLElement>(selector);
const input=(id: string)=>required<HTMLInputElement | HTMLSelectElement>('#'+id);
type Phase='load'|'idle'|'run'|'done'|'unload';
const phases: readonly string[]=['load','idle','run','done','unload'];
const isPhase=(value: string): value is Phase=>phases.includes(value);
export {PLAN_CODE} from '../lib/code-samples.ts';
function table(head: string[],rows: (string | number)[][]){return `<div class="table-wrap"><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
export function splitBatch(B: number,p: number){const q=Math.floor(B/p),u=B%p;return Array.from({length:p},(_,k)=>{const start=k*q+Math.min(k,u);return {start,end:start+q+(k<u?1:0)};});}
export function slices(batches: number[]){let offset=0;return batches.map(b=>{const start=offset;offset+=b;return {start,end:offset};});}
function boundedInput(id: string,max: number){return Math.min(max,Math.max(1,Math.trunc(Number(input(id).value)||1)));}
export function resources(H: number,D: number,P: number,override: number){const K=override||Math.ceil(H*P/D),E=D*K;return {H,D,P,K,E,valid:P<=E,maxRunning:Math.min(H,Math.floor(E/P))};}
let phase: Phase='idle';
export function renderRuntime(){if(!document.querySelector('#runtime-state'))return;const r=resources(boundedInput('h',16),boundedInput('d',8),boundedInput('p',8),+input('k').value);$('#resource-count').textContent=`K=${r.K}，E=${r.E}，占用资源的调用数≤${r.maxRunning}`;
$$('[data-phase]').forEach(b=>{b.classList.toggle('active',b.dataset.phase===phase);b.setAttribute('aria-pressed',String(b.dataset.phase===phase));});
const rows: Record<Phase,string[][]>={
load:[['Triton 调用线程','正在 Model/ModelInstance 初始化，尚不对这个实例执行在线请求。'],['本仓线程',`本模型累计创建 E=${r.E} 个图初始化线程；ParseGraph 的 parser 调用互斥，其他准备可并行，最终 join。`],['主机 / NPU 资源','ModelState 与 I/O 描述已建立；Session、编译图、stream 正在创建/装载，成功者进入 Scheduler。'],['就绪条件','所有初始化线程结束且无失败 → 初始化返回成功；Triton 才将实例纳入可用执行资源。']],
idle:[['Triton 线程','服务线程等待网络事件，实例执行侧等待调度；其线程总数不是 H。'],['本仓显式工作线程','没有常驻图初始化线程，也没有 Start 创建的后台消费线程。'],['长期对象',`模型描述、H=${r.H} 份 ModelInstanceState / Inference、E=${r.E} 个 Scheduler::Instance 对象及其引用的图与 stream 仍存在。`],['请求局部内存','尚无本次调用的输入 HBM、主机总输出、各 Scheduler::Instance 对应的临时输出；具体模型常驻显存由 GE 模式决定。']],
run:[['调用线程',r.valid?`BatchSplicTasks 先取得 P=${r.P} 个 Scheduler::Instance 对象；准备数据后，${r.P===1?'直接在该线程运行并等待 stream':'创建 P 个工作线程，父线程等待 join'}。`:`P=${r.P} > E=${r.E}，空闲 Scheduler::Instance 数量无法满足要求，停在 GetIdleInstances 等待。`],['本仓显式推理线程',r.valid?(r.P===1?'本次调用额外创建 0 个；当前 Triton 回调线程执行。':`本次调用累计创建 ${r.P} 个临时工作线程；每个线程设置对应对象的 context，提交图后等待 stream。`):'尚未进入 DispatchInference，不创建本次图执行线程。'],['Scheduler::Instance',r.valid?`本次取得的 ${r.P} 个对象保持 RUNNING；其余 ${Math.max(0,r.E-r.P)} 个对象未被本次调用占用。每个对象保存执行图所需的 stream 等资源引用。`:'本次尚未取得记录，也没有提交本次设备工作。'],['内存与数据',r.valid?'Triton 主机输入 → H2D → HBM 输入；设备输出在 stream 完成后 D2H 到主机总输出，最后按原 request 切片。':'输入处理尚未开始。']],
done:[['调用线程','工作线程已经 join；响应填入 Triton OutputBuffer，ResponseSend，RequestRelease；Execute 返回。'],['Scheduler::Instance','ScopedInstanceStatusReset 将本次取得的记录恢复为 IDLE，通知等待者。'],['请求局部内存','设备输入、主机总输出、各 Scheduler::Instance 对应的临时输出按执行路径释放；Triton 接手已发送的响应传输。'],['长期对象','ModelState、Inference、Session、图、stream 保留；下一次请求复用执行资源。']],
unload:[['Triton 生命周期','ModelInstanceFinalize 删除实例状态和 Inference；ModelFinalize 删除 ModelState。'],['本仓代码事实','ModelState / Scheduler 析构主体为空；raw Session*、graph、stream 没有在这里形成完整的显式销毁链。'],['不能推出的结论','不能把“对象 delete 了”画成“所有 GE/ACL 资源归零”。GE Session 的实际销毁语义见依赖页。'],['实现责任','需要明确 Session、Graph、stream、设备与全局环境的清理顺序，以及失败/部分成功路径。']]
};$('#runtime-state').innerHTML=table(['运行时角色','此刻的状态'],rows[phase])+`<p>所有并发 BatchSplicTasks 调用在推理阶段额外创建的工作线程峰值 ≤ ${(r.P>1?r.P*r.maxRunning:0)}；整个 tritonserver 还包含调用线程和库内部线程。</p>`;}
export function renderBatch(){if(!document.querySelector('#batch-state'))return;const raw=input('request-batches').value.split(',').map(s=>s.trim()),b=raw.map(Number),p=boundedInput('split-p',16);if(!raw.length||raw.length>20||raw.some((s,i)=>!s||!Number.isInteger(b[i])||b[i]<=0||b[i]>100000)){$('#batch-state').innerHTML='<p>输入正整数 batch 列表，逗号分隔；本演示最多 20 个请求。</p>';return;}const B=b.reduce((a,n)=>a+n,0),request=slices(b),worker=splitBatch(B,p);$('#batch-state').innerHTML=`<p><code>n=${b.length}，B=${B}，P=${p}，q=${Math.floor(B/p)}，u=${B%p}</code></p>`+table(['原请求 r','bᵣ','原请求区间 [aᵣ,aᵣ+bᵣ)'],request.map((s,i)=>[i,b[i],`[${s.start}, ${s.end})`]))+table(['Scheduler::Instance 索引 k','b̂ₖ','执行区间 [oₖ,oₖ+b̂ₖ)'],worker.map((s,i)=>[i,s.end-s.start,`[${s.start}, ${s.end})${s.start===s.end?' · 跳过计算':''}`]))+'<p>两套区间覆盖同一个 [0,B)，但切分边界不同。D2H 先写回总输出，Response 再按第一张表还原。</p>';}

let initialized=false;const bound=new WeakSet();
export function initDemos(){
 for(const id of ['h','d','p','k','request-batches','split-p']){const input=document.getElementById(id);if(input&&!bound.has(input)){bound.add(input);input.addEventListener('input',['request-batches','split-p'].includes(id)?renderBatch:renderRuntime);}}
 if(!initialized){initialized=true;document.addEventListener('click',event=>{const stage=event.target instanceof Element?event.target.closest<HTMLElement>('[data-phase]'):null;const next=stage?.dataset.phase;if(next&&isPhase(next)){phase=next;renderRuntime();}});}
 renderRuntime();renderBatch();
}

