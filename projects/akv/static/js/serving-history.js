(() => {
  const translate = globalThis.SiteI18n?.t || ((text, values = {}) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match));
  const figure=document.getElementById('radix-tree');
  const renderer=window.AKVHistoryScene;
  if(!figure || !renderer) return;
  const animation=figure.querySelector('#history-animation');
  const scene=figure.querySelector('#history-trajectories [data-history-scene]');
  const tree=figure.querySelector('#history-tree [data-history-scene]');
  const toggle=figure.querySelector('#history-toggle');
  const replay=figure.querySelector('#history-replay');
  const stages=[...figure.querySelectorAll('[data-history-stage]')];
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  // Give each attention, fill and drop transition more time to read.
  const playbackRate=.6;
  let paused=motion.matches, elapsed=paused?23:0, visible=false;
  let request=null, previous=null, painted=null;
  function draw() {
    const frame=renderer.frame(elapsed);
    scene.innerHTML=renderer.trajectories(elapsed);
    tree.innerHTML=renderer.tree(elapsed);
    // A short fade separates loops; no backwards traversal is implied.
    animation.style.opacity=String(elapsed>27.4?Math.max(0,(28-elapsed)/.6):Math.min(1,elapsed/.35+.2));
    stages.forEach((button,index) => {
      if(index===frame.stage) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
      const stage=renderer.stages[index];
      const progress=Math.max(0,Math.min(1,(elapsed-stage.start)/(stage.end-stage.start)));
      button.style.setProperty('--history-progress',progress.toFixed(3));
    });
    figure.dataset.historyStage=String(frame.stage);
    figure.dataset.historyPaused=String(paused);
  }
  function controls() {
    toggle.disabled = motion.matches;
    toggle.setAttribute('aria-pressed',String(!paused && !motion.matches));
    toggle.setAttribute('aria-label',translate('{action} cache-history animation', {action: translate(paused ? 'Play' : 'Pause')}));
    toggle.title = toggle.getAttribute('aria-label');
  }
  function tick(now) {
    request=null;
    if(previous!==null) elapsed=(elapsed+(now-previous)/1000*playbackRate)%renderer.duration;
    previous=now;
    // Thirty frames per second is sufficient for these slow vector transitions.
    if(painted===null || now-painted>=1000/30) { draw(); painted=now; }
    request=requestAnimationFrame(tick);
  }
  function schedule() {
    if(request!==null) cancelAnimationFrame(request);
    request=null; previous=null; painted=null;
    if(!paused && visible && !document.hidden) request=requestAnimationFrame(tick);
  }
  toggle.addEventListener('click',()=>{ paused=!paused; controls(); draw(); schedule(); });
  replay.addEventListener('click',()=>{
    elapsed=motion.matches?23:0; paused=motion.matches; controls(); draw(); schedule();
  });
  stages.forEach((button,index)=>button.addEventListener('click',()=>{
    elapsed=motion.matches?renderer.stages[index].still:renderer.stages[index].start;
    // Compare is a stable inspection view. Other chapters play from their start.
    paused=motion.matches || index===3;
    controls(); draw(); schedule();
  }));
  motion.addEventListener('change',()=>{
    paused=motion.matches; elapsed=paused?23:0; controls(); draw(); schedule();
  });
  document.addEventListener('visibilitychange',schedule);
  // Do not consume the opening scene before the drawing is on screen.
  new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting; schedule();
  },{threshold:.12}).observe(animation);
  figure.querySelector('.akv-history-fallback').hidden=true;
  figure.querySelector('.akv-history-playback').hidden=false;
  figure.querySelector('.akv-history-stages').hidden=false;
  animation.hidden=false;
  controls(); draw(); schedule();
})();
