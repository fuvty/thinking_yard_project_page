// One short reveal, then a stable chart. Timings affect presentation, never data.
(() => {
  const baselineDuration = 900, loopStart = 1050, loopDuration = 1700;
  const duration = loopStart + loopDuration;
  const clamp = value => Math.max(0, Math.min(1, value));
  function ease(progress) {
    const time = clamp(progress);
    if (time === 0 || time === 1) return time;
    let low = 0, high = 1, t = time;
    // Same asymmetric cubic-bezier(.42, 0, .12, 1) as the homepage.
    for (let i = 0; i < 16; i++) {
      const x = 3 * (1 - t) ** 2 * t * .42 + 3 * (1 - t) * t * t * .12 + t ** 3;
      if (x < time) low = t; else high = t;
      t = (low + high) / 2;
    }
    return t * t * (3 - 2 * t);
  }
  const progress = (ms, baseline) => ease(baseline ? ms / baselineDuration : (ms - loopStart) / loopDuration);
  // In the 32K view, retain the earlier measurements as context beneath the extension.
  const points = (series, range) => series.filter(p => range === '16' ? p.cutoff <= 16 : p.cutoff >= 16);
  const context = (series, range) => range === '32' ? points(series, '16') : [];
  // Reveal actual screen-space distance, not a wipe across empty plot space.
  // Interpolated tips are presentation only; markers stay on measured points.
  function trace(points, progress) {
    const p = clamp(progress), distances = [0];
    for (let i = 1; i < points.length; i++) {
      distances.push(distances[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    }
    const length = distances.at(-1), target = p * length, visible = [];
    if (p > 0) for (let i = 0; i < points.length; i++) {
      if (distances[i] <= target) visible.push(points[i]);
      else {
        const a = points[i - 1], b = points[i], t = (target - distances[i - 1]) / (distances[i] - distances[i - 1]);
        visible.push({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t});
        break;
      }
    }
    return {points: visible, opacity: i => p === 1 ? 1 : Math.min(clamp(p / .04), clamp((p - (length ? distances[i] / length : 0) + .04) / .04))};
  }
  function create({roots, draw}) {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const visible = new Set();
    let elapsed = 0, last = null, frame = 0, replayOnEntry = true;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; last = null; };
    const render = () => draw(motion.matches ? duration : elapsed);
    function tick(now) {
      frame = 0;
      if (last !== null) elapsed = Math.min(duration, elapsed + Math.min(now - last, 100));
      last = now;
      render();
      if (elapsed < duration) run();
    }
    function run() {
      if (!frame && !replayOnEntry && visible.size && !document.hidden && !motion.matches && elapsed < duration) frame = requestAnimationFrame(tick);
    }
    function restart() { stop(); elapsed = motion.matches ? duration : 0; render(); run(); }
    function preference() { stop(); if (motion.matches) elapsed = duration; render(); run(); }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      // Only a full exit arms replay; grazing the entry threshold must not reset it.
      if (!visible.size) { stop(); replayOnEntry = true; }
      else if (replayOnEntry && entries.some(entry => entry.intersectionRatio >= .12)) {
        replayOnEntry = false;
        restart();
      } else run();
    }, {threshold: [0, .12]});
    roots.forEach(root => observer.observe(root));
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else run(); });
    motion.addEventListener('change', preference);
    preference();
    return {restart};
  }
  window.TaH2Charts = {duration, loopStart, progress, points, context, trace, create};
})();
