// Three self-contained request histories. Only prefill state is illustrated;
// decoding, physical eviction and unrelated requests are intentionally omitted.
globalThis.AKVInterfaceScene = (() => {
  const duration=34.2,playbackRate=1.8;
  const messages=[
    {role:'user',content:'Search ICLR'},
    {role:'assistant',content:'Searching'},
    {role:'tool',content:'ICLR is...'}
  ];
  // Allocate 4 / 6 / 9 wall-clock seconds to the three requests.
  // Keep operation motion at the same speed; shorten the empty holds.
  const requests=[
    {start:0,end:7.2,still:5,label:'Append m₀',body:{model:'gpt-oss-120b',messages:messages.slice(0,1),cache:{}}},
    {start:7.2,end:18,still:15.5,label:'Append m₁ → Drop m₀',body:{model:'gpt-oss-120b',messages:messages.slice(0,2),cache:{drop:{'1':[0]}}}},
    {start:18,end:duration,still:32,label:'Append m₂ → Drop m₁ → Repos',body:{model:'gpt-oss-120b',messages:[...messages],cache:{drop:{'1':[0],'2':[1]},reposition:[2]}}}
  ];
  const appendAt=[1.5,8.7,19.5],dropAt=[14,24.8,null],reposAt=28.6;
  // Each completed Append → Drop and Drop → Repos transition gets a
  // 2.7-clock-unit (1.5 wall-second) inspection hold.
  // Highlight only work being performed now, not carried operation history.
  // Drop keys are operate-after boundaries, not the IDs of dropped messages.
  const operations=[
    ...appendAt.map((start,id)=>({request:id,key:`append${id}`,start,end:start+2.6})),
    ...dropAt.flatMap((start,id)=>start===null?[]:[{request:id+1,key:`drop${id}`,start,end:start+1.1}]),
    {request:2,key:'repos',start:reposAt,end:reposAt+2}
  ];
  const slots=[36,162,288],labels=['m₀','m₁','m₂'];
  const palette=[['#fff0dc','#d7a65e'],['#e5eedc','#91ac72'],['#e3edfa','#81a4ce']];
  const accent='#8570b6',ink='#544b5e',muted='#928899';
  const smooth=(time,start,length)=>{const p=Math.max(0,Math.min(1,(time-start)/length));return p*p*(3-2*p);};
  const fixed=n=>Number(n.toFixed(3));
  const rect=(x,y,w,h,fill,stroke='none',extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" ${extra}/>`;
  const text=(x,y,value,size=13,color=ink,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${value}</text>`;
  const centered='text-anchor="middle"';
  function frame(time) {
    const t=Math.max(0,Math.min(duration,time));
    const request=requests.findLastIndex(item=>t>=item.start);
    const chapter=requests[request];
    // Hide the text swap between a 0.9 s fade-out and a 1.2 s fade-in.
    // Server KV stays visible through request boundaries.
    const requestOpacity=smooth(t,chapter.start,1.2)*(1-smooth(t,chapter.end-.9,.9));
    const caches=appendAt.flatMap((at,id)=>t<at+.2?[]:[{
      id,x:slots[id],computedAt:at,ready:t>=at+2.6,
      active:t>=at+2.6&&(dropAt[id]===null||t<dropAt[id]+1.1),
      reused:request>id,
      inherits:id===0?[]:id===1?[0]:[1],
      keyPositions:Array.from({length:4},(_,i)=>(id===2&&t>=reposAt+2?0:id*4)+i),
      repositioned:id===2&&t>=reposAt+2,
      valueState:['m0','m1(m0)','m2(m1(m0))'][id]
    }]);
    const attention=caches.flatMap(cache=>{
      const at=appendAt[cache.id];
      return cache.id>0&&t>=at+.6&&t<at+1.8?[{from:cache.id,to:cache.id-1}]:[];
    });
    const operation=operations.find(item=>item.request===request&&t>=item.start&&t<item.end)?.key??null;
    return {time:t,request,requestOpacity,operation,messages:chapter.body.messages.map((_,id)=>id),caches,attention};
  }
  function requestParts(index) {
    const body=requests[index].body;
    const parts=[];
    const add=(text,key=null)=>parts.push({text,key});
    add(`{\n  "model": "${body.model}",\n  "messages": [\n`);
    body.messages.forEach((message,id)=>{
      add('    ');
      add(`{"role":"${message.role}", "content":"${message.content}"}`,`append${id}`);
      add(`${id<body.messages.length-1?',':''}\n`);
    });
    add('  ],\n');
    if(!body.cache.drop) add('  "cache": {}\n');
    else {
      add('  "cache": {\n    "drop": {');
      Object.entries(body.cache.drop).forEach(([after,ids],entry)=>{
        if(entry) add(', ');
        add(`"${after}": [${ids.join(', ')}]`,`drop${ids[0]}`);
      });
      add(`}${body.cache.reposition?',':''}\n`);
      if(body.cache.reposition) {
        add('    ');
        add(`"reposition": [${body.cache.reposition.join(', ')}]`,'repos');
        add('\n');
      }
      add('  }\n');
    }
    add('}');
    return parts;
  }
  const requestText=index=>requestParts(index).map(part=>part.text).join('');
  function draw(time) {
    const state=frame(time),t=state.time,parts=[];
    parts.push(text(16,22,'Full message history',12,muted),text(402,22,`Request 0${state.request+1}`,11,accent,`text-anchor="end" opacity="${fixed(state.requestOpacity)}"`));
    labels.forEach((label,id)=>{
      const x=slots[id],present=state.messages.includes(id),[fill,edge]=palette[id];
      const arrival=present?smooth(t,requests[id].start+.3,1):0;
      if(arrival<1) parts.push(`<g opacity="${fixed(.32*(1-arrival))}">`,rect(x,43,96,32,'none','#bcb4c5','stroke-dasharray="4 4"'),text(x+48,65,'…',16,muted,centered),'</g>');
      if(present) parts.push(`<g data-interface-message="${id}" opacity="${fixed(arrival)}">`,rect(x,43,96,32,fill,edge),text(x+48,65,label,16,ink,`${centered} font-weight="600"`),text(x+48,93,messages[id].role,11,muted,centered),'</g>');
    });
    parts.push(text(16,124,'Active KV · this request',12,muted),text(16,252,'K positions',11,muted));
    state.caches.forEach(cache=>{
      const {id,x}=cache,at=appendAt[id],y=145;
      const appear=smooth(t,at+.2,.4),fill=smooth(t,at+1.8,.8),inherited=smooth(t,at+2,.6);
      const dropped=dropAt[id]===null?0:smooth(t,dropAt[id]+.2,.9),kept=1-dropped;
      const [color,edge]=palette[id];
      const reposition=id===2?smooth(t,reposAt,2):0;
      parts.push(`<g data-interface-kv="${id}" data-x="${x}" data-fill="${fixed(fill)}" opacity="${fixed(appear)}">`,rect(x,y,96,66,'#fff'));
      parts.push(`<g opacity="${fixed(kept)}">`,rect(x,y,96,66,color,'none',`opacity="${fixed(fill)}"`));
      if(fill<1) parts.push(rect(x,y,96,66,'none',accent,`stroke-dasharray="4 4" opacity="${fixed(1-fill)}"`));
      parts.push(rect(x,y,96,66,'none',edge,`opacity="${fixed(fill)}"`),text(x+48,y+26,labels[id],17,ink,`${centered} font-weight="600"`));
      if(id>0) {
        parts.push(`<g data-interface-inherited="${id}" opacity="${fixed(inherited)}">`);
        if(id===1) parts.push(rect(x+14,y+38,68,15,'#d7a65e'));
        if(id===2) parts.push(rect(x+14,y+34,68,24,'#91ac72'),rect(x+27,y+46,42,8,'#d7a65e'));
        parts.push('</g>');
      }
      parts.push('</g>');
      if(dropped>0) parts.push(`<g opacity="${fixed(dropped*.6)}">`,rect(x,y,96,66,'none','#bcb4c5','stroke-dasharray="4 4"'),text(x+48,y+38,'—',16,muted,centered),'</g>');
      parts.push('</g>');
      if(dropped>.5) parts.push(text(x+48,231,'Dropped',11,muted,centered));
      else if(reposition>0) parts.push(text(x+48,231,'V unchanged',11,accent,centered));
      else if(cache.reused&&cache.ready) parts.push(text(x+48,231,'Reused',11,accent,centered));
      if(fill>0&&kept>0) {
        parts.push(`<g data-interface-positions="${id}" opacity="${fixed(fill*kept)}">`);
        for(let i=0;i<4;i++) {
          const px=x+i*25;
          parts.push(rect(px,264,21,25,reposition>0?'#ece5f6':'#f3f0f7'));
          if(reposition<1) parts.push(text(px+10.5,281,id*4+i,11,muted,`${centered} opacity="${fixed(1-reposition)}"`));
          if(reposition>0) parts.push(text(px+10.5,281,i,11,accent,`${centered} opacity="${fixed(reposition)}" font-weight="600"`));
        }
        parts.push('</g>');
      }
    });
    state.attention.forEach(({from,to})=>{
      const at=appendAt[from],sx=slots[from]+48,tx=slots[to]+48;
      const opacity=smooth(t,at+.6,.25)*(1-smooth(t,at+1.5,.3));
      parts.push(`<g data-interface-attention="${from}-${to}" opacity="${fixed(opacity)}"><path d="M ${sx} 143 C ${sx} 107, ${tx} 107, ${tx} 143" fill="none" stroke="${accent}" stroke-width="1.7"/><circle cx="${sx}" cy="143" r="2" fill="${accent}"/><path d="M ${tx-3} 137 L ${tx} 144 L ${tx+3} 137" fill="none" stroke="${accent}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></g>`);
    });
    if(t>=reposAt) parts.push(text(210,321,'Same m₂ · re-encoded K positions',12,accent,`${centered} opacity="${fixed(smooth(t,reposAt,.5))}"`));
    return parts.join('');
  }
  return {duration,playbackRate,requests,frame,draw,requestText,requestParts};
})();

(() => {
  if(typeof document==='undefined') return;
  const disclosure=document.getElementById('stateless-interface');
  if(!disclosure) return;
  const renderer=globalThis.AKVInterfaceScene;
  const container=disclosure.querySelector('.akv-interface-animation');
  const drawing=disclosure.querySelector('[data-interface-scene]');
  const button=disclosure.querySelector('#interface-toggle');
  const stages=disclosure.querySelector('.akv-interface-stages');
  const code=disclosure.querySelector('#interface-request-code');
  const counter=disclosure.querySelector('#interface-request-count');
  const example=disclosure.querySelector('.akv-stateless-example');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=motion.matches,elapsed=paused?renderer.requests.at(-1).still:0,visible=false;
  let request=null,previous=null,painted=null,lastRequest=-1;
  let codeHighlights=[];
  const controls=renderer.requests.map((item,index)=>{
    const element=document.createElement('button');
    element.type='button';
    const number=document.createElement('span'),label=document.createElement('span');
    number.textContent=`Request 0${index+1}`;label.textContent=item.label;
    element.append(number,label);
    element.setAttribute('aria-label',`Request ${index+1}: ${item.label}`);
    element.setAttribute('aria-controls','interface-request-code interface-scene');
    element.addEventListener('click',()=>{
      // While paused, the request tabs are stable inspection views.
      paused=paused||motion.matches;
      elapsed=paused?item.still:item.start;
      updateButton();paint();schedule();
    });
    stages.append(element);return element;
  });
  function paint() {
    drawing.innerHTML=renderer.draw(elapsed);
    const state=renderer.frame(elapsed);
    if(state.request!==lastRequest) {
      lastRequest=state.request;
      codeHighlights=[];
      code.replaceChildren(...renderer.requestParts(state.request).map(part=>{
        if(!part.key) return document.createTextNode(part.text);
        const span=document.createElement('span');
        span.dataset.interfaceCode=part.key;
        span.textContent=part.text;
        codeHighlights.push(span);
        return span;
      }));
      counter.textContent=`Request ${state.request+1} / 3`;
    }
    codeHighlights.forEach(span=>span.classList.toggle('is-current',span.dataset.interfaceCode===state.operation));
    // Follow the playback clock so pausing, closing and leaving the viewport
    // also freeze the transition. Paused inspection keeps the text readable.
    code.style.opacity=counter.style.opacity=String(paused?1:state.requestOpacity);
    controls.forEach((control,index)=>{
      const item=renderer.requests[index];
      if(index===state.request) control.setAttribute('aria-current','step');
      else control.removeAttribute('aria-current');
      control.style.setProperty('--interface-progress',String(Math.max(0,Math.min(1,(elapsed-item.start)/(item.end-item.start)))));
    });
    // A fade marks a new illustrative sequence, not a server rollback.
    example.style.opacity=String(paused?1:elapsed>renderer.duration-.8?(renderer.duration-elapsed)/.8:Math.min(1,elapsed/.6+.4));
    disclosure.dataset.interfaceRequest=String(state.request+1);
    disclosure.dataset.interfacePaused=String(paused);
    disclosure.dataset.interfaceOperation=state.operation??'';
  }
  function updateButton() {
    button.textContent=paused?'Play':'Pause';
    button.setAttribute('aria-pressed',String(paused));
    button.setAttribute('aria-label',`${paused?'Play':'Pause'} request sequence`);
  }
  function tick(now) {
    request=null;
    if(previous!==null) elapsed=(elapsed+(now-previous)/1000*renderer.playbackRate)%renderer.duration;
    previous=now;
    if(painted===null||now-painted>=1000/30) {paint();painted=now;}
    request=requestAnimationFrame(tick);
  }
  function schedule() {
    if(request!==null) cancelAnimationFrame(request);
    request=null;previous=null;painted=null;
    if(disclosure.open&&visible&&!paused&&!document.hidden) request=requestAnimationFrame(tick);
  }
  button.addEventListener('click',()=>{paused=!paused;updateButton();paint();schedule();});
  disclosure.querySelector('#interface-replay').addEventListener('click',()=>{elapsed=motion.matches?renderer.requests[0].still:0;paused=motion.matches;updateButton();paint();schedule();});
  disclosure.addEventListener('toggle',schedule);
  document.addEventListener('visibilitychange',schedule);
  motion.addEventListener('change',()=>{paused=motion.matches;elapsed=paused?renderer.requests.at(-1).still:0;updateButton();paint();schedule();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.2}).observe(container);
  disclosure.querySelector('[data-interface-fallback]').hidden=true;
  disclosure.querySelector('.akv-interface-controls').hidden=false;
  container.hidden=false;stages.hidden=false;
  updateButton();paint();schedule();
})();
