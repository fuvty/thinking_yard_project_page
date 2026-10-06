(() => {
  const fallback = document.getElementById('core-animation');
  const button = document.getElementById('core-animation-toggle');
  const selector = document.querySelector('.akv-core-selector');
  const renderer = window.AKVCoreScene;
  if (!fallback || !button || !selector || !renderer) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = fallback.id;
  svg.setAttribute('class', fallback.className);
  svg.setAttribute('viewBox', '0 0 760 220');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-labelledby', 'core-scene-title core-scene-description');
  svg.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif');
  svg.innerHTML = '<title id="core-scene-title"></title><desc id="core-scene-description"></desc><g data-scene></g>';
  fallback.replaceWith(svg);
  const scene = svg.querySelector('[data-scene]');
  const choices = [...selector.querySelectorAll('button')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const descriptions = {
    cache: "A's cache fades while B keeps the yellow information from A. Only C's new cache entries appear in order.",
    context: "Message A disappears. The old A and B caches fade, then new B entries appear, followed by C's cache."
  };
  let approach = 'cache', paused = motion.matches, elapsed = paused ? 11 : 0;
  let visible = true, previous = null, request = null, markup = '';
  function draw() {
    const next = renderer.scene(approach, elapsed);
    if (next !== markup) { scene.innerHTML = next; markup = next; }
  }
  function updateControls() {
    svg.dataset.approach = approach;
    svg.dataset.paused = String(paused);
    svg.querySelector('title').textContent = `${approach === 'cache' ? 'Cache' : 'Context'} Engineering`;
    svg.querySelector('desc').textContent = `${descriptions[approach]} Inset blocks carry historical information. Timing is schematic.`;
    choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice.dataset.engineering === approach)));
    button.textContent = paused ? 'Play animation' : 'Pause animation';
    button.setAttribute('aria-pressed', String(paused));
  }
  function tick(now) {
    request = null;
    if (previous !== null) elapsed = (elapsed + (now - previous) / 1000) % renderer.duration;
    previous = now;
    draw();
    request = requestAnimationFrame(tick);
  }
  function schedule() {
    if (request !== null) cancelAnimationFrame(request);
    request = null;
    previous = null;
    if (!paused && visible && !document.hidden) request = requestAnimationFrame(tick);
  }
  choices.forEach(choice => choice.addEventListener('click', () => {
    approach = choice.dataset.engineering;
    elapsed = paused ? 11 : 0;
    updateControls(); draw(); schedule();
  }));
  button.addEventListener('click', () => { paused = !paused; updateControls(); schedule(); });
  motion.addEventListener('change', () => {
    paused = motion.matches;
    elapsed = paused ? 11 : 0;
    updateControls(); draw(); schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(svg);
  selector.hidden = false;
  button.hidden = false;
  updateControls(); draw(); schedule();
})();
