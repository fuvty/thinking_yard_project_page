// Shared vector scene for the live animation and its generated static fallback.
// All timings are schematic. Fading means unavailable, not physically evicted.
globalThis.AKVCoreScene = (() => {
  const colors = { A: ['#fff0dc', '#d7a65e'], B: ['#e5eedc', '#91ac72'], C: ['#e3edfa', '#81a4ce'] };
  const accent = '#8570b6';
  const positions = { A: 126, B: 329, C: 532 };
  const stages = [
    { start: 0, still: 5.2, label: 'Build history', description: 'Prefill A, then B with information from A. Message C arrives next.' },
    { start: 5.6, still: 8.6, label: 'Reduce history', description: 'Reduce history before processing C.' },
    { start: 9.5, still: 11.55, label: 'Recompute / reuse', description: 'Context engineering recomputes retained history. Cache engineering reuses its existing states.' },
    { start: 12.55, still: 16.15, label: 'Prefill', description: 'Both prefill the new message using their active cache.' }
  ];
  const smooth = (t, start, duration) => {
    const v = Math.max(0, Math.min(1, (t - start) / duration));
    return v * v * (3 - 2 * v);
  };
  const rect = (x, y, w, h, fill, stroke = 'none', radius = 7, extra = '') =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
  const bubble = (x, y, w, h, fill, stroke = 'none', radius = 12, extra = '') => {
    const r = radius;
    return `<path data-message-bubble d="M ${x+r} ${y} H ${x+w-r} Q ${x+w} ${y} ${x+w} ${y+r} V ${y+h-r} Q ${x+w} ${y+h} ${x+w-r} ${y+h} H ${x+30} L ${x+12} ${y+h+10} L ${x+16} ${y+h} H ${x+r} Q ${x} ${y+h} ${x} ${y+h-r} V ${y+r} Q ${x} ${y} ${x+r} ${y} Z" fill="${fill}" stroke="${stroke}" stroke-linejoin="round" ${extra}/>`;
  };
  const label = (x, y, value, size, anchor = 'start') =>
    `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" font-weight="600" fill="#544b5e">${value}</text>`;
  const inactiveOutline = (x, y, w, h, amount, shape = rect) => amount > 0
    ? `<g data-inactive-outline opacity="${amount * .6}">${shape(x, y, w, h, 'none', '#bbb5c4', undefined, 'stroke-dasharray="3 4"')}<text x="${x + w / 2}" y="${y + h / 2 + 4}" font-size="13" fill="#a6a0af" text-anchor="middle">—</text></g>`
    : '';
  function scene(kind, time) {
    const ours = kind === 'cache';
    // Run the history reduction at half speed; later stages retain their pacing.
    const reductionTime = stages[1].start + (time - stages[1].start) / 2;
    const invalidationStart = stages[1].start + .55;
    const invalidationPulse = smooth(reductionTime, invalidationStart, .18)
      * (1 - smooth(reductionTime, invalidationStart + .4, .55));
    const parts = [label(24, 34, ours ? 'Cache Engineering' : 'Context Engineering', 21), label(24, 92, 'Message', 17), label(24, 180, 'Cache', 17)];
    for (const name of ['A', 'B', 'C']) {
      const opacity = smooth(time, {A:0, B:2, C:4.2}[name], .55);
      const inactive = name === 'A' && !ours ? smooth(reductionTime, stages[1].start, .8) : 0;
      if (!opacity) continue;
      const x = positions[name];
      const [fill, edge] = colors[name];
      parts.push(`<g data-message="${name}" opacity="${opacity}">${bubble(x, 63, 174, 44, '#fff')}<g opacity="${1 - inactive}">${bubble(x, 63, 174, 44, fill, edge)}${label(x + 87, 91, name, 21, 'middle')}</g>`);
      parts.push(inactiveOutline(x, 63, 174, 44, inactive, bubble));
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
      tiles.push(`<g opacity="${1 - inactive}">`, rect(x, y, 174, 61, fill, 'none', 7, `opacity="${progress}"`));
      tiles.push(`<g data-information opacity="${infoProgress}">`);
      if (history) tiles.push(rect(x + 120, y + 32, 40, 19, colors.A[1], 'none', 3));
      if (inherited) {
        tiles.push(rect(x + 94, y + 22, 66, 29, colors.B[1], 'none', 3));
        if (ours) tiles.push(rect(x + 114, y + 37, 40, 10, colors.A[1], 'none', 2));
      }
      tiles.push('</g></g>');
      tiles.push(rect(x, y, 174, 61, 'none', edge, 7, `opacity="${progress * (1 - inactive)}"`));
      if (inactive && !ours) {
        // Distinguish invalidation through its sequence and brief red cue,
        // then settle into the same unavailable-state treatment as Drop.
        tiles.push(`<g data-invalidated-outline>${inactiveOutline(x, y, 174, 61, inactive)}${rect(x, y, 174, 61, 'none', '#d49a9f', 7, `data-invalidation-pulse stroke-width="1.6" opacity="${invalidationPulse * .85}"`)}</g>`);
      } else {
        tiles.push(inactiveOutline(x, y, 174, 61, inactive));
      }
      parts.push(`<g data-cache="${name}-${fresh ? 'new' : 'old'}" data-fill="${progress}" opacity="${opacity}">${tiles.join('')}</g>`);
    }
    // Show the message edit before its consequence for the old prefix cache.
    const inactive = smooth(reductionTime, stages[1].start + (ours ? 0 : .55), .8);
    caches('A', { appear:.25, inactive });
    caches('B', { appear:2.25, history: true, inactive: ours ? 0 : inactive });
    if (!ours) caches('B', { appear: stages[2].start, dx: 10, dy: 10, fresh: true });
    caches('C', { inherited: true, appear: stages[3].start, fresh: true });
    // Emphasize the existing B cache without refilling or recoloring its contents.
    const reuse = ours ? smooth(time, stages[2].start + .15, .5)
      * (1 - smooth(time, stages[3].start, .5)) : 0;
    if (reuse) parts.push(`<g data-reused-cache="B" opacity="${reuse}">${rect(positions.B - 3, 140, 180, 67, 'none', accent, 10, 'stroke-width="7" opacity=".15"')}${rect(positions.B - 3, 140, 180, 67, 'none', accent, 10, 'stroke-width="2" opacity=".85"')}</g>`);
    // As in the system figure, a pending block represents the message being computed.
    // Its curved attention arrow points to available history, not a data transfer.
    function attend(from, to, start, targetOffset=0) {
      const opacity = smooth(time, start + .35, .13) * (1 - smooth(time, start + .89, .13));
      if (!opacity) return;
      const sx = positions[from] + 87, tx = positions[to] + 87 + targetOffset;
      const ty = 141 + targetOffset;
      parts.push(`<g data-attention="${from}-${to}" data-source="pending-kv" opacity="${opacity}"><path d="M ${sx} 141 C ${sx} 117, ${tx} 117, ${tx} ${ty}" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/><circle cx="${sx}" cy="142" r="2" fill="${accent}"/><path d="M ${tx-3} ${ty-5} L ${tx} ${ty} L ${tx+3} ${ty-5}" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/>${rect(positions[to]+targetOffset-2,ty,178,65,'none',accent,9,'stroke-width="1.2" opacity=".65"')}</g>`);
    }
    attend('B', 'A', 2.25);
    attend('C', 'B', stages[3].start, ours ? 0 : 10);
    return parts.join('');
  }
  const svg = (kind, time) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 50 760 170" width="760" height="170" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif">${scene(kind, time)}</svg>`;
  return { scene, svg, stages, duration: 19.15, stillTime: 16.15 };
})();
