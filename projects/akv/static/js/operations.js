(() => {
  const translate = globalThis.SiteI18n?.t || ((text, values = {}) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match));
  const scene = document.getElementById('operation-scene');
  const playback = document.getElementById('operation-playback');
  if (!scene || !playback) return;
  const details = scene.closest('details');
  const caption = document.getElementById('operation-caption');
  const selectors = [...document.querySelectorAll('[data-operation]')];
  const tokens = [...scene.querySelectorAll('.akv-cache-row:first-child .akv-block')];
  const entries = [...scene.querySelectorAll('.akv-live .akv-block')];
  const droppedIndex = 1; // B leaves a gap between A and C.
  const copy = {
    append: translate('<strong data-emphasis="append-operation">Append.</strong> Compute new tokens against the active cache, append their KV states, and advance the logical sequence and encoding positions.'),
    drop: translate('<strong data-emphasis="drop-operation">Drop.</strong> Remove selected KV entries from future attention without recomputing retained states. The logical token sequence, retained positions, and next encoding position remain unchanged.'),
    repos: translate('<strong data-emphasis="repos-operation">Repos.</strong> Re-encode retained keys at consecutive positions starting from zero, in logical token order, and continue new tokens after them. Values and previously computed hidden states remain unchanged.')
  };
  const nextPosition = document.createElement('p');
  nextPosition.className = 'akv-operation-next';
  nextPosition.innerHTML = translate('Next position: <span>4</span>');
  caption.before(nextPosition);
  scene.classList.add('akv-operation-animated');
  const states = entries.map((entry, index) => {
    entry.innerHTML = `<span class="akv-operation-state"><span class="akv-operation-key">K<small><span class="akv-position-old">${translate('pos {position}', {position: index})}</span><span class="akv-position-new">${translate('pos {position}', {position: index > droppedIndex ? index - 1 : index})}</span></small></span><span class="akv-operation-value">V</span></span>`;
    return entry.querySelector('.akv-operation-state');
  });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let operation = 'append', paused = motion.matches, elapsed = paused ? 4 : 0;
  let visible = false, frame = null, previous = null;
  const smooth = (time, start, duration) => {
    const x = Math.max(0, Math.min(1, (time - start) / duration));
    return x * x * (3 - 2 * x);
  };
  function render() {
    const append = operation === 'append', repos = operation === 'repos';
    const arrival = append ? smooth(elapsed, .45, .55) : 1;
    const fill = append ? smooth(elapsed, 1.25, .9) : 1;
    const drop = operation === 'drop' ? smooth(elapsed, 1, .85) : repos ? 1 : 0;
    const encoding = repos && elapsed >= 1.35 ? 1 : 0;
    const emphasis = repos ? motion.matches ? 1 : smooth(elapsed, 1.15, .2) * (1 - smooth(elapsed, 2.85, .6)) : 0;
    tokens[3].style.opacity = arrival;
    tokens[3].style.transform = `translateY(${(1 - arrival) * 8}px)`;
    tokens[3].querySelector('small').hidden = !append;
    entries.forEach((entry, index) => {
      const inactive = index === droppedIndex ? drop : 0;
      // Repos changes encoded positions, not the depicted memory locations.
      entry.style.transform = 'none';
      entry.style.opacity = index === 3 && append ? smooth(elapsed, 1.05, .2) : 1;
      entry.classList.toggle('is-dropped', inactive > .8);
      states[index].style.opacity = 1 - .85 * inactive;
      states[index].style.clipPath = index === 3 && append ? `inset(0 ${(1 - fill) * 100}% 0 0)` : 'none';
      entry.style.setProperty('--position-change', index > droppedIndex ? encoding : 0);
      entry.style.setProperty('--position-emphasis', index > droppedIndex ? emphasis : 0);
    });
    nextPosition.querySelector('span').textContent = String(append ? (fill === 1 ? 4 : 3) : encoding ? 3 : 4);
    nextPosition.style.setProperty('--position-emphasis', emphasis);
    scene.dataset.progress = String(elapsed);
  }
  function updateControl() {
    playback.textContent = paused ? translate('Play') : translate('Pause');
    playback.setAttribute('aria-label', translate('{action} {operation} animation', {action: translate(paused ? 'Play' : 'Pause'), operation}));
    playback.setAttribute('aria-pressed', String(!paused));
  }
  function tick(now) {
    frame = null;
    if (previous !== null) elapsed = (elapsed + (now - previous) / 1000) % 5.5;
    previous = now;
    render();
    frame = requestAnimationFrame(tick);
  }
  function schedule() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previous = null;
    if (!paused && visible && details.open && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function restart() {
    paused = motion.matches;
    elapsed = paused ? 4 : 0;
    render(); updateControl(); schedule();
  }
  selectors.forEach(button => button.addEventListener('click', () => {
    operation = button.dataset.operation;
    scene.dataset.stage = operation;
    selectors.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    caption.innerHTML = copy[operation];
    restart();
  }));
  playback.addEventListener('click', () => {
    paused = !paused;
    updateControl(); schedule();
  });
  details.addEventListener('toggle', () => { if (details.open) restart(); else schedule(); });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(scene.closest('.akv-operation-demo'));
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', restart);
  new ResizeObserver(render).observe(scene);
  playback.hidden = false;
  render(); updateControl();
})();
