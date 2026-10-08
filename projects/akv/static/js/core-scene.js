// Shared vector scene for the live animation and its generated static fallback.
// All timings are schematic. Fading means unavailable, not physically evicted.
globalThis.AKVCoreScene = (() => {
  const colors = { A: ['#FFEDD5', '#F59E0B'], B: ['#dcebcf', '#86a46b'], C: ['#dce9fa', '#85a8d3'] };
  const positions = { A: 126, B: 329, C: 532 };
  const stages = [
    { start: 0, label: 'Drop history', description: 'Message edits invalidate subsequent cache; direct cache edits preserve retained states.' },
    { start: 4.35, label: 'Recompute / reuse', description: 'Context engineering recomputes retained history. Cache engineering reuses its existing states.' },
    { start: 7.4, label: 'Prefill', description: 'Both prefill the new message using their active cache.' }
  ];
  const smooth = (t, start, duration) => {
    const v = Math.max(0, Math.min(1, (t - start) / duration));
    return v * v * (3 - 2 * v);
  };
  const rect = (x, y, w, h, fill, stroke = 'none', radius = 7, extra = '') =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
  const label = (x, y, value, size, anchor = 'start') =>
    `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" font-weight="600" fill="#25262a">${value}</text>`;
  const presence = (time, start, hold) => smooth(time, start, .25) * (1 - smooth(time, start + hold, .4));
  // Thin, temporary connections identify inputs; only destination tiles animate.
  function connection(path, color, opacity, source) {
    return `<path data-prefill-link="${source}" d="${path}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;
  }
  function straightConnection(x1, y1, x2, y2, color, opacity, source) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / length, uy = (y2 - y1) / length;
    const ax = x2 - 3 * ux, ay = y2 - 3 * uy;
    return connection(`M ${x1} ${y1} L ${x2} ${y2} M ${ax - 2 * uy} ${ay + 2 * ux} L ${x2} ${y2} L ${ax + 2 * uy} ${ay - 2 * ux}`, color, opacity, source);
  }
  function scene(kind, time) {
    const ours = kind === 'cache';
    const parts = [label(24, 34, ours ? 'Cache Engineering' : 'Context Engineering', 21), label(24, 92, 'Message', 17), label(24, 180, 'Cache', 17)];
    for (const name of ['A', 'B', 'C']) {
      const opacity = name === 'C' ? smooth(time, .2, .9) : 1;
      const inactive = name === 'A' && !ours ? smooth(time, 2.4, .8) : 0;
      if (!opacity) continue;
      const x = positions[name];
      const [fill, edge] = colors[name];
      parts.push(`<g data-message="${name}" opacity="${opacity}"><g opacity="${1 - .86 * inactive}">${rect(x, 63, 174, 44, fill, inactive > .95 ? 'none' : edge)}${label(x + 87, 91, name, 21, 'middle')}</g>`);
      if (inactive) parts.push(rect(x, 63, 174, 44, 'none', '#9da3ab', 7, `stroke-dasharray="5 5" opacity="${inactive * .55}"`));
      parts.push('</g>');
    }
    function caches(name, { history = false, inherited = false, inactive = 0, appear = null, dx = 0, dy = 0, fresh = false } = {}) {
      const x = positions[name] + dx, y = 143 + dy;
      const [fill, edge] = colors[name];
      const tiles = [];
      for (let i = 0; i < 3; i++) {
        const opacity = appear === null ? 1 : smooth(time, appear - .65, .25);
        if (!opacity) continue;
        const progress = appear === null ? 1 : smooth(time, appear + i * .48, .4);
        const left = x + i * 60;
        const clipId = `core-${kind}-${name}-${fresh ? 'new' : 'old'}-${i}`;
        tiles.push(`<g data-slot="${i}" opacity="${opacity}">`);
        // Empty destination outlines appear first; a downward reveal fills each tile.
        tiles.push(rect(left, y, 54, 61, '#fff'));
        if (progress > 0) {
          tiles.push(`<defs><clipPath id="${clipId}">${rect(left, y, 54, 61 * progress, '#fff', 'none', 0)}</clipPath></defs>`);
          tiles.push(`<g data-entry="${i}" data-fill="${progress}" clip-path="url(#${clipId})"><g opacity="${1 - .86 * inactive}">`, rect(left, y, 54, 61, fill));
          if (history) tiles.push(rect(left + 7, y + 32, 40, 19, colors.A[1], 'none', 3));
          if (inherited) {
            tiles.push(rect(left + 7, y + 22, 40, 29, colors.B[1], 'none', 3));
            if (ours) tiles.push(rect(left + 12, y + 37, 30, 10, colors.A[1], 'none', 2));
          }
          tiles.push('</g></g>');
        }
        tiles.push(rect(left, y, 54, 61, 'none', edge, 7, `opacity="${1 - inactive}"`));
        if (inactive) tiles.push(rect(left, y, 54, 61, 'none', '#9da3ab', 3, `stroke-dasharray="5 5" opacity="${inactive * .55}"`));
        tiles.push('</g>');
      }
      parts.push(`<g data-cache="${name}-${fresh ? 'new' : 'old'}">${tiles.join('')}</g>`);
    }
    const inactive = smooth(time, 2.4, .8);
    caches('A', { inactive });
    caches('B', { history: true, inactive: ours ? 0 : inactive });
    if (!ours) caches('B', { appear: stages[1].start + .65, dx: 10, dy: 10, fresh: true });
    caches('C', { inherited: true, appear: stages[2].start + .65, fresh: true });
    function prefillLinks(name, start, fromCache = false) {
      const opacity = presence(time, start, 2.15);
      if (!opacity) return;
      // Fixed, direct inputs: message from above; historical cache from the left.
      const y = (name === 'B' ? 153 : 143) - 2;
      const messageX = positions[name] + 87;
      parts.push(straightConnection(messageX, 107, messageX, y, colors[name][1], opacity, 'message'));
      if (fromCache) {
        const sourceX = positions.B + 174 + (ours ? 0 : 10);
        const sourceY = ours ? 174 : 184;
        parts.push(straightConnection(sourceX, sourceY, positions.C - 2, 174, colors.B[1], opacity, 'cache'));
      }
    }
    if (!ours) prefillLinks('B', stages[1].start);
    prefillLinks('C', stages[2].start, true);
    return parts.join('');
  }
  const svg = (kind, time) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 220" width="760" height="220" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif">${scene(kind, time)}</svg>`;
  return { scene, svg, stages, duration: 14 };
})();
