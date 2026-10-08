// Interpret the illustrative request from the paper. This is a logical history,
// not a scheduler trace: AKV may reuse KV or restore it in one prefill pass.
globalThis.AKVInterfaceScene = (() => {
  const duration=18.8;
  const steps=[
    { key:'append0',at:0,label:'Append m₀',description:'Append message 0' },
    { key:'append1',at:2.4,label:'Append m₁',description:'Append message 1' },
    { key:'drop0',at:5.4,label:'Drop m₀',description:'After message 1, drop message 0’s KV' },
    { key:'append2',at:7.6,label:'Append m₂',description:'Append message 2' },
    { key:'drop1',at:10.6,label:'Drop m₁',description:'After message 2, drop message 1’s KV' },
    { key:'repos',at:12.8,label:'Reposition',description:'After message 2, reposition the retained keys' }
  ];
  const appendAt=[0,2.4,7.6], dropAt=[5.4,10.6,null];
  const palette=[['#fff0dc','#d7a65e'],['#e5eedc','#91ac72'],['#e3edfa','#81a4ce']];
  const labels=['m₀','m₁','m₂'], roles=['user','assistant','tool'];
  const slots=[47,170,293], accent='#8570b6';
  const smooth=(time,start,length)=>{const p=Math.max(0,Math.min(1,(time-start)/length));return p*p*(3-2*p);};
  const fixed=n=>Number(n.toFixed(3));
  const rect=(x,y,w,h,fill,stroke='none',extra='')=>`<rect x="${fixed(x)}" y="${y}" width="${w}" height="${h}" rx="7" fill="${fill}" stroke="${stroke}" ${extra}/>`;
  const text=(x,y,value,size=13,color='#5a5261',extra='')=>`<text x="${fixed(x)}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${value}</text>`;
  function frame(time) {
    const t=Math.max(0,Math.min(duration,time));
    return {time:t,step:steps.findLastIndex(step=>t>=step.at),messages:[0,1,2],
      caches:appendAt.filter(at=>t>=at+.15).map((at,id)=>({
        id,ready:t>=at+1.85,active:t>=at+1.85&&(dropAt[id]===null||t<dropAt[id]+1.1),
        inherits:id===0?[]:id===1?[0]:[1],
        repositioned:id===2&&t>=14.6
      }))};
  }
  function draw(time) {
    const {step}=frame(time), current=steps[step], parts=[];
    const moved=smooth(time,13.2,1.4);
    parts.push(text(16,26,'Messages · full history',12,'#928899'));
    labels.forEach((label,id)=>{
      const x=slots[id], [fill,edge]=palette[id];
      parts.push(rect(x-7,43,94,33,fill,edge),text(x+40,65,label,16,'#4a4352','text-anchor="middle" font-weight="600"'),text(x+40,94,roles[id],11,'#a096a7','text-anchor="middle"'));
    });
    parts.push(text(16,133,'Active KV',12,'#928899'));
    appendAt.forEach((at,id)=>{
      const appear=smooth(time,at+.15,.3);
      if(!appear) return;
      const dropped=dropAt[id]===null?0:smooth(time,dropAt[id]+.4,.7);
      const fill=smooth(time,at+1.15,.7), inherited=smooth(time,at+1.35,.5);
      const x=slots[id]-(id===2?246*moved:0), y=158;
      const [color,edge]=palette[id];
      const obsolete=id<2?1-smooth(time,13.0,.5):1;
      parts.push(`<g data-interface-kv="${id}" data-fill="${fixed(fill)}" opacity="${fixed(appear*obsolete)}">`);
      parts.push(rect(x,y,80,62,'#fff'));
      parts.push(`<g opacity="${fixed(1-dropped)}">`,rect(x,y,80,62,color,'none',`opacity="${fixed(fill)}"`));
      if(fill<1) parts.push(rect(x,y,80,62,'none',accent,`stroke-dasharray="4 4" opacity="${fixed(1-fill)}"`));
      parts.push(rect(x,y,80,62,'none',edge,`opacity="${fixed(fill)}"`),text(x+40,y+25,labels[id],16,'#544b5e','font-weight="600" text-anchor="middle"'));
      if(id>0&&inherited>0) {
        parts.push(`<g data-interface-inherited="${id}" opacity="${fixed(inherited)}">`);
        if(id===1) parts.push(rect(x+11,y+36,58,15,'#e4ad55'));
        if(id===2) parts.push(rect(x+11,y+32,58,22,'#91ac72'),rect(x+21,y+42,38,8,'#e4ad55'));
        parts.push('</g>');
      }
      parts.push('</g>');
      if(dropped>0) parts.push(`<g opacity="${fixed(dropped*.65)}">`,rect(x,y,80,62,'none','#bcb4c5','stroke-dasharray="3 4"'),text(x+40,y+36,'—',14,'#aaa0b3','text-anchor="middle"'),'</g>');
      parts.push('</g>');
      if(id>0&&time>=at+.45&&time<at+1.15) {
        // The empty destination is a proxy for the message being computed.
        const from=x+40,to=slots[id-1]+40;
        const opacity=smooth(time,at+.45,.15)*(1-smooth(time,at+1,.15));
        parts.push(`<g data-interface-attention="${id}-${id-1}" opacity="${fixed(opacity)}"><path d="M ${from} 156 C ${from} 115, ${to} 115, ${to} 156" fill="none" stroke="${accent}" stroke-width="1.8"/><path d="M ${to-3} 151 L ${to} 157 L ${to+3} 151" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>`);
      }
    });
    if(current.key==='repos') {
      parts.push(text(333-246*moved,246,'K repositioned',12,accent,`text-anchor="middle" opacity="${fixed(moved)}"`));
    }
    return parts.join('');
  }
  return {duration,steps,frame,draw};
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
  const code=[...disclosure.querySelectorAll('[data-interface-code]')];
  const controls=renderer.steps.map((step,index)=>{
    const element=document.createElement('button');
    element.type='button'; element.textContent=step.label;
    element.setAttribute('aria-label',step.description);
    element.setAttribute('aria-controls','interface-scene');
    element.addEventListener('click',()=>{
      elapsed=renderer.steps[index].at+(motion.matches?1.9:0);
      paused=motion.matches;
      updateButton(); paint(); schedule();
    });
    stages.append(element); return element;
  });
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=motion.matches,elapsed=paused?15:0,visible=false;
  let request=null,previous=null,painted=null,lastStep=-1;
  function paint() {
    drawing.innerHTML=renderer.draw(elapsed);
    const {step}=renderer.frame(elapsed);
    if(step!==lastStep) {
      lastStep=step;
      controls.forEach((control,index)=>{
        if(index===step) control.setAttribute('aria-current','step');
        else control.removeAttribute('aria-current');
      });
      code.forEach(line=>line.classList.toggle('is-current',line.dataset.interfaceCode===renderer.steps[step].key));
    }
    disclosure.dataset.interfaceStep=renderer.steps[step].key;
    disclosure.dataset.interfacePaused=String(paused);
  }
  function updateButton() {
    button.textContent=paused?'Play':'Pause';
    button.setAttribute('aria-pressed',String(paused));
    button.setAttribute('aria-label',`${paused?'Play':'Pause'} request example`);
  }
  function tick(now) {
    request=null;
    if(previous!==null) elapsed=(elapsed+(now-previous)/1000)%renderer.duration;
    previous=now;
    if(painted===null||now-painted>=1000/30) {paint();painted=now;}
    request=requestAnimationFrame(tick);
  }
  function schedule() {
    if(request!==null) cancelAnimationFrame(request);
    request=null; previous=null; painted=null;
    if(disclosure.open&&visible&&!paused&&!document.hidden) request=requestAnimationFrame(tick);
  }
  button.addEventListener('click',()=>{paused=!paused;updateButton();paint();schedule();});
  disclosure.querySelector('#interface-replay').addEventListener('click',()=>{elapsed=0;paused=false;updateButton();paint();schedule();});
  disclosure.addEventListener('toggle',schedule);
  document.addEventListener('visibilitychange',schedule);
  motion.addEventListener('change',()=>{paused=motion.matches;elapsed=paused?15:0;updateButton();paint();schedule();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.2}).observe(container);
  disclosure.querySelector('[data-interface-fallback]').hidden=true;
  disclosure.querySelector('.akv-interface-controls').hidden=false;
  container.hidden=false;
  updateButton();paint();schedule();
})();
