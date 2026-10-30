'use strict';
const {t: translate} = globalThis.SiteI18n;
const DATA = window.TAH2_DATA;
const $ = id => document.getElementById(id);
const colors = {tah:'#2166c4',standard:'#777777',fixed:'#1f8a37',ouro:'#8244a8',huginn:'#c8880c'};
const fmt = (n,d=2)=>Number(n).toFixed(d);
function pressed(attr,value){document.querySelectorAll(`[${attr}]`).forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute(attr)===String(value))));}
function renderInsight(model){const v=model==='ouro'?[26,52.3,21.7]:[50.6,33.5,15.9];const labels=['Improved','Little change','Worse'].map(label => translate(label));const cs=['#30d158','#d2d2d7','#ff9f0a'];$('gain-stack').innerHTML=v.map((n,i)=>`<div style="width:${n}%;background:${cs[i]}"></div>`).join('');$('gain-stack').setAttribute('aria-label',`${model==='ouro'?'Ouro':'Huginn'}: ${v.map((n,i)=>labels[i]+' '+n+'%').join(', ')}`);$('gain-labels').innerHTML=v.map((n,i)=>`<div><strong style="color:${i===1?'#86868b':cs[i]}">${n.toFixed(1)}%</strong><span>${labels[i]}</span></div>`).join('');$('insight-depth').textContent=model==='ouro'?translate('Iterations 1 → 2'):translate('Iterations 1 → 3');pressed('data-insight',model);}
function renderDomains(size){
 const container=$('domain-cards');
 if(container.dataset.modelSize===size)return;
 const picks=[['MATH','AIME26'],['CODE','LiveCodeBench'],['KNOWLEDGE','SuperGPQA'],['TOOL USE','BFCL v3']];
 // Keep the bars mounted so interrupted transitions continue from their visible position.
 if(!container.children.length)container.innerHTML=picks.map(([category,name])=>`<article class="domain-card"><span class="domain-category">${translate(category)}</span><h3>${name}</h3><div class="domain-gain"><b></b><span>${translate('pp')}</span></div><div class="domain-values"><span></span><span aria-hidden="true">→</span><strong></strong></div><div class="domain-bar-track" aria-hidden="true"><span></span><i></i></div></article>`).join('');
 picks.forEach(([,name],i)=>{
  const card=container.children[i],[a,b]=DATA.crossDomain[size][name];
  card.querySelector('.domain-gain b').textContent=`+${fmt(b-a,1)}`;
  card.querySelector('.domain-values span').textContent=`${fmt(a,1)}%`;
  card.querySelector('.domain-values strong').textContent=`${fmt(b,1)}%`;
  card.querySelector('.domain-bar-track span').style.width=`${b}%`;
  card.querySelector('.domain-bar-track i').style.left=`${a}%`;
 });
 container.dataset.modelSize=size;
 $('scale-average').innerHTML=translate('<strong>+{gain} pp</strong> average across nine benchmarks', {gain:size==='4B'?'3.2':'2.4'});
 pressed('data-size',size);
}
document.querySelectorAll('[data-insight]').forEach(b=>b.addEventListener('click',()=>renderInsight(b.dataset.insight)));
document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>renderDomains(b.dataset.size)));
renderInsight('ouro');renderDomains('4B');

// ---------- Shared figure helpers ----------
const clamp=v=>Math.max(0,Math.min(1,v));
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
// Response-token playback keeps its own clock and explicit pause preference.
function animateResponses({end, hold, draw, button, root}) {
 let elapsed=0, last=null, frame=0, paused=false, visible=false;
 const disclosure=root.closest('.sp-fold');
 const concealed=()=>!disclosure.open||disclosure.hasAttribute('data-fold-closing');
 const canPlay=()=>!paused&&!concealed()&&visible&&!document.hidden&&!reducedMotion.matches;
 const render=()=>draw(reducedMotion.matches?end:Math.min(elapsed,end));
 function tick(now) {
  frame=0;
  if(!canPlay()){last=null;return;}
  if(last!==null)elapsed=(elapsed+Math.min(now-last,100))%(end+hold);
  last=now;render();frame=requestAnimationFrame(tick);
 }
 function run(){if(!frame&&canPlay()){last=null;frame=requestAnimationFrame(tick);}}
 function stop(){cancelAnimationFrame(frame);frame=0;last=null;}
 function sync(){if(canPlay())run();else stop();}
 function updateControl() {
  button.disabled=reducedMotion.matches;
  button.setAttribute('aria-pressed',String(!paused&&!reducedMotion.matches));
  const label=translate(reducedMotion.matches?'Static':paused?'Resume animation':'Pause animation');
  button.setAttribute('aria-label',label);button.title=label;
 }
 button.addEventListener('click',()=>{paused=!paused;updateControl();sync();});
 disclosure.addEventListener('sp-fold-change',event=>{if(!event.detail.open)stop();});
 disclosure.addEventListener('sp-fold-settled',sync);
 disclosure.addEventListener('toggle',sync);
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:.12}).observe(root);
 document.addEventListener('visibilitychange',sync);
 reducedMotion.addEventListener('change',()=>{stop();updateControl();render();run();});
 updateControl();render();
}
const charts = window.TaH2Charts;
let scalingRange = '16';
const rangeCharts = [];
function revealSeries(coords, x, y, progress, color, width, pointMarkup, attrs = '') {
 const pixels = coords.map(p => ({x: x(p.x), y: y(p.y)}));
 const trace = charts.trace(pixels, progress);
 const line = `<path ${attrs} d="${svgPath(trace.points, v=>v, v=>v)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
 return line + pixels.map((p, i) => `<g opacity="${trace.opacity(i)}">${pointMarkup(p, i)}</g>`).join('');
}
function rangeContext(series, value, x, y, color, width, progress) {
 const coords=charts.context(series,scalingRange).map(p=>({x:value(p),y:p.accuracy}));
 if(!coords.length)return '';
 return `<g data-range-context opacity="${.28*clamp(progress/.06)}"><path d="${svgPath(coords,x,y)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/></g>`;
}
document.querySelectorAll('[data-scaling-range]').forEach(button => button.addEventListener('click', () => {
 if (button.dataset.scalingRange === scalingRange) return;
 scalingRange = button.dataset.scalingRange;
 pressed('data-scaling-range', scalingRange);
 rangeCharts.forEach(chart => chart.restart());
}));
const evidenceDraws = [];
function registerEvidenceAnimation(draw) {
 evidenceDraws.push(draw);
 if (evidenceDraws.length === 2) rangeCharts.push(charts.create({
  roots: [$('scaling-figure'), $('loss-figure')],
  draw: ms => evidenceDraws.forEach(render => render(ms))
 }));
}

// ---------- Figure 1: explicit output range, reasoning then looped models ----------
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
  const extended=scalingRange==='32',cutoff=extended?32:16,index=extended?10:6;
  const base=point('Standard',index),maxLog=Math.log2(extended?430:190);
  const x=f=>56+(Math.log2(f)-Math.log2(14))/(maxLog-Math.log2(14))*466;
  let compute=axes((extended?[16,32,64,128,256]:[16,32,64,128]).map(v=>[v,v]),[6,8,10,12,14,16],x,y,'Decoding TFLOPs / response (log₂ scale)');
  let depth=axes([1,1.5,2,3,4].map(v=>[v,v+'×']),[10,12,14,16],dx,dy,'Decoding FLOPs relative to Standard');
  models.forEach(m=>{
   const reveal=charts.progress(ms,m.id==='standard'),fam=famOf(m),isTah=m.id==='tah'||m.id==='fixed';
   const ps=charts.points(DATA.curves[m.key],scalingRange);
   const coords=ps.map(p=>({x:p.flops,y:extended?p.accuracy:fits[m.id](p.flops)}));
   const curve=revealSeries(coords,x,y,reveal,m.color,isTah?3.1:2.2,(_,i)=>{
    const p=ps[i];
    return marker(fam,m.color,x(p.flops),y(p.accuracy),1,translate('{label}: {cutoff}K, {accuracy}%, {flops} TFLOPs',{label:translate(m.label),cutoff:p.cutoff,accuracy:fmt(p.accuracy),flops:fmt(p.flops,1)}),m.id==='tah'?4.3:3.5);
   },`data-curve-kind="${extended?'measured':'fit'}"`);
   compute+=`<g data-teaser-series="${m.id}">${rangeContext(DATA.curves[m.key],p=>p.flops,x,y,m.color,isTah?3.1:2.2,reveal)}${curve}</g>`;
   let depthCurve='';
   if(m.id==='standard')depthCurve=`<g opacity="${reveal}"><line x1="56" y1="${dy(base.accuracy)}" x2="522" y2="${dy(base.accuracy)}" stroke="${m.color}" stroke-dasharray="4 5" opacity=".45"/>`+marker(fam,m.color,dx(1),dy(base.accuracy),1,`Standard: ${fmt(base.accuracy)}%`)+svgTx(dx(1)+9,dy(base.accuracy)+18,'Standard')+'</g>';
   else{
    const pts=[{x:1,y:base.accuracy},...m.depths.map(([ceiling,key])=>({x:point(key,index).flops/base.flops,y:point(key,index).accuracy,ceiling}))];
    depthCurve=revealSeries(pts,dx,dy,reveal,m.color,isTah?3.1:2.2,(pixel,i)=>{
     if(!i)return '';
     const p=pts[i];
     return marker(fam,m.color,pixel.x,pixel.y,1,translate('{label}, M={depth}: {accuracy}%, {ratio}× decoding FLOPs',{label:translate(m.label),depth:p.ceiling,accuracy:fmt(p.y),ratio:fmt(p.x)}),m.id==='tah'?4.3:3.5)+(m.id==='tah'?svgTx(pixel.x+8,pixel.y-11,`M=${p.ceiling}`,`fill="${m.color}"`):'');
    });
   }
   depth+=`<g data-teaser-series="${m.id}">${depthCurve}</g>`;
   document.querySelector(`[data-teaser-legend="${m.id}"]`).style.opacity=reveal>0?'1':'.3';
  });
  scenes[0].innerHTML=compute;scenes[1].innerHTML=depth;
  $('teaser-status').textContent=translate(extended?'4K–32K · measured results':'4K–16K · fitted scaling trends');
  $('teaser-compute-subtitle').textContent=$('teaser-status').textContent;
  $('teaser-depth-subtitle').textContent=translate('{budget} output cutoff · varying depth ceilings',{budget:cutoff+'K'});
  $('teaser-slope').textContent=extended?'15.49% @32K':translate('+53% slope');
  $('teaser-depth-gain').textContent=translate(extended?'+4.24 pp':'+3.89 pp');
  const badge=clamp((charts.progress(ms,false)-.75)/.25);$('teaser-slope').style.opacity=badge;$('teaser-depth-gain').style.opacity=badge;
  plots[0].querySelector('desc').textContent=translate(extended?'Measured accuracy and decoding compute at output cutoffs from 4K to 32K. Pale lines show results up to 16K; stronger lines extend to 32K.':'Fitted scaling trends and measured points at output cutoffs from 4K to 16K.');
  plots[1].querySelector('desc').textContent=translate('Accuracy versus relative compute at a {budget} output cutoff. Each point uses the same output cutoff, not the same compute.',{budget:cutoff+'K'});
 }
 rangeCharts.push(charts.create({roots:[$('teaser')],draw}));
})();

// ---------- Results: Figure 4b, all looped models revealed together ----------
(function initScaling(){
 const panels=[
  {title:'TaH2 (adaptive)',family:'tah',series:[['TaH2 (adaptive, M=2)','TaH2 · M=2','#6fa3dc'],['TaH2 (adaptive, M=4)','TaH2 · M=4','#2166c4'],['TaH2 (adaptive, M=8)','TaH2 · M=8','#143d78']]},
  {title:'TaH2 (fixed-depth)',family:'tah',series:[['TaH2 (fixed-depth, M=2)','TaH2 · M=2','#4fb56a'],['TaH2 (fixed-depth, M=4)','TaH2 · M=4','#1f6b30']]},
  {title:'Huginn',family:'huginn',series:[['Huginn (M=3)','Huginn · M=3','#dca24a'],['Huginn (M=7)','Huginn · M=7','#a3660a']]},
  {title:'Ouro',family:'ouro',series:[['Ouro (M=2)','Ouro · M=2','#a07ac9'],['Ouro (M=4)','Ouro · M=4','#4a2a70']]}
 ];
 const plot=paperPlot(PAPER_PLOT_RATIO.scaling);
 const x=f=>plot.left+(Math.log2(f)-Math.log2(13))/(Math.log2(950)-Math.log2(13))*plot.width,y=v=>plot.bottom-(v-4.5)/13*plot.height;
 const grid=$('scaling-grid');
 grid.innerHTML=panels.map((p,i)=>`<figure class="scaling-panel"><svg id="scaling-${i}" viewBox="0 0 450 370" data-plot-width="${plot.width}" data-plot-height="${plot.height}" role="img" aria-label="${translate("{model}: accuracy versus decoding FLOPs", {model:translate(p.title)})}"><title>${translate(p.title)}</title></svg><div class="panel-legend"><span><i style="--series:${colors.standard}"></i>Standard</span>${p.series.map(([,l,c])=>`<span><i style="--series:${c}"></i>${translate(l)}</span>`).join('')}</div></figure>`).join('');
 const svgs=panels.map((_,i)=>$('scaling-'+i));
 function axes(title){let s=svgTx(52,18,title,'font-weight="600" fill="#1d1d1f" font-size="13"');[6,8,10,12,14,16].forEach(v=>{s+=`<line x1="52" y1="${y(v)}" x2="440" y2="${y(v)}" stroke="#e5e5ea" stroke-dasharray="4 5"/>`+svgTx(42,y(v)+4,v,'text-anchor="end" font-size="11"')});[16,32,64,128,256,512].forEach(v=>s+=svgTx(x(v),326,v,'text-anchor="middle" font-size="11"'));return s+svgTx(246,359,'Decoding TFLOPs per response (log₂)','text-anchor="middle" font-size="11"');}
 function draw(ms){
  panels.forEach((p,pi)=>{
   let s=axes(p.title);
   const all=[['Standard','Standard',colors.standard,'standard'],...p.series.map(sr=>[...sr,p.family])];
   all.forEach(([key,label,color,fam])=>{
    const ps=charts.points(DATA.curves[key],scalingRange),coords=ps.map(p=>({x:p.flops,y:p.accuracy}));
    s+=rangeContext(DATA.curves[key],p=>p.flops,x,y,color,fam==='standard'?2:2.6,charts.progress(ms,fam==='standard'));
    s+=revealSeries(coords,x,y,charts.progress(ms,fam==='standard'),color,fam==='standard'?2:2.6,(pixel,i)=>{
     const p=ps[i];
     return marker(fam,color,pixel.x,pixel.y,1,translate('{label}: {cutoff}K, {accuracy}%, {flops} TFLOPs',{label:translate(label),cutoff:p.cutoff,accuracy:fmt(p.accuracy),flops:fmt(p.flops,1)}),fam==='standard'?2.8:3.4);
    });
   });
   svgs[pi].querySelector('g.scene')?.remove();svgs[pi].insertAdjacentHTML('beforeend',`<g class="scene">${s}</g>`);
  });
  $('scaling-status').textContent=translate(scalingRange==='16'?'Output cutoffs · 4K–16K':'Output cutoffs · 4K–32K');
 }
 registerEvidenceAnimation(draw);
})();

// ---------- Results: Appendix C.1 validation loss, same two-group reveal ----------
(function initLoss(){
 const L=DATA.lossCurves;if(!L)return;
 const panels=[
  {id:'adaptive',title:'TaH2 (adaptive)',family:'tah',series:[['TaH2 (adaptive, M=2)','M=2','#6fa3dc'],['TaH2 (adaptive, M=4)','M=4','#2166c4'],['TaH2 (adaptive, M=8)','M=8','#143d78']]},
  {id:'fixed',title:'TaH2 (fixed-depth)',family:'tah',series:[['TaH2 (fixed-depth, M=2)','M=2','#4fb56a'],['TaH2 (fixed-depth, M=4)','M=4','#1f6b30']]},
  {id:'huginn',title:'Huginn',family:'huginn',series:[['Huginn (M=3)','M=3','#dca24a'],['Huginn (M=7)','M=7','#a3660a']]},
  {id:'ouro',title:'Ouro',family:'ouro',series:[['Ouro (M=2)','M=2','#a07ac9'],['Ouro (M=4)','M=4','#4a2a70']]}
 ];
 const MAX_STEP=6400;
 // Shared loss range; values above 0.44 are clipped to focus on convergence.
 const losses=Object.values(L).flatMap(panel=>Object.values(panel).flatMap(points=>points.map(p=>p.loss)));
 const low=Math.floor((Math.min(...losses)-.02)*100)/100,high=0.44;
 const plot=paperPlot(PAPER_PLOT_RATIO.loss);
 const x=step=>plot.left+8+step/MAX_STEP*(plot.width-16),y=loss=>plot.bottom-(loss-low)/(high-low)*plot.height;
 const grid=$('loss-grid');
 grid.innerHTML=panels.map((p,i)=>`<figure class="scaling-panel"><svg id="loss-${i}" viewBox="0 0 450 370" data-plot-width="${plot.width}" data-plot-height="${plot.height}" role="img" aria-label="${translate("{model}: SFT validation loss versus training steps", {model:translate(p.title)})}"><title>${translate(p.title)}</title><defs><clipPath id="loss-clip-${i}"><rect x="${plot.left}" y="${plot.top}" width="${plot.width}" height="${plot.height+5}"/></clipPath></defs></svg><div class="panel-legend"><span><i style="--series:${colors.standard}"></i>Standard</span>${p.series.map(([,l,c])=>`<span><i style="--series:${c}"></i>${p.title.split(' ')[0]} · ${translate(l)}</span>`).join('')}</div></figure>`).join('');
 const svgs=panels.map((_,i)=>$('loss-'+i));
 function axes(title){let s=svgTx(52,18,title,'font-weight="600" fill="#1d1d1f" font-size="13"');[0.32,0.36,0.40,0.44].forEach(v=>{s+=`<line x1="52" y1="${y(v)}" x2="440" y2="${y(v)}" stroke="#e5e5ea" stroke-dasharray="4 5"/>`+svgTx(44,y(v)+4,v.toFixed(2),'text-anchor="end" font-size="11"')});[0,2000,4000,6000].forEach(v=>s+=svgTx(x(v),326,v,'text-anchor="middle" font-size="11"'));return s+svgTx(246,359,'Training steps','text-anchor="middle" font-size="11"');}
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
  const done=ms>=charts.duration;
  panels.forEach((p,pi)=>{
   let s=axes(p.title);
   const all=[['Standard','Standard',colors.standard,'standard'],...p.series.map(sr=>[sr[0],p.title.split(' ')[0]+' '+sr[1],sr[2],p.family])];
   let g=`<g clip-path="url(#loss-clip-${pi})">`;
   all.forEach(([key,label,color,fam])=>{
    const pts=L[p.id][key],coords=pts.map(p=>({x:p.step,y:p.loss}));
    g+=revealSeries(coords,x,y,charts.progress(ms,fam==='standard'),color,fam==='standard'?2:2.6,(pixel,i)=>{
     const p=pts[i];
     return marker(fam,color,pixel.x,pixel.y,1,translate('{label}: step {step}, loss {loss}',{label:translate(label),step:p.step,loss:p.loss.toFixed(4)}),fam==='standard'?2.6:3.2);
    });
   });
   s+=g+'</g>';
   s+=inset(p,clamp((charts.progress(ms,false)-.8)/.2));
   svgs[pi].querySelector('g.scene')?.remove();svgs[pi].insertAdjacentHTML('beforeend',`<g class="scene">${s}</g>`);
  });
  const status=done?translate('End of post-training · 3 epochs'):translate(ms<charts.loopStart?'Standard reasoning':'Looped models');
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
  pressed('data-batch',b);
 }
 document.querySelectorAll('[data-batch]').forEach(btn=>btn.addEventListener('click',()=>renderTable(btn.dataset.batch)));
 renderTable('1');
 // Latency chart (paper Fig. 5): DATA.latency has nine cutoffs per model.
 const series=[['Standard','Standard',colors.standard,'standard'],['TaH2 (fixed-depth, M=2)','TaH2 fixed · M=2',colors.fixed,'tah'],['TaH2 (adaptive, M=2)','TaH2 · M=2',colors.tah,'tah']];
 $('latency-legend').innerHTML=series.map(([,l,c])=>`<span><i style="--series:${c}"></i>${translate(l)}</span>`).join('');
 const plot=paperPlot(PAPER_PLOT_RATIO.single);
 const svg=$('latency-chart'),x=s=>plot.left+s/340*plot.width,y=v=>plot.bottom-(v-5.5)/11.5*plot.height;
 svg.dataset.plotWidth=plot.width;svg.dataset.plotHeight=plot.height;
 function axes(){let s=svgTx(52,16,'Accuracy (%)','font-size="11"');[6,8,10,12,14,16].forEach(v=>{s+=`<line x1="52" y1="${y(v)}" x2="440" y2="${y(v)}" stroke="#e5e5ea" stroke-dasharray="4 5"/>`+svgTx(44,y(v)+4,v,'text-anchor="end" font-size="11"')});[0,60,120,180,240,300].forEach(v=>s+=svgTx(x(v),326,v,'text-anchor="middle" font-size="11"'));return s+svgTx(246,359,'Mean end-to-end latency per response (s) · batch size 1','text-anchor="middle" font-size="11"');}
 function draw(ms){
  let s=axes();
  series.forEach(([key,label,color,fam])=>{
   const ps=charts.points(DATA.latency[key],scalingRange),coords=ps.map(p=>({x:p.seconds,y:p.accuracy}));
   s+=rangeContext(DATA.latency[key],p=>p.seconds,x,y,color,fam==='standard'?2:2.6,charts.progress(ms,fam==='standard'));
   s+=revealSeries(coords,x,y,charts.progress(ms,fam==='standard'),color,fam==='standard'?2:2.6,(pixel,i)=>{
    const p=ps[i];
    return marker(fam,color,pixel.x,pixel.y,1,translate('{label}: {cutoff}K cutoff, {accuracy}%, {seconds} s',{label:translate(label),cutoff:p.cutoff,accuracy:fmt(p.accuracy),seconds:fmt(p.seconds,1)}),fam==='standard'?2.6:3.2);
   });
  });
  svg.querySelector('g.scene')?.remove();svg.insertAdjacentHTML('beforeend',`<g class="scene">${s}</g>`);
 }
 rangeCharts.push(charts.create({roots:[$('runtime-figure')],draw}));
})();

// Pause immediately on close intent, with native toggle as the no-enhancement fallback.
$('video-demo').addEventListener('sp-fold-change',event=>{
 if(!event.detail.open)event.currentTarget.querySelector('video').pause();
});
$('video-demo').addEventListener('toggle',event=>{
 if(!event.currentTarget.open)event.currentTarget.querySelector('video').pause();
});

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
 animateResponses({end:DRAW,hold:HOLD,draw,button:$('depth-pause'),root:$('depth-columns')});
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
