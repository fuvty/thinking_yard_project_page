/* One rooted cache tree opens into a fan from lower left to upper right.
   The closing-up is a visual abstraction, not deletion of AKV's operation history. */
(() => {
  const hero = document.querySelector('.akv-hero');
  const canvas = document.getElementById('akv-hero-canvas');
  const ctx = canvas?.getContext('2d');
  if (!hero || !ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ink = '116,103,153', selectedInk = '184,125,61';
  const selectionTime = .18, removalTime = .65;
  const orbColors = {
    grow: { glow: '139,120,213', core: '147,126,226' },
    drop: { glow: '218,164,54', core: '238,192,74' }
  };
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { n = clamp(n); return n * n * (3 - 2 * n); };
  // The initial canopy keeps accelerating from root to crown. Travelers
  // have their own ease-in-out clock and still slow down on arrival.
  const entranceProgress = value => {
    const t = clamp(value);
    return t * t * t;
  };
  const inverseEntrance = progress => Math.cbrt(clamp(progress));
  let width = 0, height = 0, time = 0, nodes = [], tips = [], tree, exclusions = [];
  let serial = 0, dropSerial = 0, nextDrop = 3, nextAppend = .9;
  let entranceEnd = 0, pendingAdvance = 0, autoResumeAt = 0, manualNext = 'select';
  let matchings = [], readyActions = [], arrivals = [], rootPulseAt = -10, rootPulseInk = orbColors.grow.glow;
  let dropping = null, raf = null, last = null, visible = false;

  // A fresh silhouette per page load; resizing keeps the same branching choices.
  const sceneSeed = Math.floor(Math.random() * 0xffffffff);
  let randomState = sceneSeed;
  function random() {
    randomState = (randomState + 0x6D2B79F5) | 0;
    let n = Math.imul(randomState ^ randomState >>> 15, 1 | randomState);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  }

  function add(parent, y, length, structural = false) {
    const x = parent ? parent.tx + length : 0;
    const item = { id: serial++, parent, children: [], y, ty: y, x, tx: x, length, structural, fan: parent?.fan || 0, releaseAfter: parent?.releaseAfter || 0, born: -10, growDuration: .65 };
    nodes.push(item);
    if (parent) parent.children.push(item);
    return item;
  }

  function screenPoint(n) {
    const t = tree;
    return { x: t.x + n.x * Math.cos(t.angle) - n.y * Math.sin(t.angle),
      y: t.y + n.x * Math.sin(t.angle) + n.y * Math.cos(t.angle) };
  }

  function clearOfCopy(n, margin = 12) {
    const p = screenPoint(n);
    return p.x > 12 && p.x < width - 12 && p.y > 52 && p.y < height - 12 &&
      !exclusions.some(r => p.x > r.left - margin && p.x < r.right + margin && p.y > r.top - margin && p.y < r.bottom + margin);
  }

  function makeTree(x, y, length, spread, angle, compact = false) {
    tree = { x, y, length, spread, angle, unit: Math.min(height * .030, width * .04) };
    const root = add(null, 0, 0, true);
    tree.root = root;
    const fanAt = degrees => Math.tan(degrees * Math.PI / 180 - angle);
    function path(parent, count, fan, structuralEnd = false) {
      const from = parent.fan;
      for (let i = 0; i < count; i++) {
        const opening = from !== fan && i < 2;
        parent = add(parent, 0, tree.unit, opening || (structuralEnd && i === count - 1));
        parent.fan = from + (fan - from) * smooth((i + 1) / 2);
      }
      return parent;
    }
    function branch(parent, low, high, level) {
      const fan = fanAt(low + (high - low) * (.42 + random() * .16));
      const vx = Math.cos(angle) - fan * Math.sin(angle);
      const vy = Math.sin(angle) + fan * Math.cos(angle);
      const available = Math.min((width - 12 - x) / vx, (y - 52) / -vy, length);
      // Move the last shared prefixes outward, so small forks appear along
      // the middle and outer crown instead of collecting around the root.
      const run = level === 1
        ? Math.max(2, Math.floor((available - parent.tx) * (.42 + random() * .18) / tree.unit))
        : level === 2
          ? Math.max(2, Math.floor((available - parent.tx) * (.24 + random() * .12) / tree.unit))
          : 2 + Math.floor(random() * 3);
      const room = Math.max(2, Math.floor((available - parent.tx) / tree.unit) - 3);
      const fork = path(parent, Math.min(run, room), fan, true);
      if (level && high - low > (compact ? 6 : 2.8) && available - fork.tx > tree.unit * 5) {
        // Random binary/ternary forks with unequal sector widths. Ordered
        // sectors keep the richer topology flat, with no crossing branches.
        const count = high - low > 7 && random() < .62 ? 3 : 2;
        const weights = Array.from({ length: count }, () => .8 + random() * .4);
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let start = low;
        for (const weight of weights) {
          const end = start + (high - low) * weight / total;
          branch(fork, start, end, level - 1);
          start = end;
        }
        return;
      }
      // Every terminal branch owns an ordered angular sector. Its endpoint
      // follows the frame, letting upright branches fill the upper-left space.
      // Longer leaders fill the frame; shorter companion twigs finish inside
      // the crown, keeping the late forks from turning into equal-length rays.
      const extension = random() < .34 ? .28 + random() * .32 : .90 + random() * .10;
      const maxLength = Math.max(fork.tx + tree.unit * 2, fork.tx + (available - fork.tx) * extension);
      const count = Math.max(2, Math.floor((maxLength - fork.tx) / tree.unit) - 1);
      const tip = path(fork, count, fan);
      tips.push({ node: tip, maxLength, growAfter: random() * 12 });
    }
    const stem = path(root, 1, 0, true);
    // Adjacent subtrees have disjoint, ordered sectors. The projection opens
    // a flat tree into a fan without weaving one branch across another.
    const bounds = [-89, -60, -31, -2];
    for (let i = 0; i < 3; i++) branch(stem, bounds[i], bounds[i + 1], compact ? 2 : 4);
  }

  function setup() {
    time = 0; serial = 0; dropSerial = 0; randomState = sceneSeed;
    pendingAdvance = 0; autoResumeAt = 0; manualNext = 'select';
    nodes = []; tips = []; dropping = null; matchings = []; readyActions = []; arrivals = []; rootPulseAt = -10;
    const box = hero.getBoundingClientRect();
    exclusions = [...hero.children].filter(el => !el.matches('canvas,.akv-hero-wash,.akv-sr-only')).map(el => {
      const r = el.getBoundingClientRect();
      return { left: r.left - box.left, right: r.right - box.left, top: r.top - box.top, bottom: r.bottom - box.top };
    }).filter(r => r.right > r.left && r.bottom > r.top);
    // One fan-shaped canopy connects the whole frame. The root stays fixed
    // in the lower-left corner; its crown opens toward the upper right.
    const rootX = Math.max(14, width * .02);
    const rootY = height - 24;
    const crownX = width * .91;
    const crownY = Math.max(82, height * .13);
    const dx = crownX - rootX, dy = crownY - rootY;
    const angle = -Math.PI / 4;
    const spread = width >= 900 ? Math.min(height * .84, width * .59) : width * 1.5;
    makeTree(rootX, rootY, Math.hypot(dx, dy) * 1.08, spread, angle, width < 600);
    layout(1);
    const root = tree.root;
    root.born = .05; root.growDuration = .15;
    root.travel = 0; root.pace = 1;
    let extent = 0;
    for (const n of nodes) {
      if (!n.parent) continue;
      // Small pace differences make neighboring branches open at different
      // times without inserting pauses or stopping at every junction.
      n.pace = n.parent.children.length > 1 ? .94 + random() * .12 : n.parent.pace;
      n.travel = n.parent.travel + Math.hypot(n.x - n.parent.x, n.y - n.parent.y) * n.pace;
      extent = Math.max(extent, n.travel);
    }
    const start = .2, duration = 1.8;
    for (const n of nodes) {
      if (!n.parent) continue;
      const from = n.parent.travel / extent, to = n.travel / extent;
      n.entrance = { start, duration, from, to };
      n.born = start + duration * inverseEntrance(from);
      n.growDuration = duration * (inverseEntrance(to) - inverseEntrance(from));
    }
    entranceEnd = start + duration;
    nextAppend = entranceEnd + .8;
    nextDrop = entranceEnd + 1.8;
  }

  function growthReveal(n) {
    if (reduced.matches) return 1;
    if (!n.entrance) return smooth((time - n.born) / n.growDuration);
    const { start, duration, from, to } = n.entrance;
    return clamp((entranceProgress((time - start) / duration) - from) / (to - from));
  }

  function layout(amount) {
    // Parent-first order survives splicing. Children inherit the removed span's
    // reclaimed space, so the whole affected subtree reconnects without a cut.
    for (const n of nodes) {
      n.tx = n.parent ? n.parent.tx + n.length * fade(n) : 0;
      n.x += (n.tx - n.x) * amount;
      n.ty = n.tx * n.fan;
      n.y = n.x * n.fan;
      n.leaves = n.children.length ? 0 : 1;
    }
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].parent) nodes[i].parent.leaves += nodes[i].leaves;
    }
  }

  function reserved(n) {
    return dropping?.nodes.includes(n) || [...matchings, ...readyActions].some(action => action.target === n || action.reservedNodes.includes(n));
  }

  function release() {
    // Vary the depth and side of the canopy so releases occur throughout
    // visible branches rather than following a tail or hiding behind the copy.
    const targetX = [.48, .73, .32, .61, .83][dropSerial % 5] * tree.length;
    const targetY = tree.spread * [-.45, .45, 0][dropSerial % 3];
    const eligible = nodes.filter(n => !reserved(n) && time >= n.releaseAfter && !n.structural && n.parent && n.children.length === 1 && clearOfCopy(n));
    eligible.sort((a, b) => {
      const score = n => Math.abs(n.x - targetX) + Math.abs(n.y - targetY) * .65;
      return score(a) - score(b);
    });
    dropSerial++;
    if (!eligible.length) return;
    const selected = [eligible[0]];
    const count = 2 + dropSerial % 2;
    while (selected.length < count) {
      const next = selected[selected.length - 1].children[0];
      if (!next || reserved(next) || next.structural || next.children.length !== 1 || !clearOfCopy(next)) break;
      selected.push(next);
    }
    return startMatching(selected[0], () => selectForDrop(selected), selected);
  }

  function selectForDrop(selected) {
    dropping = { nodes: selected, at: time };
    nextDrop = time + 5.4;
    // Selection and release do not trigger replacement. Every downstream tip
    // rests for 20–36 seconds after the removal while other regions can grow.
    for (const tip of tips) {
      for (let n = tip.node; n; n = n.parent) {
        if (n !== selected[0]) continue;
        tip.growAfter = time + selectionTime + removalTime + 20 + random() * 16;
        for (let descendant = tip.node; descendant && descendant !== selected[0]; descendant = descendant.parent) {
          descendant.releaseAfter = Math.max(descendant.releaseAfter, tip.growAfter + 10);
        }
        break;
      }
    }
  }

  function splice() {
    const removed = new Set(dropping.nodes);
    const first = dropping.nodes[0], lastNode = dropping.nodes[dropping.nodes.length - 1];
    const parent = first.parent;
    parent.children = parent.children.filter(n => n !== first);
    for (const child of lastNode.children) {
      child.parent = parent;
      parent.children.push(child);
    }
    nodes = nodes.filter(n => !removed.has(n));
    dropping = null;
    manualNext = 'grow';
  }

  function append(preferVisible = false) {
    let eligible = tips.filter(tip => !tip.reserved && time >= tip.growAfter && tip.node.tx + tree.unit <= tip.maxLength);
    if (preferVisible) {
      const visibleTips = eligible.filter(tip => clearOfCopy(tip.node));
      if (visibleTips.length) eligible = visibleTips;
    }
    if (!eligible.length) return false;
    const tip = eligible[Math.floor(random() * eligible.length)];
    const previous = tip.node, length = tree.unit;
    tip.reserved = true;
    return startMatching(previous, () => {
      tip.reserved = false;
      const n = add(previous, (previous.tx + length) * previous.fan, length);
      n.x = n.tx; n.y = n.ty; n.born = time; n.growDuration = .7;
      tip.node = n;
      tip.growAfter = time + 5 + random() * 9;
      nextAppend = time + 1.1 + random() * 1.1;
      return n;
    });
  }

  function curveControls(a, b) {
    const dx = (b.x - a.x) * .4;
    return [
      { x: a.x + dx, y: a.y + dx * a.fan },
      { x: b.x - dx, y: b.y - dx * b.fan }
    ];
  }

  function curvePoint(a, b, c1, c2, t) {
    const u = 1 - t;
    return {
      x: u*u*u*a.x + 3*u*u*t*c1.x + 3*u*t*t*c2.x + t*t*t*b.x,
      y: u*u*u*a.y + 3*u*u*t*c1.y + 3*u*t*t*c2.y + t*t*t*b.y
    };
  }

  function matchingPath(target) {
    const path = [];
    for (let n = target; n; n = n.parent) path.unshift(n);
    const points = [{ x: path[0].x, y: path[0].y, distance: 0 }];
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const [c1, c2] = curveControls(a, b);
      for (let j = 1; j <= 8; j++) {
        const p = curvePoint(a, b, c1, c2, j / 8);
        const last = points[points.length - 1];
        length += Math.hypot(p.x - last.x, p.y - last.y);
        points.push({ ...p, distance: length });
      }
    }
    return { points, length };
  }

  function startMatching(target, complete, reservedNodes = []) {
    const { length } = matchingPath(target);
    const kind = reservedNodes.length ? 'drop' : 'grow';
    const action = { target, complete, reservedNodes, kind, elapsed: 0,
      duration: Math.max(1.2, Math.min(2.4, length / 620)) };
    rootPulseInk = orbColors[kind].glow;
    if (reduced.matches) readyActions.push(action);
    else matchings.push(action);
    return true;
  }

  function applyReadyAction() {
    const index = dropping ? readyActions.findIndex(action => action.kind === 'grow') : 0;
    if (index < 0 || !readyActions.length) return;
    const action = readyActions.splice(index, 1)[0];
    const grown = action.complete();
    if (!reduced.matches) arrivals.push({ ...action, node: grown || action.target, at: time });
  }

  function advanceAction() {
    rootPulseAt = time;
    if (time < entranceEnd && !reduced.matches) {
      pendingAdvance++;
      draw(); play();
      return;
    }
    time = Math.max(time, entranceEnd);
    if (reduced.matches && dropping) splice();
    if (manualNext === 'grow' && append(true)) manualNext = 'select';
    else {
      if (release()) manualNext = 'grow';
      else if (append(true)) manualNext = 'select';
    }
    // Each click owns a new flight. Arrivals commit in order, reserving their
    // selected spans so concurrent requests never delete one another's target.
    applyReadyAction();
    autoResumeAt = time + 4;
    nextAppend = autoResumeAt + .8;
    nextDrop = autoResumeAt + 1.8;
    if (reduced.matches) layout(1);
    draw(); play();
  }

  function update(dt) {
    time += dt * (pendingAdvance && time < entranceEnd ? 4 : 1);
    if (pendingAdvance && time >= entranceEnd) {
      const clicks = pendingAdvance;
      pendingAdvance = 0;
      for (let i = 0; i < clicks; i++) advanceAction();
    }
    for (const action of matchings) action.elapsed += dt;
    const arrived = matchings.filter(action => action.elapsed >= action.duration);
    matchings = matchings.filter(action => action.elapsed < action.duration);
    readyActions.push(...arrived);
    if (dropping && time - dropping.at >= selectionTime + removalTime) splice();
    applyReadyAction();
    arrivals = arrivals.filter(arrival => time - arrival.at < (arrival.kind === 'grow' ? 1.05 : selectionTime + removalTime));
    if (time >= autoResumeAt && !matchings.length && !readyActions.length && !dropping) {
      if (time >= nextDrop) { release(); nextDrop = time + 5.4; }
      else if (time >= nextAppend) { append(); nextAppend = time + 1.1 + random() * 1.1; }
    }
    layout(1 - Math.exp(-dt * 3.4));
  }

  function fade(n) {
    return dropping?.nodes.includes(n) ? 1 - smooth((time - dropping.at - selectionTime) / removalTime) : 1;
  }

  function curve(a, b, opacity, color = ink, weight = 1.05, progress = 1) {
    const dx = b.x - a.x;
    if (dx < .1 || opacity < .002 || progress <= 0) return;
    // Continuous tangents along each branch; only genuine forks diverge.
    ctx.strokeStyle = `rgba(${color},${opacity})`; ctx.lineWidth = weight;
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    const [c1, c2] = curveControls(a, b);
    // Reveal the exact Bézier from its parent outward, rather than fading in
    // disconnected segments. De Casteljau keeps the growing tip on the curve.
    const mix = (p, q) => ({ x: p.x + (q.x - p.x) * progress, y: p.y + (q.y - p.y) * progress });
    const p1 = mix(a, c1), p2 = mix(c1, c2), p3 = mix(c2, b);
    const q1 = mix(p1, p2), q2 = mix(p2, p3), end = mix(q1, q2);
    ctx.bezierCurveTo(p1.x, p1.y, q1.x, q1.y, end.x, end.y);
    ctx.stroke();
  }

  function bead(n, alpha, radius = 1.8, color = ink) {
    ctx.fillStyle = `rgba(${color},${alpha})`;
    ctx.beginPath(); ctx.arc(n.x, n.y, radius, 0, Math.PI * 2); ctx.fill();
  }

  function drawCandidates(candidates, progress, opacity) {
    for (let i = 0; i < candidates.length; i++) {
      const n = candidates[i];
      const reveal = smooth((progress * (candidates.length + 1) - i) / 1.25);
      const alpha = reveal * opacity;
      if (i > 0) {
        curve(candidates[i - 1], n, .09 * alpha, selectedInk, 13);
        curve(candidates[i - 1], n, .78 * alpha, selectedInk, 1.65);
      }
      bead(n, .09 * alpha, 7, selectedInk);
      ctx.strokeStyle = `rgba(${selectedInk},${.60 * alpha})`; ctx.lineWidth = .85;
      ctx.beginPath(); ctx.arc(n.x, n.y, 4.2, 0, Math.PI * 2); ctx.stroke();
      bead(n, .93 * alpha, 2.45, selectedInk);
    }
  }

  function drawOrb(head, amplitude, glow, core) {
    bead(head, .035 * amplitude, 15, glow);
    bead(head, .10 * amplitude, 9, glow);
    bead(head, .76 * amplitude, 3.4, core);
    bead(head, .95 * amplitude, 1.6, '255,255,255');
  }

  function drawArrival(arrival) {
    const age = time - arrival.at;
    const { glow, core } = orbColors[arrival.kind];
    if (arrival.kind === 'drop') {
      const alpha = .85 * (1 - smooth((age - selectionTime) / removalTime));
      drawOrb(arrival.node, alpha, glow, core);
      return;
    }
    const b = arrival.node, a = b.parent, t = growthReveal(b);
    const [c1, c2] = curveControls(a, b);
    const head = curvePoint(a, b, c1, c2, t);
    const alpha = .85 * (1 - smooth(age / 1.05));
    curve(a, b, .46 * alpha, glow, 2, t);
    drawOrb(head, alpha, glow, core);
  }

  function drawMatching(matching) {
    const { points, length } = matchingPath(matching.target);
    const phase = clamp(matching.elapsed / matching.duration);
    const amplitude = smooth(phase / .14) * (1 - .15 * smooth((phase - .72) / .28));
    if (matching.kind === 'drop') drawCandidates(matching.reservedNodes, clamp((phase - .68) / .30), .95);
    const { glow, core } = orbColors[matching.kind];
    const progress = phase < .5 ? 4 * phase ** 3 : 1 - (-2 * phase + 2) ** 3 / 2;
    const center = progress * length;
    let head = points[0];
    // Home's additive gleam: a Gaussian highlight follows the existing path
    // while a small core travels to the edit location (gold) or growing tip (purple).
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (a.distance <= center && center <= b.distance) {
        const u = (center - a.distance) / Math.max(.001, b.distance - a.distance);
        head = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      }
      const envelope = Math.exp(-.5 * (((a.distance + b.distance) / 2 - center) / 24) ** 2);
      if (envelope < .02) continue;
      ctx.strokeStyle = `rgba(${glow},${.65 * amplitude * envelope})`;
      ctx.lineWidth = 1 + 3 * amplitude * envelope;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    drawOrb(head, amplitude, glow, core);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.save(); ctx.translate(tree.x, tree.y); ctx.rotate(tree.angle);
    for (const n of nodes) {
      const opacity = fade(n);
      const reveal = growthReveal(n);
      if (n.parent) {
        const edgeOpacity = Math.min(opacity, fade(n.parent));
        const mass = Math.min(1, Math.log2(1 + n.leaves) / 3.3);
        curve(n.parent, n, (.20 + .13 * mass) * edgeOpacity, ink, .72 + .58 * mass, reveal);
      }
      if (n !== tree.root) bead(n, .33 * opacity * smooth((reveal - .75) * 4), n.children.length > 1 ? 1.9 : (width < 600 ? 1.2 : 1.4));
    }
    const root = tree.root;
    bead(root, .38 * (reduced.matches ? 1 : smooth((time - root.born) / root.growDuration)), 2);
    for (const tip of tips) {
      const reveal = smooth((growthReveal(tip.node) - .75) * 4);
      bead(tip.node, .04 * reveal, 5);
      bead(tip.node, .48 * reveal, 1.8);
    }
    if (dropping) drawCandidates(dropping.nodes, 1, fade(dropping.nodes[0]));
    for (const matching of [...matchings, ...readyActions]) drawMatching(matching);
    for (const arrival of arrivals) drawArrival(arrival);
    const pulse = 1 - smooth((time - rootPulseAt) / .55);
    bead(root, .15 * pulse, 5 + 8 * (1 - pulse), rootPulseInk);
    bead(root, .8 * pulse, 3, rootPulseInk);
    ctx.restore();
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    if (width === rect.width && height === rect.height) return;
    width = rect.width; height = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setup(); draw();
  }
  function stop() { cancelAnimationFrame(raf); raf = null; last = null; }
  function tick(now) {
    raf = null;
    if (!visible || document.hidden || reduced.matches) { last = null; return; }
    if (last !== null && now - last < 1000 / 30 - 1) { raf = requestAnimationFrame(tick); return; }
    if (last !== null) update(Math.min((now - last) / 1000, .1));
    last = now; draw(); raf = requestAnimationFrame(tick);
  }
  function play() { if (raf === null && visible && !document.hidden && !reduced.matches) raf = requestAnimationFrame(tick); }
  // Multi-clicking text creates a browser selection too. Suppress actual
  // drags, not selected text, so every click can launch its own traveler.
  let pointerOrigin = null, pointerDragged = false;
  hero.addEventListener('pointerdown', event => {
    pointerOrigin = { id: event.pointerId, x: event.clientX, y: event.clientY };
    pointerDragged = false;
  });
  hero.addEventListener('pointermove', event => {
    if (pointerOrigin?.id === event.pointerId &&
        Math.hypot(event.clientX - pointerOrigin.x, event.clientY - pointerOrigin.y) > 6) pointerDragged = true;
  });
  hero.addEventListener('pointercancel', () => { pointerOrigin = null; pointerDragged = true; });
  hero.addEventListener('click', event => {
    const dragged = pointerDragged;
    pointerOrigin = null; pointerDragged = false;
    if (dragged || event.target.closest('a,button,input,select,textarea,summary,[contenteditable="true"]')) return;
    advanceAction();
  });
  document.getElementById('akv-hero-advance')?.addEventListener('click', advanceAction);
  reduced.addEventListener('change', () => {
    stop();
    if (reduced.matches) {
      readyActions.push(...matchings); matchings = []; arrivals = [];
      while (readyActions.length) { if (dropping) splice(); applyReadyAction(); }
      layout(1);
    }
    draw(); play();
  });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : play());
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; visible ? play() : stop(); }, { threshold: .05 }).observe(hero);
  const observer = new ResizeObserver(() => {
    const rect = hero.getBoundingClientRect();
    if (rect.width !== width || rect.height !== height) resize();
    else { setup(); draw(); }
  });
  observer.observe(hero);
  for (const el of hero.children) if (!el.matches('canvas,.akv-hero-wash,.akv-sr-only')) observer.observe(el);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', play);
  resize();
})();
