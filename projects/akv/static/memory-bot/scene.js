// Adapted from the supplied AKV logo-bot v8. Original geometry is preserved;
// drops leave prefix gaps; a separate Repos action shakes and shifts the cache.
// The prototype credits jeremy-prt/bloub for architectural inspiration; no
// upstream implementation or assets are included.
globalThis.AKVMemoryBotScene = (() => {
 'use strict';
 const INK='#f5f5f7', PAPER='#1d1d1f';
 const SOFTNESS=0.42; // Restrained follow-through; 1.0 was the softer v6 treatment.
 const SQUIRCLE_N=4.0; // User-selected soft square. Lower values are rounder.
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
 const mix=(a,b,u)=>a+(b-a)*u;
 const n=v=>Number(v.toFixed(3));
 const OPERATIONS=['Append','Drop','Repos','Drop','Repos','Append'];
 const BOUNDARIES=[0,3,6,9.5,12.5,16,19];
 const CYCLE_DURATION=BOUNDARIES.at(-1);
 function actionAt(time){
  const cycle=Math.floor(time/CYCLE_DURATION),local=time-cycle*CYCLE_DURATION;
  let segment=0;
  while(segment<OPERATIONS.length-1&&local>=BOUNDARIES[segment+1])segment++;
  return {segment,operation:OPERATIONS[segment],local:local-BOUNDARIES[segment],end:cycle*CYCLE_DURATION+BOUNDARIES[segment+1]};
 }
 // Retain the original gestures and easing. Shorten anticipation and holds,
 // give lifts/transfers room to breathe, and bring release into withdrawal.
 // Each pair maps elapsed seconds to the original choreography clock.
 const TIMING={
  Append:[[0,0],[.12,1.05],[.55,1.3],[.65,1.55],[1.11,1.86],[1.19,2.15],[1.6,2.82],[1.64,3.1],[1.78,3.24],[1.81,3.3],[2.25,3.53],[2.48,3.78],[3,5]],
  Drop:[[0,0],[.22,.68],[.65,.96],[.8,1.13],[.85,1.28],[1.23,1.53],[1.33,1.84],[1.79,2.2],[1.87,2.47],[2.2,2.8],[2.7,3.54],[3,5]]
 };
 function choreographyTime(elapsed,operation){
  const keys=TIMING[operation];
  for(let i=1;i<keys.length;i++)if(elapsed<=keys[i][0]){
   const [start,from]=keys[i-1],[end,to]=keys[i];
   return mix(from,to,clamp((elapsed-start)/(end-start)));
  }
  return keys.at(-1)[1];
 }
 const ease={soft:smooth,swift:x=>x<.22?x*x/.22:1-(1-x)**2/.78,out:x=>1-(1-x)**3,in:x=>x*x*x,pop:x=>1-(1-x)**3+Math.sin(x*Math.PI)*.13};
 function at(t,keys){for(let i=1;i<keys.length;i++)if(t<=keys[i][0])return mix(keys[i-1][1],keys[i][1],(ease[keys[i][2]||'soft'])(clamp((t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]))));return keys.at(-1)[1]}
 function pulse(t,start,end){return t>start&&t<end?Math.sin(Math.PI*(t-start)/(end-start))**2:0}
 function sampleRepos(segment,t){
  const shift=63*smooth((t-1.55)/1.15);
  const statics=(segment===2?[256,319]:[256]).map(x=>({x:x-shift,y:225,r:0}));
  // A brief head-led shake travels through the soft body, then settles before
  // retained states change positions. Repos never adds or removes a state.
  const shake=clamp((t-.35)/1.1),envelope=Math.sin(Math.PI*shake)**2;
  return {operation:'Repos',repositioning:true,local:t,segment,adding:false,handSide:0,moving:null,statics,occupied:statics.length,back:false,
   right:{x:384,y:248,r:0},left:{x:128,y:248,r:0},reach:0,grip:0,
   shake,envelope,lean:6*envelope*Math.sin(shake*Math.PI*8-.5),inquis:0,
   focus:.6*pulse(t,.15,3.3),blink:1-.8*pulse(t,.65,1.3),
   gazeX:at(t,[[0,0],[.3,8],[1.55,8],[2.7,-16],[3.2,0],[5,0]]),gazeY:-16*pulse(t,.15,3.3)};
 }
 function sample(time){
  const {segment,local:elapsed,operation}=actionAt(time);
  if(operation==='Repos')return sampleRepos(segment,elapsed);
  const t=choreographyTime(elapsed,operation);
  const adding=operation==='Append',slot=adding?(segment===0?319:256):193,handSide=adding?1:-1;
  const pos=(axis)=>adding?
   at(t,axis==='x'?[[0,342],[1.05,342],[1.3,410,'swift'],[1.55,410],[1.86,slot+16,'swift'],[2.15,slot+16],[2.82,slot],[5,slot]]:[[0,292],[1.05,292],[1.3,225,'swift'],[1.55,225],[1.86,225,'swift'],[2.15,225],[2.82,225],[5,225]]):
   at(t,axis==='x'?[[0,slot],[1.28,slot],[1.53,slot-5,'swift'],[1.84,slot-5],[2.2,102,'swift'],[2.47,102],[2.8,170],[5,170]]:[[0,225],[1.28,225],[1.53,173,'swift'],[1.84,173],[2.2,236,'swift'],[2.47,236],[2.8,292],[5,292]]);
  const turn=adding?at(t,[[0,-12],[1.3,0],[5,0]]):at(t,[[0,0],[1.28,0],[1.53,17,'swift'],[1.84,17],[2.2,12],[5,12]]);
  const moving={x:pos('x'),y:pos('y'),r:turn};
  // Append starts already holding the cache behind the body. Drop keeps that
  // contact all the way inside, without moving an empty hand back to the edge.
  const reach=adding?at(t,[[0,1],[3.3,1],[3.53,0,'swift'],[5,0]]):at(t,[[0,0],[.68,0],[.96,1,'swift'],[5,1]]);
  const grip=adding?at(t,[[0,1],[3.1,1],[3.24,0],[5,0]]):at(t,[[0,0],[.96,0],[1.13,1],[5,1]]);
  const r=turn*Math.PI/180,target={x:moving.x+handSide*19*Math.cos(r)+12*Math.sin(r),y:moving.y+handSide*19*Math.sin(r)-12*Math.cos(r)};
  const hand={x:mix(256+handSide*128,target.x,reach)+handSide*8*Math.sin(Math.PI*reach),y:mix(248,target.y,reach)-12*Math.sin(Math.PI*reach),r:mix(handSide*40,turn,reach)};
  // Drop only removes the selected state. Its gap persists until a separate
  // click starts Repos; retained cache positions never change during Drop.
  const slots=adding?(segment===0?[193,256]:[193]):(segment===1?[256,319]:[256]);
  const statics=slots.map(x=>({x,y:225,r:0}));
  const occupied=statics.length+(adding?(t>=2.82?1:0):(t>=1.53?0:1));
  const back=adding?t<1.55:t>=2.47;
  const handHidden=reach===0||(back&&(adding?t<=1.05:t>=2.8));
  const gazeX=adding?at(t,[[0,0],[.16,-28,'swift'],[.32,-28],[.45,0],[.48,0],[.59,34,'swift'],[1.55,34],[1.79,slot===256?9:30,'swift'],[2.15,slot===256?9:30],[2.82,slot===256?0:25],[3.53,slot===256?0:25],[3.75,0],[5,0]]):at(t,[[0,0],[.15,-25,'swift'],[.32,-25],[.53,slot===256?4:32,'swift'],[1.84,slot===256?4:32],[2.12,34,'swift'],[3.29,34],[3.55,0],[5,0]]);
  const gazeY=adding?at(t,[[0,0],[.4,-8],[.59,-7],[1.45,-7],[1.78,-14,'swift'],[2.15,-14],[2.82,-11],[3.53,-11],[3.75,0],[5,0]]):at(t,[[0,0],[.53,-14],[1.18,-14],[1.46,-26,'swift'],[1.75,-26],[2.12,9],[3.29,9],[3.55,0],[5,0]]);
  const lean=adding?at(t,[[0,0],[.25,-1.4],[.5,-2.7],[1.05,-2.7],[1.3,3.8,'swift'],[1.55,3.8],[1.86,-3.8,'swift'],[2.15,-3.8],[2.82,-1.5],[3.3,-1.5],[3.53,1.3,'swift'],[3.78,0],[5,0]]):at(t,[[0,0],[.3,-1.5],[.6,-3],[1.28,-3],[1.53,4.6,'swift'],[1.84,4.6],[2.2,2.5,'swift'],[2.47,2.5],[2.8,-1.8],[3.06,-1.8],[3.29,1.3,'swift'],[3.54,0],[5,0]]);
  const inquis=adding?.35*pulse(t,1.8,2.2):pulse(t,1.46,1.86);
  const blink=1-.95*Math.max(pulse(t,.34,.48),pulse(t,3.35,3.5));
  return {operation,local:t,elapsed,segment,adding,handSide,handHidden,moving,statics,occupied,back,right:adding?hand:{x:384,y:248,r:0},left:adding?{x:128,y:248,r:0}:hand,reach,grip,focus:Math.min(1,Math.abs(gazeX)/20+Math.abs(gazeY)/20),blink,lean:lean*handSide,gazeX:adding?gazeX:-gazeX,gazeY,inquis};
 }
 function elastic(f){
  if(f.repositioning){
   const wave=f.shake*Math.PI*8,e=f.envelope;
   return {stretch:.022*e*Math.cos(wave),headX:16*e*Math.sin(wave+.6),headY:-2*e*Math.sin(wave*2),bulge:-6*e*Math.cos(wave),flex:0};
  }
  // Keep the placement rebound on real time; the hand's shortened release
  // interval must not squeeze the body's recovery into a single frame.
  const t=f.adding&&f.local>2.82?2.82+f.elapsed-1.6:f.local;
  const spring=(start,amplitude)=>{const u=t-start;return u>0&&u<.65?amplitude*Math.exp(-8*u)*Math.sin(2*Math.PI*1.8*u)*(1-smooth((u-.45)/.2)):0};
  const stretch=f.adding?-.055*pulse(t,.48,1.04)+.065*pulse(t,1.05,1.42)-.085*pulse(t,2.57,2.94)+spring(2.82,.048):-.075*pulse(t,.68,1.28)+.085*pulse(t,1.28,1.73)-.05*pulse(t,2.45,2.9)+spring(2.8,.035);
  const recoil=spring(3.53,.018);
  const headX=f.adding?-11*pulse(t,1.5,2.14)+spring(2.82,8):12*pulse(t,1.2,1.94)-6*pulse(t,1.94,2.5)+spring(2.8,8);
  return {stretch:(stretch+recoil)*SOFTNESS,headX:headX*SOFTNESS*f.handSide,headY:-stretch*55*SOFTNESS,bulge:-stretch*65*SOFTNESS,flex:((f.adding?-8*pulse(t,1.5,2.14):10*pulse(t,1.2,1.94))+spring(f.adding?2.82:2.8,12))*SOFTNESS};
 }
 function bodyPath(e){
  // Original n=4 superellipse geometry: |x/a|^4 + |y/b|^4 = 1.
  // Curved sides remain visible at rest; local deformation lets the top lag behind the base.
  const points=[];
  for(let i=0;i<128;i++){
   const a=i*Math.PI*2/128,c=Math.cos(a),s=Math.sin(a);
   let x=256+128*Math.sign(c)*Math.abs(c)**(2/SQUIRCLE_N),y=280+128*Math.sign(s)*Math.abs(s)**(2/SQUIRCLE_N);
   const upper=1-smooth((y-242)/135),side=Math.sin(Math.PI*(y-152)/256)**2;
   x+=e.headX*(upper-(1-upper)*.18)+Math.sign(x-256)*e.bulge*side;
   y+=e.headY*upper;
   points.push({x,y});
  }
  let d=`M${n(points[0].x)} ${n(points[0].y)}`;
  for(let i=0;i<points.length;i++){
   const a=points[(i+127)%128],b=points[i],c=points[(i+1)%128],v=points[(i+2)%128];
   d+=`C${n(b.x+(c.x-a.x)/6)} ${n(b.y+(c.y-a.y)/6)} ${n(c.x-(v.x-b.x)/6)} ${n(c.y-(v.y-b.y)/6)} ${n(c.x)} ${n(c.y)}`;
  }
  return d+'Z';
 }
 function memory(p){return `<rect x="-21" y="-21" width="42" height="42" rx="8" fill="${INK}" stroke="${PAPER}" stroke-width="4" transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(p.r)})"/>`}
 function arm(hand,side,f,front=false,root=false){
  const reach=f.reach*(side===f.handSide?1:0);if(reach===0)return '';
  const flex=elastic(f).flex;
  const clip=side>0?`<rect x="${n(395-140*reach)}" y="80" width="190" height="240"/>`:`<rect x="-50" y="80" width="${n(167+140*reach)}" height="240"/>`;
  const id=`reveal${side}${root?'root':front?'palm':'arm'}`;
  const p0={x:side>0?334:178,y:304},p1={x:(hand.x+(side>0?334:178))/2+side*(12+flex*.5),y:(304+hand.y)/2+8+flex*.6},p2=hand;
  const join={x:.0484*p0.x+.3432*p1.x+.6084*p2.x,y:.0484*p0.y+.3432*p1.y+.6084*p2.y};
  const start=`<g clip-path="url(#${id})"><defs><clipPath id="${id}">${clip}</clipPath></defs>`;
  if(front)return `${start}<ellipse cx="0" cy="0" rx="15" ry="14" fill="${INK}" stroke="${PAPER}" stroke-width="4" transform="translate(${n(hand.x)} ${n(hand.y)}) rotate(${n(hand.r)})"/><path d="M${n(hand.x)} ${n(hand.y)} Q${n((hand.x+join.x)/2)} ${n((hand.y+join.y)/2)} ${n(join.x)} ${n(join.y)}" stroke="${INK}" stroke-width="15" fill="none" stroke-linecap="round"/></g>`;
  // Two soft curved boundaries form a padded arm, broad where it merges into the body.
  const edges=[[],[]];
  for(let i=0;i<=32;i++){
   const t=i/32,q=1-t,x=q*q*p0.x+2*q*t*p1.x+t*t*p2.x,y=q*q*p0.y+2*q*t*p1.y+t*t*p2.y;
   const dx=2*q*(p1.x-p0.x)+2*t*(p2.x-p1.x),dy=2*q*(p1.y-p0.y)+2*t*(p2.y-p1.y),len=Math.hypot(dx,dy)||1,w=25-14*t**.72;
   edges[0].push(`${n(x-dy/len*w)} ${n(y+dx/len*w)}`);edges[1].push(`${n(x+dy/len*w)} ${n(y-dx/len*w)}`);
  }
  // The first quarter is buried behind the foreground body, never over the white recess.
  const lo=root?0:8,hi=root?9:33;
  const left=edges[0].slice(lo,hi),right=edges[1].slice(lo,hi).reverse();
  const d=`M${left.join('L')}L${right.join('L')}Z`;
  if(root)return `${start}<path d="${d}" fill="${INK}"/></g>`;
  return `${start}<path d="${d}" fill="${INK}"/><path d="M${edges[0].slice(12).join('L')}M${edges[1].slice(12).reverse().join('L')}" fill="none" stroke="${PAPER}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>`;
 }
 function eye(x,side,f){
  const focus=f.focus;
  // Both eyes always use the same width, height and synchronized blink.
  const w=13,h=(22.5-focus*1.5+f.inquis*2)*f.blink;
  const top=-h,bot=h;
  // Shared pill contour; direction comes from position and mirrored tilt, never unequal sizing.
  const d=`M${-w} 0 C${-w} ${n(top)} ${n(-w*.52)} ${n(top-3)} 0 ${n(top-3)} C${n(w*.52)} ${n(top-3)} ${w} ${n(top)} ${w} 0 C${w} ${n(bot)} ${n(w*.45)} ${n(bot)} 0 ${n(bot)} C${n(-w*.45)} ${n(bot)} ${-w} ${n(bot)} ${-w} 0Z`;
  const angle=side*(-focus*5-f.inquis*7);
  return `<path d="${d}" fill="${PAPER}" transform="translate(${n(256+f.gazeX+(x-256)*(1-.17*Math.abs(f.gazeX)/34))} ${n(327+f.gazeY)}) rotate(${n(angle)})"/>`;
 }
 function contents(time,gaze=null){
  const f=sample(time);
  if(gaze){f.gazeX=gaze.x;f.gazeY=gaze.y;f.focus=Math.min(1,Math.hypot(gaze.x,gaze.y)/34)}
  const e=elastic(f),head=`translate(${n(e.headX)} ${n(e.headY)})`;
  const shell=`<path d="${bodyPath(e)}" fill="${INK}"/>`;
  const windowShape=`<rect x="154" y="186" width="204" height="76" rx="25" fill="${PAPER}"/>`;
  const face=`<g transform="translate(${n(e.headX*.3)} ${n(e.headY*.18)})">${eye(202,-1,f)}${eye(310,1,f)}</g>`;
  const hand=f.handSide>0?f.right:f.left,visible=f.moving&&!f.handHidden;
  const root=visible?arm(hand,f.handSide,f,false,true):'';
  // Cache visibility is independent of the hand: placed cache stays after
  // withdrawal, and selected cache stays visible before the hand reaches it.
  const carry=(visible?arm(hand,f.handSide,f):'')+(f.moving?memory(f.moving):'')+(visible?arm(hand,f.handSide,f,true):'');
  const layers=`<g transform="${head}">${root}</g>${f.back?`<g transform="${head}">${carry}</g>`:''}${shell}<g transform="${head}">${windowShape}${f.statics.map(memory).join('')}${f.back?'':carry}</g>${face}`;
  return `<g transform="translate(256 280) rotate(${n(f.lean)}) scale(${n(1/(1+e.stretch))} ${n(1+e.stretch)}) translate(-256 -280)">${layers}</g>`;
 }
 function svg(time=0){return `<svg xmlns="http://www.w3.org/2000/svg" width="370" height="325" viewBox="90 110 370 325" role="img" aria-label="AKV memory bot">${contents(time)}</svg>`}
 return { sample, contents, svg, actionAt };
})();
