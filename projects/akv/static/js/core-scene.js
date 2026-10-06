// Shared vector scene for the live animation and its generated static fallback.
// All timings are schematic. Fading means unavailable, not physically evicted.
globalThis.AKVCoreScene = (() => {
  const colors = { A: ['#FFEDD5', '#F59E0B'], B: ['#dcebcf', '#86a46b'], C: ['#dce9fa', '#85a8d3'] };
  const positions = { A: 126, B: 329, C: 532 };
  const smooth = (t, start, duration) => {
    const v = Math.max(0, Math.min(1, (t - start) / duration));
    return v * v * (3 - 2 * v);
  };
  const rect = (x, y, w, h, fill, stroke = 'none', radius = 7, extra = '') =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
  const label = (x, y, value, size, anchor = 'start') =>
    `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" font-weight="600" fill="#25262a">${value}</text>`;
  function scene(kind, time) {
    const ours = kind === 'cache';
    const parts = [label(24, 34, ours ? 'Cache Engineering' : 'Context Engineering', 21), label(24, 92, 'Message', 17), label(24, 180, 'Cache', 17)];
    for (const name of ['A', 'B', 'C']) {
      const opacity = name === 'C' ? smooth(time, .2, .9) : name === 'A' && !ours ? 1 - smooth(time, 2.4, .7) : 1;
      if (!opacity) continue;
      const x = positions[name];
      parts.push(`<g data-message="${name}" opacity="${opacity}">${rect(x, 63, 174, 44, ...colors[name])}${label(x + 87, 91, name, 21, 'middle')}</g>`);
    }
    function caches(name, { history = false, inherited = false, inactive = 0, appear = null, dx = 0, dy = 0, fresh = false } = {}) {
      const x = positions[name] + dx, y = 143 + dy;
      const [fill, edge] = colors[name];
      const tiles = [];
      for (let i = 0; i < 3; i++) {
        const opacity = appear === null ? 1 : smooth(time, appear + i * .48, .28);
        if (!opacity) continue;
        const left = x + i * 60;
        tiles.push(`<g data-entry="${i}" opacity="${opacity}">`);
        // White backing keeps fresh B opaque over the old, offset ghost.
        tiles.push(rect(left, y, 54, 61, '#fff'));
        tiles.push(`<g opacity="${1 - .86 * inactive}">`, rect(left, y, 54, 61, fill, inactive > .95 ? 'none' : edge));
        if (history) tiles.push(rect(left + 7, y + 32, 40, 19, colors.A[1], 'none', 3));
        if (inherited) {
          tiles.push(rect(left + 7, y + 22, 40, 29, colors.B[1], 'none', 3));
          if (ours) tiles.push(rect(left + 12, y + 37, 30, 10, colors.A[1], 'none', 2));
        }
        tiles.push('</g>');
        if (inactive) tiles.push(rect(left, y, 54, 61, 'none', '#9da3ab', 3, `stroke-dasharray="5 5" opacity="${inactive * .55}"`));
        tiles.push('</g>');
      }
      parts.push(`<g data-cache="${name}-${fresh ? 'new' : 'old'}">${tiles.join('')}</g>`);
    }
    const inactive = smooth(time, 3.2, .8);
    caches('A', { inactive });
    caches('B', { history: true, inactive: ours ? 0 : inactive });
    if (!ours) caches('B', { appear: 5, dx: 10, dy: 10, fresh: true });
    caches('C', { inherited: true, appear: ours ? 5 : 7.4, fresh: true });
    return parts.join('');
  }
  const svg = (kind, time) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 220" width="760" height="220" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif">${scene(kind, time)}</svg>`;
  return { scene, svg, duration: 14 };
})();
