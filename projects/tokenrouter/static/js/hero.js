import {roadNetwork,pointAt,createRoadMotion,roadMotionAt} from './model.js';

// Clockwise from the top: blue, indigo, plum, rose, copper, ochre, green, teal.
const portHues=[250,285,325,15,55,95,150,195];
function requestColor(road,progress) {
  const start=portHues[road.origin],end=portHues[road.destination];
  const delta=((end-start+540)%360)-180;
  // Keep both branches of each port its fixed color. Only distance along the
  // ring blends the entry hue into the exit hue, independent of token speed.
  const ringProgress=road.gates
    ?(progress*road.travel.length-road.gates.ringStart)/(road.gates.ringEnd-road.gates.ringStart)
    :progress;
  const hue=(start+delta*Math.max(0,Math.min(1,ringProgress)))*Math.PI/180;
  const lightness=.62,chroma=.11,a=chroma*Math.cos(hue),b=chroma*Math.sin(hue);
  // Interpolate hue at constant OKLCH lightness/chroma, then convert to sRGB.
  const l=(lightness+.3963377774*a+.2158037573*b)**3;
  const m=(lightness-.1055613458*a-.0638541728*b)**3;
  const s=(lightness-.0894841775*a-1.291485548*b)**3;
  return [4.0767416621*l-3.3077115913*m+.2309699292*s,
    -1.2684380046*l+2.6097574011*m-.3413193965*s,
    -.0041960863*l-.7034186147*m+1.707614701*s]
    .map(v=>Math.round(255*Math.max(0,Math.min(1,v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055)))).join(',');
}

function timeAtDistance(motion,distance) {
  let low=0,high=motion.duration;
  for(let i=0;i<24;i++) {
    const mid=(low+high)/2;
    if(roadMotionAt(motion,mid).distance<distance)low=mid;else high=mid;
  }
  return (low+high)/2;
}

export function initRoads() {
  const canvas=document.querySelector('#routing-roads');
  const ctx=canvas.getContext('2d');
  const hero=canvas.parentElement,control=document.querySelector('#road-motion');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  if(!ctx){control.hidden=true;return;}
  const backdrop=document.createElement('canvas'),backdropContext=backdrop.getContext('2d');
  let width=0,height=0,network,roads=[],travelers=[],temporary=[],feedback=[],nextEntry=[],burst=0,press=null;
  let frame=0,visible=true,paused=motion.matches,clock=1700,last=0;
  function resize() {
    const now=clock/1000;
    const pending=temporary.map(request=>({...request,delay:Math.max(0,request.start-now),
      progress:roadMotionAt(request.road.motion,now-request.start).distance/request.road.travel.length}));
    width=hero.clientWidth;height=hero.clientHeight;
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    backdrop.width=canvas.width;backdrop.height=canvas.height;
    backdropContext?.setTransform(dpr,0,0,dpr,0,0);
    network=roadNetwork(width,height);
    const count=network.ports.length;
    roads=network.roads.map(road=>{
      const prepared={...road,motion:createRoadMotion(road,width<600)};
      // Click traffic begins just beyond the visible edge, never on the ring.
      const entry=road.travel.points.findIndex(([x,y])=>x>=-12&&x<=width+12&&y>=-12&&y<=height+12);
      prepared.entryTime=timeAtDistance(prepared.motion,road.travel.lengths[Math.max(0,entry)]);
      return prepared;
    });
    travelers=roads.filter(({origin,destination})=>destination===(origin+3)%count
      ||(origin%2===0&&destination===(origin+5)%count));
    temporary=pending.map(request=>{
      const road=roads.find(r=>r.origin===request.road.origin&&r.destination===request.road.destination);
      return {road,start:request.delay>0?now+request.delay:now-timeAtDistance(road.motion,request.progress*road.travel.length)};
    });
    nextEntry=Array(count).fill(now);
    temporary.forEach(request=>{
      const origin=request.road.origin;
      nextEntry[origin]=Math.max(nextEntry[origin],request.start+request.road.entryTime);
    });
    if(backdropContext)drawRoads(backdropContext);
    draw();
  }
  function drawRoads(ctx) {
    const addLine=points=>points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.clearRect(0,0,width,height);ctx.lineCap='round';ctx.lineJoin='round';
    const {roadWidth,laneWidth,trunkWidth}=network;
    // Paint all borders first, then the surfaces so the joins stay seamless.
    for(const [color,border] of [['#e0e6ee',1.3],['#f3f5f8',0]]) {
      ctx.strokeStyle=color;
      ctx.beginPath();addLine(network.loop);ctx.lineWidth=roadWidth+border;ctx.stroke();
      ctx.beginPath();network.ports.forEach(port=>{addLine(port.incoming.points);addLine(port.outgoing.points);});
      ctx.lineWidth=laneWidth+border;ctx.stroke();
      ctx.beginPath();network.ports.forEach(port=>addLine(port.trunk));
      ctx.lineWidth=trunkWidth+border;ctx.stroke();
    }
    ctx.beginPath();addLine(network.loop);
    network.ports.forEach(port=>addLine(port.trunk.slice(0,-8)));
    ctx.setLineDash([4,14]);ctx.strokeStyle='rgba(119,143,176,.31)';ctx.lineWidth=.9;ctx.stroke();ctx.setLineDash([]);
  }
  function drawRequest(road,time,segments) {
    if(time<0||time>=road.motion.duration)return;
    const {motion}=road;
    const {distance}=roadMotionAt(motion,time),fraction=distance/road.travel.length;
    // Like the hub, the trail stretches during acceleration and gathers on braking.
    const past=roadMotionAt(motion,time-.23).distance;
    const trailLength=Math.min(width<600?44:64,Math.max(6,distance-past));
    const color=requestColor(road,fraction);
    for(let trail=segments;trail>0;trail--) {
      const from=Math.max(0,fraction-trail/segments*trailLength/road.travel.length);
      const to=Math.max(0,fraction-(trail-1)/segments*trailLength/road.travel.length);
      const a=pointAt(road.travel,from),b=pointAt(road.travel,to);
      const trailColor=requestColor(road,(from+to)/2);
      ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);
      ctx.strokeStyle=`rgba(${trailColor},${(1-trail/(segments+1))*.24})`;ctx.lineWidth=2.6;ctx.stroke();
    }
    const p=pointAt(road.travel,fraction);
    ctx.beginPath();ctx.arc(...p,3.1,0,Math.PI*2);ctx.fillStyle=`rgba(${color},.62)`;ctx.fill();
    ctx.beginPath();ctx.arc(...p,7,0,Math.PI*2);ctx.fillStyle=`rgba(${color},.04)`;ctx.fill();
  }
  function draw() {
    ctx.clearRect(0,0,width,height);ctx.lineCap='round';ctx.lineJoin='round';
    // Road geometry is static between resizes; only requests need repainting.
    if(backdropContext)ctx.drawImage(backdrop,0,0,width,height);else drawRoads(ctx);
    const now=clock/1000;
    feedback=feedback.filter(effect=>now-effect.start<1.25);
    feedback.forEach(effect=>{
      const age=now-effect.start,t=Math.min(1,age/1.1);
      const color=requestColor({origin:effect.port,destination:effect.port},0);
      const radius=9+47*(1-(1-t)**3),alpha=1-t*t*(3-2*t);
      // Keep the local acknowledgement distinct from the network-wide traffic response.
      ctx.beginPath();ctx.arc(effect.x*width,effect.y*height,radius,0,Math.PI*2);
      ctx.fillStyle=`rgba(${color},${.065*alpha})`;ctx.fill();
      ctx.strokeStyle=`rgba(${color},${.55*alpha})`;ctx.lineWidth=1.8;ctx.stroke();
    });
    // Every click adds traffic at every entrance. Retrigger one shared pulse rather
    // than stacking road highlights into an opaque fill during repeated clicks.
    const latest=feedback.at(-1);
    if(latest) {
      const alpha=.24*(1-(now-latest.start)/1.25)**2;
      network.ports.forEach((port,index)=>{
        const color=requestColor({origin:index,destination:index},0);
        ctx.beginPath();port.incoming.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
        ctx.strokeStyle=`rgba(${color},${alpha})`;
        ctx.lineWidth=network.laneWidth;ctx.stroke();
      });
    }
    temporary=temporary.filter(request=>now-request.start<request.road.motion.duration);
    const active=travelers.length+temporary.filter(request=>now>=request.start).length;
    // Scale tail detail, not the number of admitted requests, under heavy clicking.
    const segments=Math.max(2,Math.min(20,Math.floor(900/active)));
    travelers.forEach((road,index)=>drawRequest(road,(now+index*.38196601125*road.motion.duration)%road.motion.duration,segments));
    temporary.forEach(request=>drawRequest(request.road,now-request.start,segments));
  }
  function addRequests(x,y) {
    if(paused||!visible||document.hidden)return;
    const nearest=network.ports.reduce((best,port,index)=>{
      const [px,py]=port.surface.at(-1),[bx,by]=network.ports[best].surface.at(-1);
      return Math.hypot(px-x,py-y)<Math.hypot(bx-x,by-y)?index:best;
    },0);
    feedback.push({x:x/width,y:y/height,port:nearest,start:clock/1000});
    feedback=feedback.slice(-6);
    const count=network.ports.length,amount=width<600?12:16;
    for(let i=0;i<amount;i++) {
      const origin=(i+nearest)%count,destination=(origin+2+(i+burst)%(count-3))%count;
      const road=roads.find(r=>r.origin===origin&&r.destination===destination);
      const delay=Math.floor(i/count)*.24+(i%count)*.035;
      // Every click is admitted. Space arrivals so repeated bursts remain visible
      // instead of drawing new requests directly over earlier ones at the edge.
      const arrival=Math.max(clock/1000+delay,(nextEntry[origin]??0)+.085);
      nextEntry[origin]=arrival;
      temporary.push({road,start:arrival-road.entryTime});
    }
    burst=(burst+1)%count;
    draw();
  }
  function tick(now) {
    frame=0;if(last)clock+=Math.min(now-last,60);last=now;draw();
    if(visible&&!document.hidden&&!paused)frame=requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);frame=0;last=0;
    if(paused||!visible||document.hidden)feedback=[];
    control.setAttribute('aria-pressed',String(paused));
    control.setAttribute('aria-label',paused?'Play background animation':'Pause background animation');
    control.querySelector('path').setAttribute('d',paused?'m9 6 9 6-9 6Z':'M9 7v10M15 7v10');
    if(visible&&!document.hidden&&!paused)frame=requestAnimationFrame(tick);
  }
  control.addEventListener('click',()=>{paused=!paused;sync();draw();});
  const interactive=target=>target instanceof Element&&target.closest('a,button,input,select,textarea,summary,video,[role="button"],[contenteditable="true"]');
  hero.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0||interactive(event.target)){press=null;return;}
    press={id:event.pointerId,x:event.clientX,y:event.clientY,scroll:window.scrollY,time:performance.now()};
  },{passive:true});
  hero.addEventListener('pointermove',event=>{
    if(press&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>10)press=null;
  },{passive:true});
  hero.addEventListener('pointerup',event=>{
    const down=press;press=null;
    if(!down||event.pointerId!==down.id||interactive(event.target)||performance.now()-down.time>650
      ||Math.hypot(event.clientX-down.x,event.clientY-down.y)>10||Math.abs(window.scrollY-down.scroll)>8
      ||(window.getSelection()?.toString()&&Math.hypot(event.clientX-down.x,event.clientY-down.y)>2))return;
    const rect=hero.getBoundingClientRect();
    addRequests(event.clientX-rect.left,event.clientY-rect.top);
  },{passive:true});
  hero.addEventListener('pointercancel',()=>{press=null;});
  hero.addEventListener('pointerleave',()=>{press=null;});
  motion.addEventListener('change',()=>{paused=motion.matches;sync();draw();});
  document.addEventListener('visibilitychange',sync);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0}).observe(hero);
  new ResizeObserver(resize).observe(hero);resize();sync();
}
