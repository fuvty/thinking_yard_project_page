// One click performs Append, Drop, or Repos. Queue complete actions to keep hand/tile contact
// continuous even when the visitor clicks repeatedly.
globalThis.AKVMemoryBotPlayback = (reduced = false) => {
  const state = { time:0, running:false, queued:0, reduced };
  const boundary = () => globalThis.AKVMemoryBotScene.actionAt(state.time).end;
  function advance() {
    if (state.reduced) { state.time = boundary(); return; }
    if (state.running) state.queued++;
    else state.running = true;
  }
  function tick(seconds) {
    if (state.reduced || !state.running) return;
    const end = boundary();
    state.time = Math.min(end, state.time + seconds);
    if (state.time === end) {
      state.running = false;
      if (state.queued) { state.queued--; state.running = true; }
    }
  }
  function setReduced(reduced) {
    state.reduced = reduced;
    if (reduced && state.running) {
      for (let remaining = state.queued + 1; remaining > 0; remaining--) state.time = boundary();
      state.running = false; state.queued = 0;
    }
  }
  return { state, advance, tick, setReduced };
};

(() => {
  if (typeof document === 'undefined') return;
  const button = document.getElementById('memory-bot-action');
  if (!button) return;
  const drawing = document.getElementById('memory-bot-drawing');
  const caption = document.getElementById('memory-bot-state');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const playback = globalThis.AKVMemoryBotPlayback(motion.matches);
  const state = playback.state;
  const gaze = { x:0, y:0 }, target = { x:0, y:0 };
  let pointerActive = false, visible = false, frame = null, last = null, painted = null;
  const eyesMoving = () => Math.hypot(gaze.x - target.x, gaze.y - target.y) > .05;
  function paint() {
    const eyePose = pointerActive || Math.hypot(gaze.x, gaze.y) > .05 ? gaze : null;
    const key = `${state.time}:${eyePose ? `${gaze.x.toFixed(2)},${gaze.y.toFixed(2)}` : 'story'}`;
    if (painted !== key) {
      drawing.innerHTML = globalThis.AKVMemoryBotScene.contents(state.time, eyePose);
      painted = key;
    }
    const pose = globalThis.AKVMemoryBotScene.sample(state.time);
    const operation = state.running ? `${pose.operation} · ` : '';
    caption.textContent = `${operation}${pose.occupied} active cache${pose.occupied === 1 ? '' : 's'}`;
    button.setAttribute('aria-label', `Run the next cache operation${state.queued ? ` (${state.queued} queued)` : ''}`);
  }
  function schedule() {
    if (frame === null && visible && !document.hidden && !state.reduced && (state.running || eyesMoving())) frame = requestAnimationFrame(tick);
    else if (frame === null) last = null;
  }
  function tick(now) {
    frame = null;
    if (!visible || document.hidden) { last = null; return; }
    if (last === null) last = now;
    if (now - last >= 1000 / 30) {
      const seconds = Math.min(.1, (now - last) / 1000);
      playback.tick(seconds);
      const follow = 1 - Math.exp(-seconds / .095);
      for (const axis of ['x', 'y']) gaze[axis] += (target[axis] - gaze[axis]) * follow;
      if (!eyesMoving()) { gaze.x = target.x; gaze.y = target.y; }
      last = now;
      paint();
    }
    schedule();
  }
  function suspend() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = last = null;
  }
  button.addEventListener('click', () => {
    playback.advance();
    if (!state.reduced) button.animate([{transform:'scale(1)'},{transform:'scale(1.025)'},{transform:'scale(1)'}], {duration:280,easing:'ease-out'});
    paint(); schedule();
  });
  document.addEventListener('pointermove', event => {
    if (!visible || state.reduced || event.pointerType === 'touch') return;
    const bounds = button.getBoundingClientRect();
    const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
    target.x = clamp((event.clientX - bounds.left - bounds.width * 166 / 370) * .14, 34);
    target.y = clamp((event.clientY - bounds.top - bounds.height * 217 / 325) * .11, 22);
    pointerActive = true;
    schedule();
  }, { passive:true });
  document.addEventListener('pointerleave', () => { target.x = target.y = 0; pointerActive = false; schedule(); });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    suspend(); schedule();
  }).observe(button);
  document.addEventListener('visibilitychange', () => { suspend(); schedule(); });
  motion.addEventListener('change', () => {
    playback.setReduced(motion.matches);
    gaze.x = gaze.y = target.x = target.y = 0;
    pointerActive = false;
    suspend(); paint(); schedule();
  });
  paint();
  document.getElementById('memory-bot-fallback').hidden = true;
  document.getElementById('memory-bot-scene').removeAttribute('hidden');
  button.disabled = false;
})();
