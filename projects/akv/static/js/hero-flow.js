/* Paired text/cache traces. Timing illustrates behavior, not measured speed. */
(() => {
  const hero = document.querySelector('.akv-hero');
  const canvas = document.getElementById('akv-hero-canvas');
  const ctx = canvas?.getContext('2d');
  if (!hero || !ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const status = document.getElementById('hero-flow-status');
  const gray = '145,153,175', purple = '124,105,182';
  const duration = 18000;
  let width=0,height=0,time=0,last=null,raf=null,visible=false,cuts=[],hitAreas=[];
  const clamp=x=>Math.max(0,Math.min(1,x));
  const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  const progress=(t,a,b)=>ease((t-a)/(b-a));
  function groups() {
    const layouts=width<600
      ? [[-.12,.13,.52,'cache',1700],[.76,.27,.43,'context',6700],
         [-.27,.48,.48,'context',11300],[.77,.74,.46,'cache',12100],[.05,.94,.52,'cache',3900]]
      : [[-.04,.14,.27,'cache',800],[.77,.12,.25,'context',5900],
         [-.09,.29,.29,'context',11200],[.84,.28,.24,'cache',3200],
         [-.14,.45,.29,'cache',14300],[.77,.45,.30,'context',8700],
         [-.08,.61,.25,'context',4100],[.87,.60,.25,'cache',12800],
         [.02,.78,.29,'cache',7200],[.77,.79,.26,'context',15500],
         [.15,.94,.28,'context',10200],[.57,.95,.29,'cache',2100]];
    return layouts.map(([x,y,span,mode,offset],id)=>({x:x*width,y:y*height,span:span*width,mode,offset,id,
      rise:[-38,25,-62,40,-20,55][id%6]*(width<600?.65:1),
      bend:[19,-27,11,32,-17,24][id%6],gap:width<600?10:12+id%3}));
  }
  // Varied rising, falling and S-shaped paths; paired strands share exactly one geometry.
  function point(group,u,cache=false) {
    return {x:group.x+u*group.span,
      y:group.y+u*group.rise+Math.sin(u*Math.PI*(group.id%3===0?2:1))*group.bend+(cache?group.gap:0)};
  }

  function bead(p,color,alpha,r=2.8) {
    if(alpha<.005)return;
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,20);
    g.addColorStop(0,`rgba(${color},${alpha*.22})`);g.addColorStop(1,`rgba(${color},0)`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,20,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(${color},${alpha})`;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
  }
  function segment(a,b,color,alpha) {
    if(alpha<.005)return;
    ctx.strokeStyle=`rgba(${color},${alpha})`;ctx.lineWidth=1.25;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  function gap(u,a,b) {return progress(u,a,a+.016)*(1-progress(u,b-.016,b));}
  function draw() {
    ctx.clearRect(0,0,width,height);hitAreas=[];if(!width)return;
    for(const group of groups()) {
    const side=group.mode;
    const clock=reduced.matches?9000:time,t=(clock+group.offset)%duration;
    const generation=Math.floor((clock+group.offset)/duration);
    const fade=progress(t,0,700)*(1-progress(t,16800,18000));
    const initial=.15+.51*clamp(t/4700);
    const continuing=.66+.43*clamp((t-4700)/10800);
    const ordinary=t<4700?initial:continuing;
    const deleted=progress(t,4700,5500);
    // The context head stops, retreats to the edit, then replays the retained suffix.
    let rebuiltHead;
    if(t<5700)rebuiltHead=t<4700?initial:.66;
    else if(t<6800)rebuiltHead=.66-(.66-.31)*progress(t,5700,6800);
    else if(t<10800)rebuiltHead=.31+(.66-.31)*clamp((t-6800)/4000);
    else rebuiltHead=.66+.43*clamp((t-10800)/5200);
    hero.dataset.flowPhase=reduced.matches?'static':'staggered';
      for(const isCache of [false,true]) {
        const color=isCache?purple:gray;
        const head=side==='cache'?ordinary:rebuiltHead;
        function alpha(u,p) {
          let a=1;
          if(side==='cache'&&isCache) {
            a*=1-deleted*gap(u,.25,.36);
            a*=1-progress(t,8700,9500)*gap(u,.47,.57);
            a*=1-progress(t,12200,13000)*gap(u,.71,.79);
          }
          if(side==='context') {
            // Both strands depict processing progress, not persistence of source text.
            // The head trims their common suffix during retreat and redraws it on replay.
            a*=1-deleted*gap(u,.25,.31);
          }
          if(isCache)for(const cut of cuts)if(cut.group===group.id&&cut.generation===generation) {
            const dist=Math.hypot(p.x-cut.x,p.y-cut.y);
            a*=1-(1-ease((dist-12)/22))*(reduced.matches?1:progress(clock,cut.at,cut.at+650));
          }
          return a*fade;
        }
        // Both context trails end at the processing heads, including during retreat.
        const extent=head;
        const count=85;
        for(let j=1;j<=count;j++) {
          const u=extent*j/count,prev=point(group,extent*(j-1)/count,isCache),p=point(group,u,isCache);
          segment(prev,p,color,(isCache?.57:.35)*alpha(u,p));
        }
        for(let u=.10;u<extent;u+=.14) {
          const p=point(group,u,isCache);const a=alpha(u,p);
          ctx.fillStyle=`rgba(${color},${a*(isCache?.55:.32)})`;
          ctx.beginPath();ctx.arc(p.x,p.y,isCache?1.25:.9,0,Math.PI*2);ctx.fill();
        }
        // Both heads stay visible while their trails are erased and redrawn.
        const p=point(group,head,isCache);
        bead(p,color,fade*(isCache?.95:.65),isCache?2.6:2.1);
        if(side==='cache'&&isCache&&fade>.4)for(let u=.04;u<head;u+=.035) {
          const q=point(group,u,true);
          if(alpha(u,q)>.4)hitAreas.push({...q,group:group.id,generation});
        }
      }
    }
  }
  function resize(){const r=hero.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);cuts=[];draw();}
  function stop(){cancelAnimationFrame(raf);raf=null;last=null;}
  function tick(now){raf=null;if(reduced.matches||!visible||document.hidden){last=null;return;}if(last!==null&&now-last<1000/60-.5){raf=requestAnimationFrame(tick);return;}if(last!==null)time+=Math.min(now-last,100);last=now;cuts=cuts.filter(cut=>time-cut.at<duration);draw();raf=requestAnimationFrame(tick);}
  function play(){if(raf===null&&!reduced.matches&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
  hero.addEventListener('click',event=>{
    if(event.target.closest('a,button,summary'))return;
    const r=canvas.getBoundingClientRect(),p={x:event.clientX-r.left,y:event.clientY-r.top};
    // Only visible, retained cache segments can be pruned by a click.
    let nearest=null;
    for(const q of hitAreas){const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<20&&(!nearest||d<nearest.d))nearest={...q,d};}
    if(!nearest)return;
    cuts.push({...nearest,at:reduced.matches?9000:time});cuts=cuts.slice(-12);
    if(status)status.textContent='Dropped a local cache segment; text and forward progress are retained.';draw();
  });
  reduced.addEventListener('change',()=>{stop();draw();play();});
  document.addEventListener('visibilitychange',()=>document.hidden?stop():play());
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?play():stop();},{threshold:.05}).observe(hero);
  new ResizeObserver(resize).observe(hero);window.addEventListener('pagehide',stop);window.addEventListener('pageshow',play);resize();
})();
