// Shared lifecycle for explanatory animations: once on entry, pause off-screen,
// explicit replay/scrubbing, and static snapshots when reduced motion is enabled.
export function createPlayback(element,{duration=10000,render,label,range=null}) {
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let progress=motion.matches?1:0,playing=!motion.matches,visible=false,frame=0,last=0,rendered=false;
  const button=element.querySelector('[data-playback]');
  function draw() {render(progress);rendered=true;if(range)range.value=String(Math.round(progress*1000));}
  function update() {
    const active=playing&&visible&&!document.hidden&&!motion.matches;
    button.textContent=motion.matches?(progress>=1?'Restart':'Show result'):(playing&&progress<1?'Pause':progress>=1?'Replay':'Play');
    button.setAttribute('aria-label',`${button.textContent} ${label}`);
    button.setAttribute('aria-pressed',String(playing&&progress<1&&!motion.matches));
    cancelAnimationFrame(frame);frame=0;last=0;
    if(active)frame=requestAnimationFrame(tick);
  }
  function tick(now) {
    frame=0;if(last)progress=Math.min(1,progress+(now-last)/duration);last=now;draw();
    if(progress>=1){playing=false;update();}
    else if(playing&&visible&&!document.hidden&&!motion.matches)frame=requestAnimationFrame(tick);
  }
  button.addEventListener('click',()=>{
    if(motion.matches){progress=progress>=1?0:1;playing=false;draw();update();return;}
    if(progress>=1)progress=0;
    playing=!playing;draw();update();
  });
  range?.addEventListener('input',()=>{progress=Number(range.value)/1000;playing=false;draw();update();});
  document.addEventListener('visibilitychange',update);
  motion.addEventListener('change',()=>{playing=false;if(motion.matches)progress=1;draw();update();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.18;if(!rendered)draw();update();},{threshold:[0,.18]}).observe(element);
  draw();update();
  return {
    restart(){progress=motion.matches?1:0;playing=!motion.matches;draw();update();},
    seek(value){progress=Math.max(0,Math.min(1,value));playing=false;draw();update();},
    refresh:draw,
    setDuration(value){duration=value;},
    get progress(){return progress;}
  };
}
