/* Decorative iteration-gain field. Independent of the paper's measured charts. */
(() => {
  const canvas = document.getElementById('iterationField');
  const hero = canvas?.closest('.hero');
  const ctx = canvas?.getContext('2d');
  const responseCanvas = document.getElementById('iterationResponse');
  const responseCtx = responseCanvas?.getContext('2d');
  if (!ctx || !hero || !responseCtx) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const ease = t => t * t * (3 - 2 * t);
  let width = 0, height = 0, lanes = [], raf = 0, last = 0, elapsed = 0;
  let visible = true, pointer = null, drift = {x: 0, y: 0};
  const blue = '76,110,194', purple = '120,104,171', neutral = '128,143,165';
  const duration = 7.3, retention = 24;
  const excursionDuration = 2.15;
  let press = null;
  const excursions = [];
  const clamp = t => Math.max(0, Math.min(1, t));
  // A damped arrival: prompt acceleration, then a long, gentle settling.
  const arrive = t => {
    t = clamp(t);
    return (1 - (1 + 8 * t) * Math.exp(-8 * t)) / (1 - 9 * Math.exp(-8));
  };

  function excursionPoint(excursion, t) {
    const {origin, target} = excursion;
    const dx = target.x - origin.x, dy = target.y - origin.y;
    const bend = Math.min(44, Math.hypot(dx, dy) * .12) * Math.sin(Math.PI * t);
    const length = Math.max(1, Math.hypot(dx, dy));
    return {x: origin.x + dx * t - dy / length * bend, y: origin.y + dy * t + dx / length * bend};
  }
  function drawExcursions() {
    for (let i = excursions.length - 1; i >= 0; i--) {
      const excursion = excursions[i];
      const t = elapsed - excursion.start;
      const color = excursion.color;
      if (motion.matches) {
        ring(excursion.target, .25, color, responseCtx);
        continue;
      }
      if (t > excursionDuration + 2.5) { excursions.splice(i, 1); continue; }
      if (t < .8) ring(excursion.target, ease(t / .8), color, responseCtx);
      if (t >= excursionDuration) {
        line(samples(u => excursionPoint(excursion, u)), color, .12 * (1 - ease(clamp((t - excursionDuration) / 2.5))), 1, false, responseCtx);
        continue;
      }
      const progress = t < 1.05 ? arrive(t / 1.05) : t < 1.3 ? 1 : 1 - ease(clamp((t - 1.3) / .85));
      line(samples(u => excursionPoint(excursion, u)), color, t > 1.3 ? .1 : 0, 1, false, responseCtx);
      line(samples(u => excursionPoint(excursion, u), 0, progress), color, .65, 1.5, false, responseCtx);
      bead(excursionPoint(excursion, progress), color, .95, 3.2, responseCtx);
    }
  }

  function baseline(x, lane) {
    return height * (.19 + lane * .155 - .19 * x / width) + Math.sin(x / width * Math.PI * 2.6 + lane * .7) * Math.min(24, height * .025);
  }
  function probe(trial, t) {
    const x = trial.x + trial.span * t;
    return {x, y: baseline(x, trial.lane) + trial.offset + trial.direction * trial.lift * t * t};
  }
  function extension(trial, t) {
    const distance = trial.step * .9, x = trial.x + trial.span + distance * t;
    const outward = trial.lift + 2 * trial.lift * distance / (5 * trial.span) * (1 - Math.exp(-5 * t));
    return {x, y: baseline(x, trial.lane) + trial.offset + trial.direction * outward};
  }
  function advance(trial, t) {
    const x = trial.x + trial.step * t;
    return {x, y: baseline(x, trial.lane) + trial.offset};
  }
  function appendTrial(lane) {
    // A new particle only enters after the old one has travelled beyond the viewport.
    if (lane.x > width + 120) { lane.x = -120; lane.offset = 0; }
    const y = baseline(lane.x, lane.index) + lane.offset;
    const direction = y < 90 ? 1 : y > height - 80 ? -1 : (lane.index + lane.sequence) % 2 ? 1 : -1;
    const trial = {
      lane: lane.index, x: lane.x, offset: lane.offset, direction,
      step: width < 600 ? 152 : 276, span: width < 600 ? 72 : 124, lift: width < 600 ? 36 : 54,
      accepted: (lane.index * 3 + lane.sequence) % 5 < 3,
      start: lane.delay + lane.sequence * duration,
    };
    trial.finish = trial.start + duration;
    lane.trials.push(trial);
    const endpoint = trial.accepted ? extension(trial, 1) : advance(trial, 1);
    // Carry the exact endpoint into the next trial, including the accepted branch's displacement.
    lane.x = endpoint.x;
    lane.offset = endpoint.y - baseline(endpoint.x, lane.index);
    lane.sequence++;
  }
  function line(points, color, alpha, weight = 1, dashed = false, context = ctx) {
    if (points.length < 2) return;
    context.beginPath();
    points.forEach((p, i) => i ? context.lineTo(p.x, p.y) : context.moveTo(p.x, p.y));
    context.strokeStyle = `rgba(${color},${alpha})`;
    context.lineWidth = weight;
    context.setLineDash(dashed ? [2, 6] : []);
    context.stroke();
    context.setLineDash([]);
  }
  function samples(fn, from = 0, to = 1, count = 36) {
    return Array.from({length: count + 1}, (_, i) => fn(from + (to - from) * i / count));
  }
  function bead(p, color, alpha = .8, radius = 2.5, context = ctx) {
    const halo = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, 17);
    halo.addColorStop(0, `rgba(${color},${alpha * .20})`);
    halo.addColorStop(1, `rgba(${color},0)`);
    context.fillStyle = halo; context.beginPath(); context.arc(p.x, p.y, 17, 0, Math.PI * 2); context.fill();
    context.fillStyle = `rgba(${color},${alpha})`; context.beginPath(); context.arc(p.x, p.y, radius, 0, Math.PI * 2); context.fill();
  }
  function ring(p, progress, color, context = ctx) {
    context.strokeStyle = `rgba(${color},${.32 * (1 - progress)})`;
    context.lineWidth = .8; context.beginPath(); context.arc(p.x, p.y, 4 + progress * 17, 0, Math.PI * 2); context.stroke();
  }
  function resize() {
    const rect = hero.getBoundingClientRect();
    if (width === rect.width && height === rect.height) return;
    width = rect.width; height = rect.height;
    excursions.length = 0;
    press = null;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    responseCanvas.width = canvas.width; responseCanvas.height = canvas.height;
    responseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lanes = Array.from({length: 7}, (_, index) => ({
      index, x: width * ((index * .27) % .88) - 40, offset: 0,
      delay: elapsed + index * .55, sequence: 0, trials: [], paused: 0, interaction: null, head: null,
    }));
    draw();
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    responseCtx.clearRect(0, 0, width, height);
    if (!width || !height) return;
    const target = pointer || {x: 0, y: 0};
    drift.x += (target.x - drift.x) * .045; drift.y += (target.y - drift.y) * .045;
    ctx.save(); ctx.translate(drift.x, drift.y);
    lanes.forEach(lane => {
      if (lane.interaction && elapsed >= lane.interaction.start + excursionDuration) {
        lane.paused += excursionDuration;
        lane.interaction = null;
      }
      const clock = motion.matches ? lane.delay + 16 : (lane.interaction ? lane.interaction.start : elapsed) - lane.paused;
      if (clock <= lane.delay) return;
      while (!lane.trials.length || lane.trials[lane.trials.length - 1].finish <= clock) appendTrial(lane);
      lane.trials = lane.trials.filter(trial => clock - trial.finish < retention);
      const color = lane.index % 3 === 0 ? purple : blue;
      for (const trial of lane.trials) {
        const t = clock - trial.start;
        if (t >= duration) {
          const age = t - duration;
          const memory = 1 - ease(Math.min(1, age / retention));
          const ink = (.4 + .6 * Math.exp(-age / 1.5)) * memory;
          if (trial.accepted) {
            line([...samples(u => probe(trial, u)), ...samples(u => extension(trial, u))], color, .54 * ink, 1.4);
          } else {
            line(samples(u => advance(trial, u)), color, .48 * ink, 1.3);
            line(samples(u => probe(trial, u)), neutral, .06 * memory, .85);
          }
          continue;
        }
        let head, headColor = purple;
        if (t < 2.2) {
          const progress = ease(t / 2.2);
          line(samples(u => probe(trial, u), 0, progress), purple, .54, 1.3);
          head = probe(trial, progress);
        } else if (t < 2.7) {
          line(samples(u => probe(trial, u)), purple, .54, 1.3);
          head = probe(trial, 1);
        } else if (trial.accepted) {
          const progress = ease((t - 2.7) / 4.6);
          line([...samples(u => probe(trial, u)), ...samples(u => extension(trial, u), 0, progress)], color, .54, 1.4);
          head = extension(trial, progress); headColor = color;
          if (t < 3.5) ring(probe(trial, 1), (t - 2.7) / .8, color);
        } else if (t < 4.5) {
          const progress = 1 - ease((t - 2.7) / 1.8);
          line(samples(u => probe(trial, u)), neutral, .06, .85);
          line(samples(u => probe(trial, u), 0, progress), purple, .46, 1.3);
          head = probe(trial, progress);
        } else {
          const progress = ease((t - 4.5) / 2.8);
          line(samples(u => probe(trial, u)), neutral, .06, .85);
          line(samples(u => advance(trial, u), 0, progress), color, .48, 1.3);
          head = advance(trial, progress); headColor = color;
          if (t < 5.2) ring(advance(trial, 0), (t - 4.5) / .7, neutral);
        }
        lane.head = head;
        lane.color = headColor;
        if (!lane.interaction) bead(head, headColor, .72);
      }
    });

    ctx.restore();
    responseCtx.save(); responseCtx.translate(drift.x, drift.y);
    drawExcursions();
    responseCtx.restore();
  }
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden || motion.matches) { last = 0; return; }
    if (!last) last = now;
    // 30 fps is enough for the soft background, and bounds work on high-refresh displays.
    if (now - last >= 32) { elapsed += Math.min((now - last) / 1000, .08); last = now; draw(); }
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    cancelAnimationFrame(raf); raf = 0; last = 0;
    if (motion.matches) { pointer = null; drift = {x: 0, y: 0}; draw(); }
    else if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const interactive = target => target instanceof Element && target.closest('a, button, input, select, textarea, summary, video, [role="button"], [contenteditable="true"]');
  hero.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || interactive(event.target)) { press = null; return; }
    press = {id: event.pointerId, x: event.clientX, y: event.clientY, scroll: window.scrollY, time: performance.now()};
  }, {passive: true});
  hero.addEventListener('pointerup', event => {
    const down = press;
    press = null;
    if (!down || event.pointerId !== down.id || interactive(event.target) || performance.now() - down.time > 650
      || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 10 || Math.abs(window.scrollY - down.scroll) > 8
      || window.getSelection()?.toString()) return;
    const rect = hero.getBoundingClientRect();
    const target = {x: event.clientX - rect.left - drift.x, y: event.clientY - rect.top - drift.y};
    if (motion.matches) {
      excursions.length = 0;
      excursions.push({target, color: blue});
      draw();
      return;
    }
    const available = lanes.filter(lane => !lane.interaction && lane.head && lane.head.x >= 0 && lane.head.x <= width && lane.head.y >= 0 && lane.head.y <= height);
    const lane = available.sort((a, b) => Math.hypot(a.head.x - target.x, a.head.y - target.y) - Math.hypot(b.head.x - target.x, b.head.y - target.y))[0];
    if (!lane) return;
    const excursion = {origin: {...lane.head}, target, color: lane.color, start: elapsed};
    lane.interaction = excursion;
    excursions.push(excursion);
    draw();
  }, {passive: true});
  hero.addEventListener('pointercancel', () => { press = null; });
  hero.addEventListener('pointermove', event => {
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) press = null;
    if (!finePointer.matches || motion.matches) return;
    const rect = hero.getBoundingClientRect();
    pointer = {x: (event.clientX - rect.left - width / 2) * .012, y: (event.clientY - rect.top - height / 2) * .012};
  }, {passive: true});
  hero.addEventListener('pointerleave', () => { pointer = null; press = null; });
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold: .01}).observe(hero);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', () => { width = 0; resize(); sync(); });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); raf = 0; });
  window.addEventListener('pageshow', sync);
  resize(); sync();
})();
