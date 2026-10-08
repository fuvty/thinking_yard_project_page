// Shared vector scene for the live animation and its generated static fallback.
// All timings are schematic. Fading means unavailable, not physically evicted.
globalThis.AKVCoreScene = (() => {
  const colors = { A: ['#fff0dc', '#d7a65e'], B: ['#e5eedc', '#91ac72'], C: ['#e3edfa', '#81a4ce'] };
  const accent = '#8570b6';
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
    `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" font-weight="600" fill="#544b5e">${value}</text>`;
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
      if (inactive) parts.push(rect(x, 63, 174, 44, 'none', '#bbb5c4', 7, `stroke-dasharray="5 5" opacity="${inactive * .55}"`));
      parts.push('</g>');
    }
    function caches(name, { history = false, inherited = false, inactive = 0, appear = null, dx = 0, dy = 0, fresh = false } = {}) {
      const x = positions[name] + dx, y = 143 + dy;
      const [fill, edge] = colors[name];
      const opacity = appear === null ? 1 : smooth(time, appear + .15, .25);
      if (!opacity) return;
      const progress = appear === null ? 1 : smooth(time, appear + .9, .4);
      const infoProgress = appear === null ? 1 : smooth(time, appear + 1.04, .26);
      const tiles = [];
      // One cache block per message, with the system illustration's prefill phases.
      tiles.push(rect(x, y, 174, 61, '#fff'));
      if (progress < 1) tiles.push(rect(x, y, 174, 61, 'none', accent, 7, `data-pending="true" stroke-dasharray="4 4" stroke-width="1.2" opacity="${1 - progress}"`));
      tiles.push(`<g opacity="${1 - .86 * inactive}">`, rect(x, y, 174, 61, fill, 'none', 7, `opacity="${progress}"`));
      tiles.push(`<g data-information opacity="${infoProgress}">`);
      if (history) tiles.push(rect(x + 120, y + 32, 40, 19, colors.A[1], 'none', 3));
      if (inherited) {
        tiles.push(rect(x + 94, y + 22, 66, 29, colors.B[1], 'none', 3));
        if (ours) tiles.push(rect(x + 114, y + 37, 40, 10, colors.A[1], 'none', 2));
      }
      tiles.push('</g></g>');
      tiles.push(rect(x, y, 174, 61, 'none', edge, 7, `opacity="${progress * (1 - inactive)}"`));
      if (inactive) tiles.push(rect(x, y, 174, 61, 'none', '#bbb5c4', 7, `stroke-dasharray="5 5" opacity="${inactive * .55}"`));
      parts.push(`<g data-cache="${name}-${fresh ? 'new' : 'old'}" data-fill="${progress}" opacity="${opacity}">${tiles.join('')}</g>`);
    }
    const inactive = smooth(time, 2.4, .8);
    caches('A', { inactive });
    caches('B', { history: true, inactive: ours ? 0 : inactive });
    if (!ours) caches('B', { appear: stages[1].start, dx: 10, dy: 10, fresh: true });
    caches('C', { inherited: true, appear: stages[2].start, fresh: true });
    // As in the system figure, a pending block represents the message being computed.
    // Its curved attention arrow points to available history, not a data transfer.
    {
      const start = stages[2].start;
      const opacity = smooth(time, start + .35, .13) * (1 - smooth(time, start + .89, .13));
      const sx = positions.C + 87, tx = positions.B + 87 + (ours ? 0 : 10);
      const ty = ours ? 141 : 151;
      parts.push(`<g data-attention="C-B" data-source="pending-kv" opacity="${opacity}"><path d="M ${sx} 141 C ${sx} 117, ${tx} 117, ${tx} ${ty}" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/><circle cx="${sx}" cy="142" r="2" fill="${accent}"/><path d="M ${tx-3} ${ty-5} L ${tx} ${ty} L ${tx+3} ${ty-5}" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/>${rect(positions.B+(ours?0:10)-2,ty,178,65,'none',accent,9,'stroke-width="1.2" opacity=".65"')}</g>`);
    }
    return parts.join('');
  }
  const svg = (kind, time) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 220" width="760" height="220" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif">${scene(kind, time)}</svg>`;
  return { scene, svg, stages, duration: 14 };
})();
