import {algorithms,implementations,selection,comparison,axisMaximum,scheduleFrame} from './model.js';
import {initRoads} from './hero.js';
import {createPlayback} from './playback.js';
import {initGranularity,initHandoff} from './demos.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=value=>Number.isFinite(value)?value.toFixed(2):'N/A';
const colors=['#b5b5be','#657e97','#0071e3'];
const classes=['tr-official','tr-standard','tr-small'];
function controls(attribute,callback) {
  const buttons=[...document.querySelectorAll(`[data-${attribute}]`)];
  buttons.forEach(button=>button.addEventListener('click',()=>{
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    callback(button.dataset[attribute]);
  }));
}

initGranularity();
initHandoff();
const api={
 route:{signature:'route(batch, result)',title:'Choose the next model.',description:'After each forward pass, return one model name per request. Returning the current model name continues local decoding. Existing two-model schedulers also accept Boolean decisions.',note:'R-Stitch example: True delegates to the only peer; False keeps decoding locally.',code:`def route(self, batch, result):
    probs = result.logits_output.next_token_logits.softmax(dim=-1)
    entropy = -(probs * probs.log()).sum(-1) / math.log(probs.shape[-1])
    return (entropy > self.threshold).cpu()`},
 send:{signature:'send(req, destination)',title:'Address the handoff.',description:'Build a PeerReq for the destination scheduler with the request state and token IDs. The default send includes the prompt and all generated tokens.',note:'R-Stitch rolls back the just-sampled token so the peer can regenerate it. KV-cache tensors stay local.',code:`def send(self, req, destination=None):
    destination = destination or self.peer_name
    req.model_tokens[self.server_args.server_name][1] -= 1
    current_token_ids = req.origin_input_ids + req.output_ids[:-1]
    return PeerReq.construct_from_req(
        req=req,
        source=self.server_args.server_name,
        destination=destination,
        current_token_ids=current_token_ids,
        entry_model=self.server_args.entry_model_name,
        handoff_seq=req.handoff_seq,
    )`},
 receive:{signature:'receive(msgs)',title:'Resume the request.',description:'Process a list of PeerReq messages from peer schedulers. The default implementation accepts all tokens sent by the peer and resumes the local request.',note:'Override receive only when the policy needs custom preprocessing before applying peer tokens.',code:`# R-Stitch inherits receive(msgs) from
# BaseTokenRoutingScheduler.
#
# The default implementation processes PeerReq messages
# and accepts all tokens sent by the peer.
# No receive override is needed for R-Stitch.`}
};
function renderAPI(key) {
 const item=api[key];
 for(const prop of ['signature','title','description','note']) $('api-'+prop).textContent=item[prop];
 $('api-code').innerHTML=item.code.split('\n').map(line=>line.trimStart().startsWith('#')?`<span class="tr-code-comment">${esc(line)}</span>`:esc(line).replace(/\b(def|return|self)\b/g,'<span class="tr-code-keyword">$1</span>')).join('\n');
}
controls('api',renderAPI);renderAPI('route');
try { initRoads(); } catch { $('road-motion').hidden=true; }

const state={workload:'high-effort reasoning',concurrency:4,metric:'throughput',schedule:'delayed',batch:4,tradeoff:8};
let data;
const svgText=(x,y,text,extra='')=>`<text x="${x}" y="${y}" fill="#6e6e73" font-size="12" ${extra}>${esc(text)}</text>`;
function renderResults() {
 const selected=selection(data.results,state.workload,state.concurrency);
 const max=axisMaximum(Math.max(...selected.map(row=>row[state.metric]||0)));
 const metric=state.metric;
 const title=state.workload[0].toUpperCase()+state.workload.slice(1)+` · concurrency ${state.concurrency}`;
 $('results-title').textContent=state.workload[0].toUpperCase()+state.workload.slice(1);
 $('results-units').textContent=`Concurrency ${state.concurrency} · `+(metric==='throughput'?'output tokens/s · higher is better':'completion time (s) · lower is better');
 let html=`<div class="tr-benchmark-axis" aria-hidden="true">${[0,.25,.5,.75,1].map(t=>`<span>${Number((max*t).toFixed(2))}</span>`).join('')}</div>`;
 let table=`<caption>${esc(title)} · ${metric==='throughput'?'output tokens/s':'seconds'}</caption><thead><tr><th>Algorithm</th>${implementations.map(s=>`<th>${s}</th>`).join('')}<th>${metric==='throughput'?'Throughput gain':'Latency reduction'}</th></tr></thead><tbody>`;
 for(const algorithm of algorithms) {
   const rows=selected.filter(row=>row.algorithm===algorithm),ratio=comparison(rows,metric);
   const values=implementations.map(system=>rows.find(row=>row.implementation===system)?.[metric]);
   html+=`<div class="tr-benchmark"><div class="tr-benchmark-title"><h4>${algorithm}</h4><strong>${ratio===null?'N/A':format(ratio)+'×'}</strong><small>${metric==='throughput'?'throughput gain':'lower latency'}</small></div><div class="tr-bar-rows">${values.map((value,i)=>`<div class="tr-bar-row" aria-label="${algorithm}, ${implementations[i]}: ${format(value)} ${metric==='throughput'?'tokens per second':'seconds'}"><div class="tr-bar-track"><span class="tr-bar-fill ${classes[i]}" style="width:${Number.isFinite(value)?value/max*100:0}%"></span></div><span class="tr-bar-value">${format(value)}</span></div>`).join('')}</div></div>`;
   table+=`<tr><th>${algorithm}</th>${values.map((value,i)=>`<td${i===2?' class="tr-best"':''}>${format(value)}</td>`).join('')}<td>${ratio===null?'N/A':format(ratio)+'×'}</td></tr>`;
 }
 $('benchmark-bars').innerHTML=html;
 $('results-table').innerHTML=table+'</tbody>';
 $('results-caption').textContent=`Ratios compare TokenRouter with the ${metric==='throughput'?'highest-throughput':'lowest-latency'} available baseline for each algorithm. All bars share a linear scale starting at zero. N/A indicates an unavailable measurement.`;
}
const scheduleCopy={
 step:'Every token step waits for a global barrier. Fast-model work stalls behind slower-model work.',
 model:'The system alternates models. Only one model executes at a time, even when independent work is ready.',
 eager:'Each subserver starts as soon as work arrives. A later peer request can miss the current batch and wait for the next one.',
 delayed:'The large model briefly waits for two requests. Routed tokens arrive together, reducing repeated batch-admission stalls.'
};
let schedulePlayback, scheduleGeometry, scheduleTimeKey='';
function drawSchedule(progress) {
 if(!scheduleGeometry)return;
 const schedule=data.schedules[state.schedule],time=progress*Math.max(...schedule.completion);
 const {x,tasks,cursor}=scheduleGeometry;
 cursor.setAttribute('transform',`translate(${x(time)},0)`);
 tasks.forEach(({start,end,fill,base,text})=>{
   const elapsed=Math.max(0,Math.min(time,end)-start);
   fill.setAttribute('width',Math.max(0,x(start+elapsed)-x(start)-2));
   const active=time>=start&&time<end,done=time>=end;
   base.setAttribute('stroke',active?'#1d1d1f':'none');
   text.setAttribute('fill',done?'white':'#42424a');
 });
 const key=`${state.schedule}-${Math.floor(time*10)}`;
 if(key===scheduleTimeKey)return;scheduleTimeKey=key;
 const frame=scheduleFrame(schedule,time);
 $('schedule-now').textContent=`t = ${time.toFixed(1)}`;
 $('schedule-progress').setAttribute('aria-valuetext',`${time.toFixed(1)} time units; ${frame.finished} of 3 requests complete`);
 $('schedule-finished').textContent=`${frame.finished} of 3 requests`;
 for(const [model,id] of [['SLM','schedule-small'],['LLM','schedule-large']]) {
   const active=frame.active.filter(t=>t.model===model),waiting=frame.waiting.filter(t=>t.model===model);
   const names=tasks=>[...new Set(tasks.map(t=>`R${t.req+1}`))].join(' + ');
   const lines=[];
   if(active.length)lines.push(`Decoding ${names(active)}`);
   if(waiting.length)lines.push(`Waiting ${names(waiting)}`);
   if(!lines.length)lines.push('Idle');
   $(id).textContent=lines.join(' · ');
   $(id).parentElement.classList.toggle('is-busy',active.length>0);
 }
}
function renderSchedule() {
 const schedule=data.schedules[state.schedule],svg=$('schedule-chart');
 const width=Math.max(250,Math.round(svg.clientWidth)),compact=width<500,left=compact?28:76,right=12,top=32,rowHeight=46,axisY=184;
 const max=Math.max(...Object.values(data.schedules).flatMap(s=>s.completion));
 const x=t=>left+t/max*(width-left-right),tasks=[];
 let out='<title id="schedule-title">'+esc(state.schedule)+' scheduling timeline</title><desc id="schedule-desc">Three requests with five tokens each. Solid color shows executed work; the moving line marks current time. Time is normalized to one small-model decoding step.</desc>';
 for(let t=0;t<=max;t+=compact?3:2) out+=`<path d="M${x(t)} ${top-12}V${axisY}" stroke="#e7e7eb"/>`+svgText(x(t),axisY+20,t,'text-anchor="middle"');
 schedule.barriers.forEach(t=>{if(t>0&&t<max)out+=`<path d="M${x(t)} ${top-16}V${axisY}" stroke="#c6c6cf" stroke-dasharray="3 4"/>`;});
 for(let row=0;row<3;row++) {
   out+=svgText(0,top+row*rowHeight+20,compact?`R${row+1}`:`Request ${row+1}`);
   const rowTasks=schedule.history.flatMap(h=>h.tasks.filter(task=>task.req===row).map(task=>({...h,task}))).sort((a,b)=>a.task.tok-b.task.tok);
   let previous=0;
   for(const h of rowTasks) {
     const y=top+row*rowHeight,color=h.model==='SLM'?'#0071e3':'#8d8d99',id=tasks.length;
     if(h.start>previous)out+=`<path d="M${x(previous)} ${y+15}H${x(h.start)}" stroke="#d2d2d7" stroke-width="2" stroke-dasharray="3 4"/>`;
     out+=`<g><title>Request ${row+1}, token ${h.task.tok+1}, ${h.model}: ${h.start}–${h.end} time units</title><rect id="schedule-base-${id}" x="${x(h.start)+1}" y="${y}" width="${Math.max(1,x(h.end)-x(h.start)-2)}" height="30" rx="4" fill="${color}" fill-opacity=".12" stroke-width="1"/><rect id="schedule-fill-${id}" x="${x(h.start)+1}" y="${y}" width="0" height="30" rx="4" fill="${color}"/><text id="schedule-token-${id}" x="${(x(h.start)+x(h.end))/2}" y="${y+20}" text-anchor="middle" font-size="${compact?9:11}" fill="#42424a">${h.task.tok+1}</text></g>`;
     tasks.push({start:h.start,end:h.end,id});previous=h.end;
   }
 }
 out+=`<g id="schedule-cursor" aria-hidden="true"><path d="M0 15V${axisY}" stroke="#1d1d1f" stroke-width="1" opacity=".5"/><path d="M-4 9H4L0 15Z" fill="#1d1d1f"/></g>`;
 out+=svgText((left+width-right)/2,axisY+43,'Time · small-model step = 1 unit','text-anchor="middle"');
 svg.setAttribute('viewBox',`0 0 ${width} 232`);svg.innerHTML=out;
 scheduleGeometry={x,cursor:$('schedule-cursor'),tasks:tasks.map(t=>({...t,fill:$(`schedule-fill-${t.id}`),base:$(`schedule-base-${t.id}`),text:$(`schedule-token-${t.id}`)}))};
 $('schedule-time').textContent=(schedule.completion.reduce((a,b)=>a+b)/3).toFixed(2)+' units';
 $('schedule-copy').textContent=scheduleCopy[state.schedule];
 scheduleTimeKey='';
 schedulePlayback?.setDuration(Math.max(...schedule.completion)*1000);
 drawSchedule(schedulePlayback?.progress||0);
}
function renderBatch() {
 const values=data.batching[state.batch],best=Math.max(...values);
 $('batch-bars').innerHTML=values.map((value,i)=>`<div class="tr-batch-column ${value===best?'is-best':''}" aria-label="Threshold ${i+1}: ${format(value)} tokens per second${value===best?', best measured threshold':''}"><strong>${format(value)}</strong><div class="tr-column" style="height:${value/220*146}px"></div><span>B = ${i+1}</span></div>`).join('');
}
function renderTradeoff() {
 const svg=$('tradeoff-chart'),width=Math.max(280,Math.round(svg.clientWidth)),height=width<500?310:360;
 const left=width<500?44:56,right=16,top=30,bottom=52;
 const x=value=>left+value/80*(width-left-right),y=value=>height-bottom-value/700*(height-top-bottom);
 let html='<title id="tradeoff-title">Throughput versus per-user token generation speed</title><desc id="tradeoff-desc">All sixteen measured concurrency levels. The larger circles mark concurrency '+state.tradeoff+'.</desc>';
 for(let t=0;t<=600;t+=200)html+=`<path d="M${left} ${y(t)}H${width-right}" stroke="#e7e7eb"/>`+svgText(left-9,y(t)+4,t,'text-anchor="end"');
 for(let t=0;t<=80;t+=20)html+=svgText(x(t),height-bottom+22,t,'text-anchor="middle"');
 html+=svgText(left,14,'Total throughput · tokens/s')+svgText((left+width-right)/2,height-5,'Per-user speed · tokens/s','text-anchor="middle"');
 for(const [system,color] of [['R2R official','#9b9ba7'],['TokenRouter','#0071e3']]) {
   const points=data.tradeoff.filter(row=>row.implementation===system).sort((a,b)=>a.concurrency-b.concurrency);
   html+=`<path d="${points.map((p,i)=>`${i?'L':'M'}${x(p.speed)},${y(p.throughput)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2" ${system==='R2R official'?'stroke-dasharray="4 4"':''}/>`;
   for(const p of points) {
     const active=p.concurrency===state.tradeoff;
     if(active)html+=`<circle cx="${x(p.speed)}" cy="${y(p.throughput)}" r="11" fill="${color}" opacity=".12"/>`;
     html+=`<circle cx="${x(p.speed)}" cy="${y(p.throughput)}" r="${active?5:2.5}" fill="${color}" ${active?'stroke="white" stroke-width="1.5"':''}><title>${system}, concurrency ${p.concurrency}: ${p.speed} tokens/s per user, ${p.throughput} tokens/s total</title></circle>`;
   }
 }
 svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.innerHTML=html;
 $('tradeoff-n').textContent=state.tradeoff;
 $('tradeoff-values').innerHTML=['TokenRouter','R2R official'].map(system=>{
   const p=data.tradeoff.find(row=>row.implementation===system&&row.concurrency===state.tradeoff);
   return `<div><h4>${system}</h4><strong>${format(p.throughput)}</strong><small>tokens/s total</small><p>${format(p.speed)} tokens/s per user</p></div>`;
 }).join('');
}
function renderAblation() {
 $('ablation-bars').innerHTML=data.ablation.map(([label,value],i)=>`<div class="tr-ablation-row"><span>${label}</span><div class="tr-bar-track"><span class="tr-bar-fill" style="width:${value/400*100}%;background:${['#b5b5be','#7899be','#478bd3','#0071e3'][i]}"></span></div><strong>${format(value)}</strong></div>`).join('');
}
async function initData() {
 const response=await fetch(new URL('../data/measurements.json',import.meta.url));
 if(!response.ok)throw new Error('Measurement file unavailable');
 data=await response.json();
 renderResults();renderSchedule();renderBatch();renderTradeoff();renderAblation();
 controls('concurrency',v=>{state.concurrency=Number(v);renderResults();});
 controls('metric',v=>{state.metric=v;renderResults();});
 schedulePlayback=createPlayback($('scheduling-demo'),{duration:Math.max(...data.schedules[state.schedule].completion)*1000,render:drawSchedule,label:'scheduling illustration',range:$('schedule-progress')});
 controls('schedule',v=>{state.schedule=v;renderSchedule();schedulePlayback.restart();});
 controls('batch',v=>{state.batch=Number(v);renderBatch();});
 $('result-workload').addEventListener('change',e=>{state.workload=e.target.value;renderResults();});
 $('tradeoff-concurrency').addEventListener('input',e=>{state.tradeoff=Number(e.target.value);renderTradeoff();});
 let scheduleWidth=0;
 new ResizeObserver(entries=>{const width=Math.round(entries[0].contentRect.width);if(width!==scheduleWidth){scheduleWidth=width;renderSchedule();}}).observe($('schedule-chart'));
 let previousWidth=0;
 new ResizeObserver(entries=>{const width=Math.round(entries[0].contentRect.width);if(width!==previousWidth){previousWidth=width;renderTradeoff();}}).observe($('tradeoff-chart'));
}
initData().catch(error=>{ console.error(error);$('data-status').textContent='The interactive measurements could not load. Please refresh the page to try again.'; });
