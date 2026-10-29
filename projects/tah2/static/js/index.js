'use strict';
const {t: translate} = globalThis.SiteI18n;
const DATA = window.TAH2_DATA;
const $ = id => document.getElementById(id);
const colors = {tah:'#2166c4',standard:'#777777',fixed:'#1f8a37',ouro:'#8244a8',huginn:'#c8880c'};
const fmt = (n,d=2)=>Number(n).toFixed(d);
function pressed(attr,value){document.querySelectorAll(`[${attr}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute(attr)===String(value))));}
function renderInsight(model){const v=model==='ouro'?[26,52.3,21.7]:[50.6,33.5,15.9];const labels=['Improved','Little change','Worse'].map(label => translate(label));const cs=['#30d158','#d2d2d7','#ff9f0a'];$('gain-stack').innerHTML=v.map((n,i)=>`<div style="width:${n}%;background:${cs[i]}"></div>`).join('');$('gain-stack').setAttribute('aria-label',`${model==='ouro'?'Ouro':'Huginn'}: ${v.map((n,i)=>labels[i]+' '+n+'%').join(', ')}`);$('gain-labels').innerHTML=v.map((n,i)=>`<div><strong style="color:${i===1?'#86868b':cs[i]}">${n.toFixed(1)}%</strong><span>${labels[i]}</span></div>`).join('');$('insight-depth').textContent=model==='ouro'?translate('Iterations 1 → 2'):translate('Iterations 1 → 3');pressed('data-insight',model);}
function renderDomains(size){const data=DATA.crossDomain[size];const picks=[['MATH','AIME26'],['CODE','LiveCodeBench'],['KNOWLEDGE','SuperGPQA'],['TOOL USE','BFCL v3']];$('domain-cards').innerHTML=picks.map(([category,name])=>{const [a,b]=data[name];return `<article class="domain-card"><span class="domain-category">${translate(category)}</span><h3>${name}</h3><div class="domain-gain">+${fmt(b-a,1)}<span>${translate("pp")}</span></div><div class="domain-values"><span>${fmt(a,1)}%</span><span aria-hidden="true">→</span><strong>${fmt(b,1)}%</strong></div><div class="domain-bar-track" aria-hidden="true"><span style="width:${b}%"></span><i style="left:${a}%"></i></div></article>`}).join('');$('scale-average').innerHTML=translate('<strong>+{gain} pp</strong> average across nine benchmarks', {gain: size==='4B'?'3.2':'2.4'});pressed('data-size',size);}
document.querySelectorAll('[data-insight]').forEach(b=>b.addEventListener('click',()=>renderInsight(b.dataset.insight)));
document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>renderDomains(b.dataset.size)));
renderInsight('ouro');renderDomains('4B');

// ---------- Shared figure helpers ----------
const clamp=v=>Math.max(0,Math.min(1,v)),lerp=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const svgTx=(x,y,t,attrs='')=>`<text x="${x}" y="${y}" ${attrs.includes('font-size')?'':'font-size="12"'} ${attrs.includes('fill=')?'':'fill="#86868b"'} ${attrs}>${translate(String(t))}</text>`;
const svgPath=(p,xf,yf)=>p.map((v,i)=>`${i?'L':'M'}${xf(v.x).toFixed(2)},${yf(v.y).toFixed(2)}`).join(' ');
// Plot-area ratios measured from the axes in the source vector PDFs.
const PAPER_PLOT_RATIO={scaling:196.8345/125.477122,loss:365.383178/237.016216,single:389.49/274.38};
function paperPlot(ratio){const left=52,right=440,bottom=300,width=right-left,height=width/ratio;return {left,right,bottom,width,height,top:bottom-height};}
// Marker shapes follow the paper: square TaH2, diamond Ouro, triangle Huginn, circle otherwise.
function marker(family,color,x,y,opacity=1,tip='',r=3.5){
 const attrs=`fill="${color}" stroke="#ffffff" stroke-width="1" opacity="${opacity}"`,title=`<title>${tip}</title>`;
 if(family==='tah')return `<rect x="${x-r}" y="${y-r}" width="${2*r}" height="${2*r}" ${attrs}>${title}</rect>`;
 if(family==='ouro')return `<path d="M${x},${y-r-1} L${x+r},${y} L${x},${y+r+1} L${x-r},${y} Z" ${attrs}>${title}</path>`;
 if(family==='huginn')return `<path d="M${x-r-1},${y-r} L${x+r+1},${y-r} L${x},${y+r+1} Z" ${attrs}>${title}</path>`;
 return `<circle cx="${x}" cy="${y}" r="${r}" ${attrs}>${title}</circle>`;
}
// A single clock can drive several figures, including when they stack on mobile.
function looper({end,hold,draw,button,buttons=button?[button]:[],clickTargets=[],root,roots=root?[root]:[]}){
 let elapsed=0,last=null,raf=0,paused=false;const visible=new Set(),loop=end+hold;
 function render(){draw(reducedMotion.matches?end:Math.min(elapsed,end));}
 function tick(now){raf=0;if(paused||!visible.size||document.hidden||reducedMotion.matches){last=null;return;}if(last!==null)elapsed=(elapsed+Math.min(now-last,100))%loop;last=now;render();raf=requestAnimationFrame(tick);}
 function run(){if(!raf&&!paused&&visible.size&&!document.hidden&&!reducedMotion.matches){last=null;raf=requestAnimationFrame(tick);}}
 function stop(){cancelAnimationFrame(raf);raf=0;last=null;}
 function updateControls(){buttons.forEach(b=>{b.disabled=reducedMotion.matches;b.textContent=translate(reducedMotion.matches?'Static':paused?'Resume':'Pause');b.setAttribute('aria-pressed',String(paused));b.setAttribute('aria-label',translate(roots.length>1?(paused?'Resume both chart animations':'Pause both chart animations'):(paused?'Resume animation':'Pause animation')));});roots.forEach(r=>r.dataset.paused=String(paused));}
 function setPaused(p){paused=p;updateControls();if(p)stop();else run();}
 buttons.forEach(b=>b.addEventListener('click',()=>setPaused(!paused)));
 clickTargets.forEach(el=>el.addEventListener('click',e=>{if(!e.target.closest('a,button'))setPaused(!paused);}));
 const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)visible.add(e.target);else visible.delete(e.target);});if(visible.size)run();else stop();},{threshold:.12});
 roots.forEach(r=>{r.style.setProperty('--paused-label',JSON.stringify(translate(' · paused')));observer.observe(r);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else run();});
 reducedMotion.addEventListener('change',()=>{stop();updateControls();render();run();});
 updateControls();render();
}
const evidenceAnimation={end:7600,hold:3000,draws:[]};
function registerEvidenceAnimation(draw){
 evidenceAnimation.draws.push(draw);
 if(evidenceAnimation.draws.length===2)looper({
  end:evidenceAnimation.end,hold:evidenceAnimation.hold,
  draw:ms=>evidenceAnimation.draws.forEach(render=>render(ms)),
  buttons:[$('evidence-pause')],
  clickTargets:[$('scaling-grid'),$('loss-grid')],
  roots:[$('scaling-figure'),$('loss-figure')]
 });
}

// ---------- Hero: two-stage Figure 1 animation, looping ----------
(function initTeaser(){
 const models=[
  {id:'standard',label:'Standard',key:'Standard',color:colors.standard},
  {id:'ouro',label:'Ouro',key:'Ouro (M=2)',color:colors.ouro,depths:[[2,'Ouro (M=2)'],[4,'Ouro (M=4)']]},
  {id:'huginn',label:'Huginn',key:'Huginn (M=3)',color:colors.huginn,depths:[[3,'Huginn (M=3)'],[7,'Huginn (M=7)']]},
  {id:'fixed',label:'TaH2 fixed',key:'TaH2 (fixed-depth, M=2)',color:colors.fixed,depths:[[2,'TaH2 (fixed-depth, M=2)'],[4,'TaH2 (fixed-depth, M=4)']]},
  {id:'tah',label:'TaH2 adaptive',key:'TaH2 (adaptive, M=2)',color:colors.tah,depths:[[2,'TaH2 (adaptive, M=2)'],[4,'TaH2 (adaptive, M=4)'],[8,'TaH2 (adaptive, M=8)']]}
 ];
 const plots=[$('teaser-compute'),$('teaser-depth')];
 plots.forEach(svg=>{svg.dataset.plotWidth=466;svg.dataset.plotHeight=466/PAPER_PLOT_RATIO.single;});
 // Stage 1: reveal + fit→measured morph. Stage 2: two segments, 16K→24K and 24K→32K. Then hold and loop.
 const START_TAH=2300,END_REVEAL=4700,MORPH=5700,EXTEND=6700,SEG=2100,END=EXTEND+2*SEG,HOLD=2800;
 const SEGMENTS=[[16,24],[24,32]];
 const plotHeight=466/PAPER_PLOT_RATIO.single;
 const y=v=>339-(v-4.8)/12.7*plotHeight,dy=v=>339-(v-9.5)/8*plotHeight,dx=v=>66+(v-1)/3.35*446;
 const fit=ps=>{const xs=ps.map(p=>Math.log2(p.flops)),ys=ps.map(p=>p.accuracy),mx=xs.reduce((a,b)=>a+b)/xs.length,my=ys.reduce((a,b)=>a+b)/ys.length;const slope=xs.reduce((a,x,i)=>a+(x-mx)*(ys[i]-my),0)/xs.reduce((a,x)=>a+(x-mx)**2,0);return f=>my+slope*(Math.log2(f)-mx)};
 const fits=Object.fromEntries(models.map(m=>[m.id,fit(DATA.curves[m.key].slice(0,7))]));
 const point=(key,index)=>DATA.curves[key][index];
 const famOf=m=>m.id==='fixed'?'tah':m.id;
 function axes(xt,yt,xf,yf,label){let s='';yt.forEach(v=>{s+=`<line x1="56" y1="${yf(v)}" x2="522" y2="${yf(v)}" stroke="#e5e5ea" stroke-dasharray="4 5"/>`+svgTx(44,yf(v)+4,v,'text-anchor="end"')});xt.forEach(([v,t])=>s+=svgTx(xf(v),362,t,'text-anchor="middle"'));return s+svgTx(289,385,label,'text-anchor="middle"');}
 plots.forEach(svg=>svg.insertAdjacentHTML('beforeend','<g class="teaser-scene"></g>'));
 const scenes=plots.map(svg=>svg.querySelector('.teaser-scene'));
 $('teaser-legend').innerHTML=models.map(m=>`<span data-teaser-legend="${m.id}"><i style="--series:${m.color}"></i>${translate(m.label)}</span>`).join('');
 function draw(ms){
  const morph=smooth(clamp((ms-MORPH)/(EXTEND-MORPH)));
  const ext=clamp((ms-EXTEND)/(2*SEG))*2,seg=Math.min(1,Math.floor(ext)),segF=ext>=2?1:smooth(clamp(ext-seg));
  const pos=6+2*(seg+segF),i0=Math.min(9,Math.floor(pos+1e-9)),fraction=clamp(pos-i0),i1=i0+1;
  const base0=point('Standard',i0),base1=point('Standard',i1);
  const base={flops:lerp(base0.flops,base1.flops,fraction),accuracy:lerp(base0.accuracy,base1.accuracy,fraction)};
  const maxLog=lerp(Math.log2(190),Math.log2(430),morph),x=f=>56+(Math.log2(f)-Math.log2(14))/(maxLog-Math.log2(14))*466;
  let compute=axes((morph>.9?[16,32,64,128,256]:[16,32,64,128]).map(v=>[v,v]),[6,8,10,12,14,16],x,y,'Decoding TFLOPs / response (log₂ scale)');
  let depth=axes([1,1.5,2,3,4].map(v=>[v,v+'×']),[10,12,14,16],dx,dy,'Decoding FLOPs relative to Standard');
  models.forEach(m=>{
   const isTah=m.id==='tah'||m.id==='fixed';const reveal=isTah?clamp((ms-START_TAH)/(END_REVEAL-START_TAH)):clamp(ms/2000);
   const clipWidth=reveal*520,fam=famOf(m);
   compute+=`<defs><clipPath id="tc-${m.id}"><rect x="49" y="0" width="${clipWidth}" height="355"/></clipPath></defs><g data-teaser-series="${m.id}" clip-path="url(#tc-${m.id})">`;
   const ps=DATA.curves[m.key],first=ps.slice(0,7),coords=first.map(p=>({x:p.flops,y:lerp(fits[m.id](p.flops),p.accuracy,morph)}));
   if(ms>=EXTEND){for(let i=7;i<=i0;i++)coords.push({x:ps[i].flops,y:ps[i].accuracy});if(fraction>0)coords.push({x:lerp(ps[i0].flops,ps[i1].flops,fraction),y:lerp(ps[i0].accuracy,ps[i1].accuracy,fraction)});}
   compute+=`<path data-curve-kind="${morph===0?'fit':morph===1?'measured':'transition'}" d="${svgPath(coords,x,y)}" fill="none" stroke="${m.color}" stroke-width="${isTah?3.1:2.2}" stroke-linejoin="round" stroke-linecap="round"/>`;
   const count=ms<EXTEND?7:i0+1+(fraction>=.999?1:0);
   ps.slice(0,count).forEach(p=>compute+=marker(fam,m.color,x(p.flops),y(p.accuracy),lerp(.65,1,morph),translate('{label}: {cutoff}K, {accuracy}%, {flops} TFLOPs', {label:translate(m.label),cutoff:p.cutoff,accuracy:p.accuracy.toFixed(2),flops:p.flops.toFixed(1)}),m.id==='tah'?4.3:3.5));
   if(ms>=EXTEND&&fraction>0&&fraction<.999){const tip=coords.at(-1);compute+=marker(fam,m.color,x(tip.x),y(tip.y),1,translate('Animation between reported output cutoffs'),m.id==='tah'?4.3:3.5);}
   compute+='</g>';
   depth+=`<defs><clipPath id="td-${m.id}"><rect x="49" y="0" width="${clipWidth}" height="356"/></clipPath></defs><g data-teaser-series="${m.id}" clip-path="url(#td-${m.id})">`;
   if(m.id==='standard')depth+=`<line x1="56" y1="${dy(base.accuracy)}" x2="522" y2="${dy(base.accuracy)}" stroke="${m.color}" stroke-dasharray="4 5" opacity=".45"/>`+marker(fam,m.color,dx(1),dy(base.accuracy),1,`Standard: ${base.accuracy.toFixed(2)}%`)+svgTx(dx(1)+9,dy(base.accuracy)+18,'Standard');
   else{
    const pts=m.depths.map(([ceiling,key])=>{const a=point(key,i0),b=point(key,i1);return{x:lerp(a.flops,b.flops,fraction)/base.flops,y:lerp(a.accuracy,b.accuracy,fraction),ceiling}});
    depth+=`<path d="${svgPath([{x:1,y:base.accuracy},...pts],dx,dy)}" fill="none" stroke="${m.color}" stroke-width="${isTah?3.1:2.2}" stroke-linejoin="round"/>`;
    pts.forEach(p=>{depth+=marker(fam,m.color,dx(p.x),dy(p.y),1,translate('{label}, M={depth}: {accuracy}%, {ratio}× decoding FLOPs', {label:translate(m.label),depth:p.ceiling,accuracy:p.y.toFixed(2),ratio:p.x.toFixed(2)}),m.id==='tah'?4.3:3.5);if(m.id==='tah')depth+=`<text x="${dx(p.x)+8}" y="${dy(p.y)-11}" fill="${m.color}" font-size="12" font-weight="600">M=${p.ceiling}</text>`});
   }depth+='</g>';
   document.querySelector(`[data-teaser-legend="${m.id}"]`).style.opacity=reveal>0?'1':'.3';
  });
  scenes[0].innerHTML=compute;scenes[1].innerHTML=depth;
  const [segStart,segEnd]=SEGMENTS[seg];
  const label=ms<START_TAH?translate('Stage 1 · Standard + baselines'):ms<MORPH?translate('Stage 1 · Add both TaH2 models'):ms<EXTEND?translate('Stage 2 · Fit → measured polyline'):ext>=2?translate('Stage 2 · All models at 32K'):translate('Stage 2 · Extend {start}K → {end}K', {start:segStart,end:segEnd});
  if($('teaser-status').textContent!==label)$('teaser-status').textContent=label;
  const settled=ext>=2||segF>=.999||segF<=0,cutoff=ms<EXTEND?16:ext>=2?32:segF>=.999?segEnd:segStart;
  const budget=ms<EXTEND?'16K':settled?cutoff+'K':segStart+'K → '+segEnd+'K';
  $('teaser-budget').textContent=budget;
  $('teaser-compute-subtitle').textContent=ms<MORPH?translate('4K–16K · fitted scaling trends'):ms<EXTEND?translate('Switching to measured cutoff results'):translate('4K–{budget} · measured cutoff results', {budget});
  $('teaser-depth-subtitle').textContent=translate('{budget} output cutoff · varying depth ceilings', {budget});
  $('teaser-slope').textContent=ms<MORPH?translate('+53% slope'):ext>=2?'15.49% @32K':'16K → 32K';
  $('teaser-depth-gain').textContent=ext>=2?translate('+4.24 pp'):ms<EXTEND?translate('+3.89 pp'):'16K → 32K';
  const badge=clamp((ms-END_REVEAL)/350);$('teaser-slope').style.opacity=badge;$('teaser-depth-gain').style.opacity=badge;
  $('teaser-caption-text').textContent=translate('TaH2 turns more compute and greater depth into higher accuracy.');
  $('teaser').dataset.stage=ms<START_TAH?'baselines':ms<MORPH?'tah':ms<EXTEND?'morph':ext>=2?'complete':'extension';
  plots[0].querySelector('desc').textContent=ms<MORPH?translate('Accuracy versus decoding FLOPs. Standard and the Ouro and Huginn baselines appear together, then adaptive and fixed-depth TaH2. Fitted trends use 4K–16K output cutoffs.'):translate('Measured accuracy-compute polylines, extending to {budget} outputs. At 32K: Standard 11.98%, Ouro 11.81%, Huginn 13.26%, TaH2 fixed 14.65%, TaH2 adaptive 15.49%.', {budget});
  plots[1].querySelector('desc').textContent=translate('Depth scaling at the {budget} output cutoff. At 32K, Standard reaches 11.98%, and adaptive TaH2 reaches 15.49%, 15.76%, 16.22% at ceilings 2, 4, 8. This compares matched output cutoffs, not matched compute.', {budget});
 }
 looper({end:END,hold:HOLD,draw,button:$('teaser-pause'),clickTargets:[document.querySelector('.teaser-grid')],root:$('teaser')});
})();

// ---------- Results: Figure 4b, four panels drawn cutoff by cutoff, looping ----------
(function initScaling(){
 const panels=[
  {title:'TaH2 (adaptive)',family:'tah',series:[['TaH2 (adaptive, M=2)','TaH2 · M=2','#6fa3dc'],['TaH2 (adaptive, M=4)','TaH2 · M=4','#2166c4'],['TaH2 (adaptive, M=8)','TaH2 · M=8','#143d78']]},
  {title:'TaH2 (fixed-depth)',family:'tah',series:[['TaH2 (fixed-depth, M=2)','TaH2 · M=2','#4fb56a'],['TaH2 (fixed-depth, M=4)','TaH2 · M=4','#1f6b30']]},
  {title:'Huginn',family:'huginn',series:[['Huginn (M=3)','Huginn · M=3','#dca24a'],['Huginn (M=7)','Huginn · M=7','#a3660a']]},
  {title:'Ouro',family:'ouro',series:[['Ouro (M=2)','Ouro · M=2','#a07ac9'],['Ouro (M=4)','Ouro · M=4','#4a2a70']]}
 ];
 const CUTS=[4,6,8,10,12,14,16,20,24,28,32],DRAW=evidenceAnimation.end;
 const plot=paperPlot(PAPER_PLOT_RATIO.scaling);
 const x=f=>plot.left+(Math.log2(f)-Math.log2(13))/(Math.log2(950)-Math.log2(13))*plot.width,y=v=>plot.bottom-(v-4.5)/13*plot.height;
 const grid=$('scaling-grid');
 grid.innerHTML=panels.map((p,i)=>`<figure class="scaling-panel"><svg id="scaling-${i}" viewBox="0 0 450 370" data-plot-width="${plot.width}" data-plot-height="${plot.height}" role="img" aria-label="${translate("{model}: accuracy versus decoding FLOPs", {model:translate(p.title)})}"><title>${translate(p.title)}</title></svg><div class="panel-legend"><span><i style="--series:${colors.standard}"></i>Standard</span>${p.series.map(([,l,c])=>`<span><i style="--series:${c}"></i>${translate(l)}</span>`).join('')}</div></figure>`).join('');
 const svgs=panels.map((_,i)=>$('scaling-'+i));
 function axes(title){let s=svgTx(52,18,title,'font-weight="600" fill="#1d1d1f" font-size="13"');[6,8,10,12,14,16].forEach(v=>{s+=`<line x1="52" y1="${y(v)}" x2="440" y2="${y(v)}" stroke="#e5e5ea" stroke-dasharray="4 5"/>`+svgTx(42,y(v)+4,v,'text-anchor="end" font-size="11"')});[16,32,64,128,256,512].forEach(v=>s+=svgTx(x(v),326,v,'text-anchor="middle" font-size="11"'));return s+svgTx(246,359,'Decoding TFLOPs per response (log₂)','text-anchor="middle" font-size="11"');}
 function draw(ms){
  const pos=clamp(ms/DRAW)*10,i0=Math.min(9,Math.floor(pos+1e-9)),fraction=clamp(pos-i0),i1=i0+1,done=pos>=10-1e-9;
  panels.forEach((p,pi)=>{
   let s=axes(p.title);
   const all=[['Standard','Standard',colors.standard,'standard'],...p.series.map(sr=>[...sr,p.family])];
   all.forEach(([key,label,color,fam])=>{
    const ps=DATA.curves[key],coords=[];
    for(let i=0;i<=i0;i++)coords.push({x:ps[i].flops,y:ps[i].accuracy,cutoff:ps[i].cutoff});
    if(fraction>0&&!done)coords.push({x:lerp(ps[i0].flops,ps[i1].flops,fraction),y:lerp(ps[i0].accuracy,ps[i1].accuracy,fraction),cutoff:null});
    else if(done)coords.push({x:ps[10].flops,y:ps[10].accuracy,cutoff:32});
    const dark=coords.slice(0,7),light=coords.slice(6);
    const w=fam==='standard'?2:2.6;
    if(dark.length>1)s+=`<path d="${svgPath(dark,x,y)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
    if(light.length>1)s+=`<path d="${svgPath(light,x,y)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity=".42"/>`;
    coords.forEach((c,i)=>{const beyond=i>6;s+=marker(fam,color,x(c.x),y(c.y),beyond?.55:1,c.cutoff?translate('{label}: {cutoff}K, {accuracy}%, {flops} TFLOPs', {label:translate(label),cutoff:c.cutoff,accuracy:c.y.toFixed(2),flops:c.x.toFixed(1)}):translate('Animation between reported output cutoffs'),fam==='standard'?2.8:3.4);});
   });
   svgs[pi].querySelector('g.scene')?.remove();svgs[pi].insertAdjacentHTML('beforeend',`<g class="scene">${s}</g>`);
  });
  const status=done?translate('All cutoffs · 4K–32K'):fraction<.02?translate('Output cutoff {cutoff}K', {cutoff:CUTS[i0]}):translate('Output cutoff {from}K → {to}K', {from:CUTS[i0],to:CUTS[i1]});
  if($('scaling-status').textContent!==status)$('scaling-status').textContent=status;
 }
 registerEvidenceAnimation(draw);
})();

// ---------- Results: Appendix C.1 validation loss, drawn over training steps, looping ----------
(function initLoss(){
 const L=DATA.lossCurves;if(!L)return;
 const panels=[
  {id:'adaptive',title:'TaH2 (adaptive)',family:'tah',series:[['TaH2 (adaptive, M=2)','M=2','#6fa3dc'],['TaH2 (adaptive, M=4)','M=4','#2166c4'],['TaH2 (adaptive, M=8)','M=8','#143d78']]},
  {id:'fixed',title:'TaH2 (fixed-depth)',family:'tah',series:[['TaH2 (fixed-depth, M=2)','M=2','#4fb56a'],['TaH2 (fixed-depth, M=4)','M=4','#1f6b30']]},
  {id:'huginn',title:'Huginn',family:'huginn',series:[['Huginn (M=3)','M=3','#dca24a'],['Huginn (M=7)','M=7','#a3660a']]},
  {id:'ouro',title:'Ouro',family:'ouro',series:[['Ouro (M=2)','M=2','#a07ac9'],['Ouro (M=4)','M=4','#4a2a70']]}
 ];
 const MAX_STEP=6400,DRAW=evidenceAnimation.end,INSET_AT=DRAW-900;
 // Shared loss range; values above 0.44 are clipped to focus on convergence.
 const losses=Object.values(L).flatMap(panel=>Object.values(panel).flatMap(points=>points.map(p=>p.loss)));
 const low=Math.floor((Math.min(...losses)-.02)*100)/100,high=0.44;
 const plot=paperPlot(PAPER_PLOT_RATIO.loss);
 const x=step=>plot.left+8+step/MAX_STEP*(plot.width-16),y=loss=>plot.bottom-(loss-low)/(high-low)*plot.height;
 const grid=$('loss-grid');
 grid.innerHTML=panels.map((p,i)=>`<figure class="scaling-panel"><svg id="loss-${i}" viewBox="0 0 450 370" data-plot-width="${plot.width}" data-plot-height="${plot.height}" role="img" aria-label="${translate("{model}: SFT validation loss versus training steps", {model:translate(p.title)})}"><title>${translate(p.title)}</title><defs><clipPath id="loss-clip-${i}"><rect x="${plot.left}" y="${plot.top}" width="${plot.width}" height="${plot.height+5}"/></clipPath></defs></svg><div class="panel-legend"><span><i style="--series:${colors.standard}"></i>Standard</span>${p.series.map(([,l,c])=>`<span><i style="--series:${c}"></i>${p.title.split(' ')[0]} · ${translate(l)}</span>`).join('')}</div></figure>`).join('');
 const svgs=panels.map((_,i)=>$('loss-'+i));
 function axes(title){let s=svgTx(52,18,title,'font-weight="600" fill="#1d1d1f" font-size="13"');[0.32,0.36,0.40,0.44].forEach(v=>{s+=`<line x1="52" y1="${y(v)}" x2="440" y2="${y(v)}" stroke="#e5e5ea" stroke-dasharray="4 5"/>`+svgTx(44,y(v)+4,v.toFixed(2),'text-anchor="end" font-size="11"')});[0,2000,4000,6000].forEach(v=>s+=svgTx(x(v),326,v,'text-anchor="middle" font-size="11"'));return s+svgTx(246,359,'Training steps','text-anchor="middle" font-size="11"');}
 // Interpolate a series up to `step` (linear between reported checkpoints).
 function upTo(pts,step){const out=[];for(let i=0;i<pts.length;i++){if(pts[i].step<=step)out.push({x:pts[i].step,y:pts[i].loss,step:pts[i].step});else{if(i>0&&step>pts[i-1].step){const a=pts[i-1],b=pts[i],t=(step-a.step)/(b.step-a.step);out.push({x:step,y:lerp(a.loss,b.loss,t),step:null});}break;}}return out;}
 function inset(p,opacity){
  const standard=L[p.id].Standard.at(-1).loss;
  const values=p.series.map(([key,label,color])=>({label,color,delta:L[p.id][key].at(-1).loss-standard}));
  const ix=224,iy=57,width=208,rowHeight=23,height=30+values.length*rowHeight;
  const maxDelta=Math.max(...values.map(v=>Math.abs(v.delta))),barStart=ix+59,barWidth=58;
  let content=`<g class="loss-inset" opacity="${opacity}" aria-label="${translate("Final loss difference from Standard")}"><rect x="${ix}" y="${iy}" width="${width}" height="${height}" rx="7" fill="#fff" fill-opacity=".96" stroke="#e5e5ea"/>`;
  content+=svgTx(ix+12,iy+18,'Final loss vs. Standard','class="inset-title" font-size="13" fill="#6e6e73"');
  values.forEach((v,i)=>{
   const cy=iy+39+i*rowHeight,length=Math.abs(v.delta)/maxDelta*barWidth;
   content+=svgTx(ix+12,cy,v.label,'font-size="14" fill="#1d1d1f"');
   content+=`<rect x="${v.delta<0?barStart+barWidth-length:barStart}" y="${cy-10}" width="${length}" height="11" rx="2" fill="${v.color}"/>`;
   content+=svgTx(ix+width-10,cy,(v.delta>0?'+':'')+v.delta.toFixed(4),`font-size="14" text-anchor="end" font-weight="600" fill="${v.color}"`);
  });
  return content+'</g>';
 }
 function draw(ms){
  const t=clamp(ms/DRAW),step=t*MAX_STEP,done=t>=1;
  panels.forEach((p,pi)=>{
   let s=axes(p.title);
   const all=[['Standard','Standard',colors.standard,'standard'],...p.series.map(sr=>[sr[0],p.title.split(' ')[0]+' '+sr[1],sr[2],p.family])];
   let g=`<g clip-path="url(#loss-clip-${pi})">`;
   all.forEach(([key,label,color,fam])=>{
    const pts=upTo(L[p.id][key],step);if(!pts.length)return;
    g+=`<path d="${svgPath(pts,x,y)}" fill="none" stroke="${color}" stroke-width="${fam==='standard'?2:2.6}" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach(c=>{if(c.step===null)return;g+=marker(fam,color,x(c.x),y(c.y),1,translate('{label}: step {step}, loss {loss}', {label:translate(label),step:c.step,loss:c.y.toFixed(4)}),fam==='standard'?2.6:3.2);});
   });
   s+=g+'</g>';
   s+=inset(p,clamp((ms-INSET_AT)/500));
   svgs[pi].querySelector('g.scene')?.remove();svgs[pi].insertAdjacentHTML('beforeend',`<g class="scene">${s}</g>`);
  });
  const status=done?translate('End of post-training · 3 epochs'):translate('Training step {step}', {step:Math.round(step/50)*50});
  if($('loss-status').textContent!==status)$('loss-status').textContent=status;
 }
 registerEvidenceAnimation(draw);
})();

// ---------- Generalization: grouped vertical bars, all nine benchmarks, 4B and 8B ----------
(function initBenchChart(){
 const svg=$('all-benchmarks');if(!svg)return;
 const series=[['4B','Standard',0,'#c7c7cc'],['4B','TaH2',1,'#8b9cf0'],['8B','Standard',0,'#8e8e93'],['8B','TaH2',1,'#764ba2']];
 $('bench-legend').innerHTML=series.map(([sz,m,,c])=>`<span><i style="--series:${c}"></i>${sz} · ${m}</span>`).join('');
 const names=Object.keys(DATA.crossDomain['4B']),left=44,right=990,top=34,bottom=318,groupW=(right-left)/names.length,bw=Math.min(18,groupW/6),gap=3;
 const y=v=>bottom-(v/100)*(bottom-top);
 let s='';
 [0,20,40,60,80,100].forEach(v=>{s+=`<line x1="${left}" y1="${y(v)}" x2="${right}" y2="${y(v)}" stroke="#e5e5ea" ${v?'stroke-dasharray="4 5"':''}/>`+svgTx(left-8,y(v)+4,v,'text-anchor="end" font-size="11"');});
 s+=svgTx(left,18,'Accuracy (%)','font-size="11"');
 names.forEach((name,gi)=>{
  const cx=left+groupW*(gi+0.5),x0=cx-(bw*4+gap*3)/2;
  series.forEach(([sz,m,idx,color],si)=>{
   const v=DATA.crossDomain[sz][name][idx],x=x0+si*(bw+gap),h=bottom-y(v);
   s+=`<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="2" fill="${color}"><title>${name} · ${sz} ${m}: ${v.toFixed(1)}%</title></rect>`;
   if(idx===1){const g=v-DATA.crossDomain[sz][name][0];s+=svgTx(x+bw/2,y(v)-5,'+'+g.toFixed(1),`text-anchor="middle" font-size="10" font-weight="600" fill="${color}"`);}
  });
  const label=name.replace('OlympiadBench','Olympiad').replace('IMO-AnswerBench','IMO-AB').replace('LiveCodeBench','LCB').replace('SuperGPQA','SGPQA');
  s+=svgTx(cx,bottom+18,label,'text-anchor="middle" font-size="11.5" fill="#1d1d1f"');
  const cat=gi<6?'':gi===6?'code':gi===7?'QA':'tool use';if(gi===0)s+=svgTx(left+groupW*3,bottom+36,'math','text-anchor="middle" font-size="10" fill="#86868b"');if(cat)s+=svgTx(cx,bottom+36,cat,'text-anchor="middle" font-size="10" fill="#86868b"');
  if(gi===5)s+=`<line x1="${left+groupW*6}" y1="${top}" x2="${left+groupW*6}" y2="${bottom}" stroke="#e5e5ea"/>`;
 });
 svg.insertAdjacentHTML('beforeend',`<g>${s}</g>`);
})();

// ---------- Results: Table 2 runtime efficiency + Figure 5 accuracy vs measured latency ----------
(function initRuntime(){
 const R=DATA.runtime;if(!R||!$('runtime-table'))return;
 const cols=[['Standard',''],['TaH2 fixed','M=2'],['TaH2','M=2']];
 function renderTable(b){
  const rows=Object.entries(R[b]).map(([metric,v])=>`<tr><th scope="row">${translate(metric)}</th>${v.map((n,i)=>`<td><strong>${n.toFixed(metric==='GFLOPs/token'?2:1)}</strong><small>${(n/v[0]).toFixed(2)}×</small></td>`).join('')}</tr>`).join('');
  $('runtime-table').innerHTML=`<thead><tr><th scope="col">${translate("Metric")}</th>${cols.map(([name,detail],i)=>`<th scope="col" class="${i===2?'hl':''}">${translate(name)}<span class="runtime-model-detail">${detail||'&nbsp;'}</span></th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;
  $('runtime-table').setAttribute('aria-label',translate('Runtime efficiency at batch size {batch}', {batch:b}));
  $('runtime-batch-label').textContent=translate('Batch {batch}', {batch:b});
  pressed('data-batch',b);
 }
 document.querySelectorAll('[data-batch]').forEach(btn=>btn.addEventListener('click',()=>renderTable(btn.dataset.batch)));
 renderTable('1');
 // Latency chart (paper Fig. 5): DATA.latency has nine cutoffs per model.
 const series=[['Standard','Standard',colors.standard,'standard'],['TaH2 (fixed-depth, M=2)','TaH2 fixed · M=2',colors.fixed,'tah'],['TaH2 (adaptive, M=2)','TaH2 · M=2',colors.tah,'tah']];
 $('latency-legend').innerHTML=series.map(([,l,c])=>`<span><i style="--series:${c}"></i>${translate(l)}</span>`).join('');
 const plot=paperPlot(PAPER_PLOT_RATIO.single);
 const svg=$('latency-chart'),x=s=>plot.left+s/340*plot.width,y=v=>plot.bottom-(v-5.5)/11.5*plot.height,DRAW=5200,HOLD=2800;
 svg.dataset.plotWidth=plot.width;svg.dataset.plotHeight=plot.height;
 const N=DATA.latency['Standard'].length;
 function axes(){let s=svgTx(52,16,'Accuracy (%)','font-size="11"');[6,8,10,12,14,16].forEach(v=>{s+=`<line x1="52" y1="${y(v)}" x2="440" y2="${y(v)}" stroke="#e5e5ea" stroke-dasharray="4 5"/>`+svgTx(44,y(v)+4,v,'text-anchor="end" font-size="11"')});[0,60,120,180,240,300].forEach(v=>s+=svgTx(x(v),326,v,'text-anchor="middle" font-size="11"'));return s+svgTx(246,359,'Mean end-to-end latency per response (s) · batch size 1','text-anchor="middle" font-size="11"');}
 function draw(ms){
  const t=clamp(ms/DRAW),pos=t*(N-1),i0=Math.min(N-2,Math.floor(pos)),frac=t>=1?1:pos-i0;
  let s=axes();
  series.forEach(([key,label,color,fam])=>{
   const pts=DATA.latency[key],coords=[];
   for(let i=0;i<=i0;i++)coords.push({x:pts[i].seconds,y:pts[i].accuracy,cutoff:pts[i].cutoff});
   if(frac>0){const a=pts[i0],b=pts[i0+1];coords.push({x:lerp(a.seconds,b.seconds,frac),y:lerp(a.accuracy,b.accuracy,frac),cutoff:frac>=1?b.cutoff:null});}
   const split=coords.findIndex(c=>c.cutoff!==null&&c.cutoff>16),dark=split<0?coords:coords.slice(0,split),light=split<0?[]:coords.slice(Math.max(0,split-1));
   const w=fam==='standard'?2:2.6;
   if(dark.length>1)s+=`<path d="${svgPath(dark,x,y)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
   if(light.length>1)s+=`<path d="${svgPath(light,x,y)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" opacity=".42"/>`;
   coords.forEach(c=>{if(c.cutoff===null)return;s+=marker(fam,color,x(c.x),y(c.y),c.cutoff>16?.55:1,translate('{label}: {cutoff}K cutoff, {accuracy}%, {seconds} s', {label:translate(label),cutoff:c.cutoff,accuracy:c.y.toFixed(2),seconds:c.x.toFixed(1)}),fam==='standard'?2.6:3.2);});
  });
  svg.querySelector('g.scene')?.remove();svg.insertAdjacentHTML('beforeend',`<g class="scene">${s}</g>`);
 }
 looper({end:DRAW,hold:HOLD,draw,button:$('latency-pause'),clickTargets:[svg],root:$('runtime-figure')});
})();

// ---------- Results: Appendix C.4 token-level depth viewer ----------
(function initDepth(){
 const T=DATA.tokenDepth;if(!T||!$('depth-columns'))return;
 const blues=['','#eff6fc','#d6e5f4','#b7d4ea','#87bddc','#57a0ce','#3181bd','#135fa7','#1c4c87'];
 const names=['HumanEval','OlympiadBench','GPQA'];
 $('depth-legend').innerHTML=`<span class="depth-legend-title">${translate('Iteration depth')}</span>`+[1,2,3,4,5,6,7,8].map(d=>`<span class="depth-swatch" style="background:${blues[d]};color:${d>=5?'#fff':'#1d1d1f'}">${d}</span>`).join('');
 const esc=t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 // PDF extraction merges adjacent tokens with equal depth into text runs.
 // Reveal those runs in small word-sized pieces, retaining their recorded depth.
 const line=runs=>runs.map(run=>(run.t.match(/\s*\S+|\s+/g)||[]).map(text=>`<span class="tok" data-d="${run.d}" style="--token-color:${blues[run.d]}" title="${translate("depth {depth}", {depth:run.d})}">${esc(text)}</span>`).join('')).join('');
 $('depth-columns').innerHTML=names.map(n=>`<div class="depth-col"><div class="depth-col-heading"><h4>${n}</h4></div>${['beginning','ending'].map((seg,i)=>`${i?'<div class="depth-ellipsis">…</div>':''}<div class="depth-seg-head"><span>${translate(seg[0].toUpperCase()+seg.slice(1))}</span><span class="depth-mean">${translate("Mean depth {depth}", {depth:T[n][seg].mean.toFixed(2)})}</span></div><pre class="depth-text" data-segment="${seg}">${T[n][seg].lines.map(line).join('\n')}</pre>`).join('')}</div>`).join('');
 const columns=[...$('depth-columns').querySelectorAll('.depth-col')].map(col=>({
  segments:[...col.querySelectorAll('.depth-text')].map(pre=>({tokens:[...pre.querySelectorAll('.tok')],mean:pre.previousElementSibling.querySelector('.depth-mean'),count:-1}))
 }));
 const BEGIN=2400,BREAK=300,END=3300,DRAW=BEGIN+BREAK+END,HOLD=1800;
 function draw(ms){
  const phases=[clamp(ms/BEGIN),clamp((ms-BEGIN-BREAK)/END)];
  columns.forEach(col=>{
   col.segments.forEach((seg,index)=>{
    const progress=phases[index],count=Math.floor(progress*seg.tokens.length);
    if(count!==seg.count){
     seg.tokens.forEach((token,i)=>{token.classList.toggle('revealed',i<count);token.classList.toggle('current',i===count-1&&progress<1);});
     seg.mean.classList.toggle('visible',progress>=1);
     seg.count=count;
    }
   });

  });
 }
 looper({end:DRAW,hold:HOLD,draw,button:$('depth-pause'),root:$('depth-figure')});
})();

// ---------- Scroll reveal (same feel as the TaH page: fade + rise as blocks enter the viewport) ----------
(function initReveal(){
 const targets=document.querySelectorAll('.section-kicker,.section-heading,.section > h2,.section.wrap > h2,#tokens .insight-grid > div,.thesis,.teaser,.paper-figure,.method-principles > div,.technical-detail,.domain-card,.generalization-foot,.authors-list,.affiliations,.citation-grid > div,.citation-box');
 targets.forEach(el=>{if(!el.closest('.reveal'))el.classList.add('reveal');});
 if(reducedMotion.matches){document.querySelectorAll('.reveal').forEach(el=>el.classList.add('active','settled'));return;}
 const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('active');setTimeout(()=>e.target.classList.add('settled'),900);io.unobserve(e.target);}});},{rootMargin:'0px 0px -120px 0px',threshold:.05});
 document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
 // Anything already in view on load shows immediately.
 requestAnimationFrame(()=>document.querySelectorAll('.reveal').forEach(el=>{if(el.getBoundingClientRect().top<innerHeight)el.classList.add('active');}));
})();
