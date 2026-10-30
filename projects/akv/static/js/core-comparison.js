(() => {
  const translate = globalThis.SiteI18n?.t || ((text, values = {}) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match));
  const container = document.getElementById('core-comparison');
  const button = document.getElementById('core-animation-toggle');
  const renderer = window.AKVCoreScene;
  if (!container || !button || !renderer) return;
  const stageBar = document.getElementById('core-animation-stages');
  const stageDescription = document.getElementById('core-animation-stage-description');
  const stageButtons = renderer.stages.map((stage, index) => {
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = stage.label;
    control.dataset.coreStage = String(index);
    control.setAttribute('aria-controls', 'core-context-animation core-animation');
    control.setAttribute('aria-label', translate('Play from {stage}', {stage: stage.label}));
    stageBar.append(control);
    return control;
  });
  const descriptions = {
    cache: translate("A is prefilled first; B then attends to A and retains its information. Message C arrives next. A's cache fades while B keeps the yellow information from A. A purple highlight emphasizes the existing B cache being reused while Context recomputes B. C's cache appears as a purple dashed outline, attends to retained B, and fades in with inherited information in sync with Context."),
    context: translate("A is prefilled first; B then attends to A and retains its information. Message C arrives next. Message A fades to a gray dashed outline. The invalidated old A and B caches briefly gain pale red borders, then fade to gray dashes within faint dashed outlines. B's recomputed cache appears as a purple dashed outline and fills. C's pending cache then attends to the new B cache and fills in sync with Cache Engineering.")
  };
  const scenes = [...container.querySelectorAll('[data-core-engineering]')].map(fallback => {
    const approach = fallback.dataset.coreEngineering;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = fallback.id;
    svg.setAttribute('class', fallback.className);
    // The heading sits beside its explanatory text, outside the drawing.
    svg.setAttribute('viewBox', '0 50 760 170');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-labelledby', `${svg.id}-title ${svg.id}-description`);
    svg.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif');
    svg.dataset.approach = approach;
    svg.innerHTML = `<title id="${svg.id}-title">${translate(approach === 'cache' ? 'Cache Engineering' : 'Context Engineering')}</title><desc id="${svg.id}-description">${descriptions[approach]} ${translate('Inset blocks carry historical information. Timing is schematic.')}</desc><g data-scene></g>`;
    const status = document.createElement('figcaption');
    status.className = 'akv-core-status';
    status.setAttribute('aria-hidden', 'true');
    fallback.after(status);
    fallback.replaceWith(svg);
    return { approach, svg, status, scene: svg.querySelector('[data-scene]'), markup: '' };
  });
  if (!scenes.length) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches, elapsed = paused ? renderer.stillTime : 0;
  let visible = false, previous = null, request = null;
  let currentStage = -1;
  function draw() {
    for (const item of scenes) {
      const next = renderer.scene(item.approach, elapsed);
      if (next !== item.markup) { item.scene.innerHTML = next; item.markup = next; }
    }
    const stageIndex = renderer.stages.findLastIndex(stage => elapsed >= stage.start);
    if (stageIndex !== currentStage) {
      currentStage = stageIndex;
      stageButtons.forEach((control, index) => {
        if (index === stageIndex) control.setAttribute('aria-current', 'step');
        else control.removeAttribute('aria-current');
      });
      stageDescription.textContent = renderer.stages[stageIndex].description;
      for (const item of scenes) {
        item.status.textContent = stageIndex === 1
          ? (item.approach === 'cache' ? translate('Drop A’s cache') : translate('Remove message A. Invalidate cache A,B'))
          : stageIndex === 2 ? (item.approach === 'cache' ? translate('Reusing B cache') : translate('Re-prefilling history')) : '';
      }
    }
    container.dataset.stage = String(stageIndex);
  }
  function updateControls() {
    button.disabled = motion.matches;
    scenes.forEach(({svg}) => { svg.dataset.paused = String(paused); });
    const label = translate(paused ? 'Play' : 'Pause');
    button.setAttribute('aria-label', label);
    button.title = label;

    button.setAttribute('aria-pressed', String(!paused && !motion.matches));
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
  button.addEventListener('click', () => { paused = !paused; updateControls(); schedule(); });
  stageButtons.forEach((control, index) => control.addEventListener('click', () => {
    elapsed = motion.matches ? renderer.stages[index].still : renderer.stages[index].start;
    paused = motion.matches;
    updateControls(); draw(); schedule();
  }));
  motion.addEventListener('change', () => {
    paused = motion.matches;
    elapsed = paused ? renderer.stillTime : 0;
    updateControls(); draw(); schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  // Keep playback active while the shared stage controls are on screen, too.
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(container.parentElement);
  button.hidden = false;
  stageBar.hidden = false;
  stageDescription.hidden = false;
  updateControls(); draw(); schedule();
})();
