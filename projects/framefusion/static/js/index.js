const frameFusionAsset = path => globalThis.SiteI18n?.asset(path) || path;
window.HELP_IMPROVE_VIDEOJS = false;

function revealOnScroll() {
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(element => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;

        if (elementTop < windowHeight - elementVisible) {
            element.classList.add('active');
        }
    });
}

function initializeScrollReveal() {
    revealOnScroll();
    window.addEventListener('scroll', revealOnScroll, { passive: true });
    window.addEventListener('resize', revealOnScroll);
}

function initializeFrameFusionHero() {
    const canvas = document.getElementById('frameFusionHeroCanvas');
    if (!canvas) return;

    const hero = canvas.closest('.hero');
    const ctx = canvas.getContext('2d');
    if (!hero || !ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let frameCount = 0;
    let gridCols = 0;
    let gridRows = 0;
    let running = true;
    let animationStartTime = performance.now();
    let activeMergeCycle = -1;
    let activeMergeLayoutKey = "";
    let activeMergeCells = [];
    let mergeRandomBase = Math.floor(Math.random() * 100000);

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function smoothstep(edge0, edge1, value) {
        const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    }

    function easeOutCubic(value) {
        const t = clamp(value, 0, 1);
        return 1 - Math.pow(1 - t, 3);
    }

    function lerp(start, end, amount) {
        return start + (end - start) * amount;
    }

    function lerpPoint(start, end, amount) {
        return {
            x: lerp(start.x, end.x, amount),
            y: lerp(start.y, end.y, amount),
        };
    }

    function noise(a, b, c) {
        const x = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
        return x - Math.floor(x);
    }

    function seededRandom(seed) {
        const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
        return x - Math.floor(x);
    }

    function rgba(rgb, alpha) {
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    }

    function resizeHeroCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = hero.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        frameCount = width < 720 ? 10 : 16;
        gridCols = width < 720 ? 4 : 5;
        gridRows = width < 720 ? 3 : 4;
        activeMergeCycle = -1;
        activeMergeLayoutKey = "";

        if (reducedMotion) drawHeroFrame(animationStartTime + 4400);
    }

    function getIntroTiming() {
        const stagger = width < 720 ? 0.055 : 0.065;
        const span = width < 720 ? 0.95 : 1.10;
        const settle = 0.38;

        return {
            stagger,
            span,
            total: Math.max(0, frameCount - 1) * stagger + span + settle,
        };
    }

    function ringCenter() {
        return {
            x: width * 0.50,
            y: height * (width < 720 ? 0.53 : 0.52),
        };
    }

    function ringRadii() {
        return {
            x: Math.min(width * (width < 720 ? 0.38 : 0.43), width < 720 ? 240 : 620),
            y: Math.min(height * (width < 720 ? 0.34 : 0.36), width < 720 ? 250 : 340),
        };
    }

    function ringFrameMetrics(index, progress) {
        const angle = -Math.PI / 2 + (index / frameCount) * Math.PI * 2;
        const orbit = Math.sin(progress * Math.PI * 2 + index * 0.54) * 0.018;
        const depth = 0.32 + 0.68 * ((Math.sin(angle) + 1) / 2);
        const scale = (width < 720 ? 0.72 : 0.82) + depth * 0.22;
        const baseW = Math.min(width * (width < 720 ? 0.34 : 0.18), 230);
        const baseH = baseW * 0.62;
        const w = baseW * scale;
        const h = baseH * scale;
        const side = Math.cos(angle);
        const center = ringCenter();
        const radii = ringRadii();
        const ringX = center.x + Math.cos(angle + orbit) * radii.x;
        const ringY = center.y + Math.sin(angle + orbit) * radii.y;
        const ex = { x: w, y: -w * (0.08 + side * 0.025) };
        const ey = { x: -h * (0.18 + side * 0.10), y: h };
        const origin = {
            x: ringX - (ex.x + ey.x) / 2,
            y: ringY - (ex.y + ey.y) / 2,
        };

        return { index, depth, origin, ex, ey, w, h, angle };
    }

    function deckFrameMetrics(index) {
        const baseW = Math.min(width * (width < 720 ? 0.34 : 0.18), 230);
        const baseH = baseW * 0.62;
        const w = baseW * (width < 720 ? 0.92 : 1.00);
        const h = baseH * (width < 720 ? 0.92 : 1.00);
        const center = {
            x: width * 0.50,
            y: height * (width < 720 ? 0.075 : 0.095),
        };
        const ex = { x: w, y: -w * 0.08 };
        const ey = { x: -h * 0.22, y: h };
        const origin = {
            x: center.x - (ex.x + ey.x) / 2,
            y: center.y - (ex.y + ey.y) / 2,
        };

        return { index, depth: 0.34, origin, ex, ey, w, h, angle: -Math.PI / 2 };
    }

    function frameGeometry(index, progress, introElapsed) {
        const target = ringFrameMetrics(index, progress);
        const source = index === 0
            ? deckFrameMetrics(index)
            : ringFrameMetrics(index - 1, progress);
        const timing = getIntroTiming();
        const introRaw = reducedMotion
            ? 1
            : (introElapsed - index * timing.stagger) / timing.span;
        const intro = easeOutCubic(smoothstep(0, 1, introRaw));
        const visibility = reducedMotion ? 1 : smoothstep(-0.05, 0.08, introRaw);
        const origin = lerpPoint(source.origin, target.origin, intro);
        const ex = lerpPoint(source.ex, target.ex, intro);
        const ey = lerpPoint(source.ey, target.ey, intro);
        const depth = lerp(source.depth, target.depth, intro);
        const w = lerp(source.w, target.w, intro);
        const h = lerp(source.h, target.h, intro);
        const angle = lerp(source.angle, target.angle, intro);

        return { index, depth, origin, ex, ey, w, h, angle, intro, visibility };
    }

    function pointOnFrame(geom, u, v) {
        return {
            x: geom.origin.x + geom.ex.x * u + geom.ey.x * v,
            y: geom.origin.y + geom.ex.y * u + geom.ey.y * v,
        };
    }

    function pathPolygon(points) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
    }

    function drawProjectedToken(geom, u, v, size, color, alpha) {
        const du = size / Math.max(geom.w, 1);
        const dv = size / Math.max(geom.h, 1);
        const points = [
            pointOnFrame(geom, u - du, v - dv),
            pointOnFrame(geom, u + du, v - dv),
            pointOnFrame(geom, u + du, v + dv),
            pointOnFrame(geom, u - du, v + dv),
        ];

        pathPolygon(points);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    function getMergeCells(cycleIndex) {
        const layoutKey = `${frameCount}:${gridCols}:${gridRows}:${width < 720 ? "m" : "d"}`;
        if (activeMergeCycle === cycleIndex && activeMergeLayoutKey === layoutKey) {
            return activeMergeCells;
        }

        const count = width < 720 ? 5 : 8;
        const cells = [];
        const used = new Set();
        const blue = [0, 113, 227];

        for (let i = 0; i < count; i++) {
            const baseSeed = mergeRandomBase + (cycleIndex + 1) * 97 + i * 31 + frameCount * 13;
            const span = Math.min(
                frameCount - 1,
                3 + Math.floor(seededRandom(baseSeed + 1) * (width < 720 ? 2 : 3))
            );
            const ringSlot = Math.floor((i / count) * frameCount);
            const jitter = Math.floor((seededRandom(baseSeed + 2) - 0.5) * 3);
            const firstFrame = clamp(ringSlot + jitter, 0, Math.max(0, frameCount - span));
            let col = Math.floor(seededRandom(baseSeed + 3) * gridCols);
            let row = Math.floor(seededRandom(baseSeed + 4) * gridRows);

            for (let attempt = 0; attempt < 6 && used.has(`${firstFrame}:${col}:${row}`); attempt++) {
                col = (col + 1) % gridCols;
                if (col === 0) row = (row + 1) % gridRows;
            }

            used.add(`${firstFrame}:${col}:${row}`);
            cells.push({ firstFrame, span, col, row, color: blue });
        }

        activeMergeCycle = cycleIndex;
        activeMergeLayoutKey = layoutKey;
        activeMergeCells = cells;
        return activeMergeCells;
    }

    function isMergeCell(frameIndex, col, row, mergeCells) {
        return mergeCells.some(cell => (
            col === cell.col &&
            row === cell.row &&
            frameIndex >= cell.firstFrame &&
            frameIndex < Math.min(frameCount, cell.firstFrame + cell.span)
        ));
    }

    function getMergeTokenState(frameIndex, col, row, mergeCells, progress) {
        for (const cell of mergeCells) {
            const lastFrame = Math.min(frameCount, cell.firstFrame + cell.span) - 1;
            const inPath = col === cell.col &&
                row === cell.row &&
                frameIndex >= cell.firstFrame &&
                frameIndex <= lastFrame;

            if (!inPath) continue;

            const turnOn = smoothstep(0.16, 0.30, progress);
            const resetFade = 1 - smoothstep(0.90, 1.0, progress);
            const isEndpoint = frameIndex === lastFrame;
            const nonEndpointFade = isEndpoint ? 1 : 1 - smoothstep(0.66, 0.80, progress);

            return {
                active: turnOn * nonEndpointFade * resetFade,
                endpoint: isEndpoint,
                color: cell.color,
            };
        }

        return { active: 0, endpoint: false, color: [0, 113, 227] };
    }

    function drawFramePlane(geom, progress) {
        const visibility = geom.visibility ?? 1;
        if (visibility <= 0.001) return;

        const corners = [
            pointOnFrame(geom, 0, 0),
            pointOnFrame(geom, 1, 0),
            pointOnFrame(geom, 1, 1),
            pointOnFrame(geom, 0, 1),
        ];
        const depth = geom.depth;
        const resetFade = (1 - smoothstep(0.90, 1.0, progress) * 0.35) * visibility;

        ctx.save();
        ctx.shadowColor = `rgba(102, 126, 234, ${(0.045 + depth * 0.055) * visibility})`;
        ctx.shadowBlur = 18 + depth * 20;
        pathPolygon(corners);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.13 + depth * 0.10})`;
        ctx.globalAlpha = resetFade;
        ctx.fill();
        ctx.restore();

        pathPolygon(corners);
        ctx.strokeStyle = `rgba(102, 126, 234, ${(0.07 + depth * 0.08) * visibility})`;
        ctx.lineWidth = 1.15;
        ctx.stroke();
    }

    function drawFrameTokens(geom, progress, mergeCells) {
        const visibility = geom.visibility ?? 1;
        if (visibility <= 0.001) return;

        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridCols; col++) {
                const u = (col + 0.5) / gridCols;
                const v = (row + 0.5) / gridRows;
                const texture = noise(col, row, geom.index);
                const mergeState = getMergeTokenState(geom.index, col, row, mergeCells, progress);
                const active = mergeState.active;
                const base = 0.20 + geom.depth * 0.16 + texture * 0.05;
                const alpha = clamp(base + active * 0.30, 0.07, 0.62) * visibility;
                const size = (3.0 + active * 1.25) + geom.depth * 0.75;
                const color = active > 0.02 ? rgba(mergeState.color, 1) : 'rgb(134, 134, 139)';

                drawProjectedToken(geom, u, v, size, color, alpha);
            }
        }
    }

    function drawStackGuides(geometries, introGate) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(102, 126, 234, ${introGate * 0.05})`;
        for (const corner of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
            ctx.beginPath();
            geometries.forEach((geom, index) => {
                const point = pointOnFrame(geom, corner[0], corner[1]);
                if (index === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.closePath();
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawGlowPoint(point, radius, rgb, alpha) {
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 3.4);
        gradient.addColorStop(0, rgba(rgb, alpha));
        gradient.addColorStop(0.38, rgba(rgb, alpha * 0.26));
        gradient.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius * 3.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = rgba(rgb, Math.min(1, alpha + 0.15));
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawFusedTokenTile(point, size, rgb, alpha, tilt) {
        const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * 3.2);
        glow.addColorStop(0, rgba(rgb, alpha * 0.26));
        glow.addColorStop(0.50, rgba(rgb, alpha * 0.09));
        glow.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 3.2, 0, Math.PI * 2);
        ctx.fill();

        const c = Math.cos(tilt);
        const s = Math.sin(tilt);
        const halfW = size * 1.55;
        const halfH = size * 0.95;
        const corners = [
            { x: -halfW, y: -halfH },
            { x: halfW, y: -halfH },
            { x: halfW, y: halfH },
            { x: -halfW, y: halfH },
        ].map(corner => ({
            x: point.x + corner.x * c - corner.y * s,
            y: point.y + corner.x * s + corner.y * c,
        }));

        ctx.save();
        ctx.shadowColor = rgba(rgb, alpha * 0.32);
        ctx.shadowBlur = size * 1.45;
        pathPolygon(corners);
        ctx.fillStyle = rgba(rgb, alpha * 0.58);
        ctx.fill();
        ctx.strokeStyle = rgba(rgb, Math.min(1, alpha * 0.82));
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.restore();
    }

    function curvedSegmentControl(start, end) {
        const center = ringCenter();
        const radii = ringRadii();
        const midpoint = {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2,
        };
        const angleOf = point => Math.atan2(
            (point.y - center.y) / radii.y,
            (point.x - center.x) / radii.x
        );
        const radiusOf = point => Math.hypot(
            (point.x - center.x) / radii.x,
            (point.y - center.y) / radii.y
        );
        let startAngle = angleOf(start);
        let endAngle = angleOf(end);

        while (endAngle - startAngle > Math.PI) endAngle -= Math.PI * 2;
        while (endAngle - startAngle < -Math.PI) endAngle += Math.PI * 2;

        const midAngle = (startAngle + endAngle) / 2;
        const arcRadius = (radiusOf(start) + radiusOf(end)) / 2;
        const arcMidpoint = {
            x: center.x + Math.cos(midAngle) * radii.x * arcRadius,
            y: center.y + Math.sin(midAngle) * radii.y * arcRadius,
        };

        return {
            x: 2 * arcMidpoint.x - midpoint.x,
            y: 2 * arcMidpoint.y - midpoint.y,
        };
    }

    function quadraticPoint(start, control, end, progress) {
        const t = clamp(progress, 0, 1);
        const inv = 1 - t;

        return {
            x: inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x,
            y: inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y,
        };
    }

    function pointAlongCurvedPath(points, progress) {
        if (points.length === 0) return { x: 0, y: 0 };
        if (points.length === 1) return points[0];

        const scaled = clamp(progress, 0, 1) * (points.length - 1);
        const index = Math.min(points.length - 2, Math.floor(scaled));
        const local = scaled - index;
        const start = points[index];
        const end = points[index + 1];
        const control = curvedSegmentControl(start, end);

        return quadraticPoint(start, control, end, local);
    }

    function drawMergeSystem(progress, geometries, mergeCells) {
        const linkAlpha = smoothstep(0.16, 0.34, progress) *
            (1 - smoothstep(0.72, 0.88, progress)) *
            (1 - smoothstep(0.92, 1.0, progress));
        const mergeProgress = easeOutCubic(smoothstep(0.38, 0.66, progress));
        const fusedAlpha = smoothstep(0.64, 0.80, progress) *
            (1 - smoothstep(0.92, 1.0, progress));

        mergeCells.forEach((cell, cellIndex) => {
            const last = Math.min(frameCount, cell.firstFrame + cell.span);
            const pts = [];
            for (let frameIndex = cell.firstFrame; frameIndex < last; frameIndex++) {
                const geom = geometries[frameIndex];
                const u = (cell.col + 0.5) / gridCols;
                const v = (cell.row + 0.5) / gridRows;
                pts.push(pointOnFrame(geom, u, v));
            }
            if (pts.length < 2) return;

            const target = pts[pts.length - 1];

            if (linkAlpha > 0.01) {
                ctx.save();
                ctx.lineWidth = 1.6;
                ctx.strokeStyle = rgba(cell.color, 0.30 * linkAlpha);
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                    const control = curvedSegmentControl(pts[i - 1], pts[i]);
                    ctx.quadraticCurveTo(control.x, control.y, pts[i].x, pts[i].y);
                }
                ctx.stroke();
                ctx.restore();
            }

            for (let trail = 0; trail < 4; trail++) {
                const trailProgress = easeOutCubic(clamp(mergeProgress - trail * 0.07, 0, 1));
                if (trailProgress <= 0.001) continue;

                const moving = pointAlongCurvedPath(pts, trailProgress);
                const trailAlpha = 1 - trail * 0.22;
                const particleAlpha = (
                    linkAlpha * 0.34 +
                    smoothstep(0.34, 0.70, progress) *
                    (1 - smoothstep(0.78, 0.94, progress)) *
                    0.50
                ) * trailAlpha;

                drawGlowPoint(moving, 2.2 + trailProgress * 1.10 - trail * 0.16, cell.color, particleAlpha);
            }

            if (fusedAlpha > 0.01) {
                drawFusedTokenTile(
                    target,
                    3.4 + fusedAlpha * 1.35,
                    cell.color,
                    0.34 + fusedAlpha * 0.28,
                    -0.22 + cellIndex * 0.18
                );
            }
        });
    }

    function drawHeroFrame(now) {
        if (!width || !height) return;

        const cycle = 8.2;
        const currentTime = typeof now === 'number' ? now : performance.now();
        const introElapsed = (currentTime - animationStartTime) / 1000;
        const introTiming = getIntroTiming();
        const introGate = smoothstep(0, 1, (introElapsed - introTiming.total + 0.35) / 0.55);
        const loopElapsed = Math.max(0, introElapsed - introTiming.total);
        const cycleIndex = Math.floor(loopElapsed / cycle);
        const progress = ((loopElapsed % cycle) + cycle) % cycle / cycle;
        const effectProgress = introGate > 0 ? progress : 0;
        const mergeCells = getMergeCells(cycleIndex);
        const geometries = [];
        const drawOrder = [];

        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < frameCount; i++) {
            geometries.push(frameGeometry(i, progress, introElapsed));
        }
        drawOrder.push(...geometries);
        drawOrder.sort((a, b) => a.depth - b.depth);

        drawStackGuides(geometries, introGate);

        for (let i = 0; i < drawOrder.length; i++) {
            drawFramePlane(drawOrder[i], effectProgress);
            drawFrameTokens(drawOrder[i], effectProgress, mergeCells);
        }

        if (introGate > 0.02) {
            drawMergeSystem(progress, geometries, mergeCells);
        }

        if (!reducedMotion && running) {
            requestAnimationFrame(drawHeroFrame);
        }
    }

    resizeHeroCanvas();
    window.addEventListener('resize', resizeHeroCanvas);

    if (reducedMotion) return;

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            const visible = entries[0].isIntersecting;
            if (visible && !running) {
                running = true;
                requestAnimationFrame(drawHeroFrame);
            } else if (!visible) {
                running = false;
            }
        }, { threshold: 0.01 });
        observer.observe(hero);
    }

    requestAnimationFrame(drawHeroFrame);
}

function toggleExpand(header) {
    const section = header.closest('.expandable-section');
    if (!section) return;

    section.classList.toggle('open');

    if (section.classList.contains('open') && section.querySelector('#runtimeChart')) {
        setTimeout(() => {
            if (runtimeChart) {
                runtimeChart.resize();
            } else {
                updateRuntimeChart();
            }
        }, 520);
    }
}

const embeddedCSVData = `Model,Size,Method,VideoNIAH_Edit,VideoNIAH_Insert1,VideoNIAH_Insert2,VideoNIAH_Avg,NExT-QA_MC,NExT-QA_OE,NExT-QA_Avg,VideoMME_wo_sub,VideoMME_w_sub,VideoMME_Avg,EgoSchema,MVBench,Average\nLlava-Video,7B,Original,90.7,50.7,88.0,76.5,83.2,32.1,57.7,63.2,69.8,66.5,53.4,61.9,65.9\nLlava-Video,7B,StreamingLLM,26.0,15.3,28.7,23.3,79.0,30.3,54.7,54.7,65.5,60.1,46.6,55.2,44.6\nLlava-Video,7B,FastV,69.3,28.7,76.7,58.2,81.1,31.2,56.2,58.7,67.0,62.9,50.1,58.0,57.9\nLlava-Video,7B,PruMerge,83.3,36.0,83.3,67.5,79.4,30.8,55.1,60.0,68.6,64.3,50.7,56.0,60.9\nLlava-Video,7B,FrameFusion,90.0,48.7,87.3,75.3,81.8,31.7,56.8,61.3,69.9,65.6,53.0,59.7,64.8\nLlava-Video,72B,Original,89.3,66.0,88.0,81.1,85.3,32.3,58.8,70.9,77.3,74.1,65.0,63.9,70.9\nLlava-Video,72B,StreamingLLM,33.3,20.0,35.3,29.5,81.9,30.6,56.3,62.6,72.9,67.8,60.2,58.0,50.5\nLlava-Video,72B,FastV,22.0,48.7,77.3,49.3,83.7,31.5,57.6,65.9,73.7,69.8,62.6,61.7,58.6\nLlava-Video,72B,PruMerge,85.3,58.0,86.0,76.4,82.0,31.4,56.7,66.7,74.8,70.8,62.6,58.6,67.3\nLlava-Video,72B,FrameFusion,90.0,63.3,88.0,80.4,84.6,32.0,58.3,69.0,76.7,72.9,63.2,63.0,70.0\nNVILA,2B,Original,90.0,22.0,87.3,66.4,71.2,6.6,38.9,50.9,53.2,52.1,42.3,50.7,52.7\nNVILA,2B,StreamingLLM,26.0,12.7,34.7,24.5,69.0,5.8,37.4,45.7,50.1,47.9,40.7,49.1,37.1\nNVILA,2B,FastV,50.7,14.7,56.7,40.7,70.7,7.2,39.0,46.7,50.6,48.7,41.1,50.1,43.2\nNVILA,2B,PruMerge,27.3,31.3,81.3,46.6,67.7,11.1,39.4,47.3,50.4,48.9,42.2,48.0,45.2\nNVILA,2B,FrameFusion,89.3,27.3,87.3,68.0,71.8,20.1,46.0,50.4,53.1,51.8,45.2,49.5,54.9\nNVILA,8B,Original,98.7,40.7,100.0,79.8,81.7,33.0,57.4,63.9,68.3,66.1,52.0,67.5,67.3\nNVILA,8B,StreamingLLM,30.0,17.3,41.3,29.5,78.4,30.8,54.6,54.3,63.7,59.0,46.2,58.1,46.7\nNVILA,8B,FastV,87.3,33.3,90.7,70.4,80.4,32.5,56.5,59.5,66.8,63.2,50.5,64.5,62.8\nNVILA,8B,PruMerge,4.7,32.0,93.3,43.3,77.1,31.4,54.3,56.9,65.1,61.0,49.4,57.9,52.0\nNVILA,8B,FrameFusion,96.0,38.0,98.7,77.6,80.7,32.5,56.6,61.1,68.2,64.7,52.5,65.0,65.9\nNVILA,15B,Original,95.3,42.0,100.0,79.1,78.7,30.9,54.8,65.8,72.3,69.1,58.2,60.5,67.1\nNVILA,15B,StreamingLLM,34.0,18.7,34.0,28.9,74.0,28.5,51.3,58.5,65.1,61.8,53.7,55.0,46.8\nNVILA,15B,FastV,48.7,24.7,80.7,51.4,77.0,30.6,53.8,60.6,69.1,64.9,56.7,57.3,56.2\nNVILA,15B,PruMerge,19.3,43.3,98.0,53.5,72.4,30.0,51.2,59.3,68.4,63.9,52.3,52.8,55.1\nNVILA,15B,FrameFusion,94.0,52.7,99.3,82.0,77.7,31.2,54.5,63.5,70.8,67.2,57.8,58.4,67.3\nMiniCPM-V,8B,Original,88.7,36.7,88.7,71.4,78.9,13.8,46.4,58.5,60.3,59.4,53.4,55.0,59.3\nMiniCPM-V,8B,StreamingLLM,22.0,15.3,28.7,22.0,76.0,23.2,49.6,53.8,56.7,55.3,48.2,51.3,41.7\nMiniCPM-V,8B,FastV,82.7,26.7,71.3,60.2,78.0,14.8,46.4,56.7,58.2,57.5,51.8,53.2,54.8\nMiniCPM-V,8B,FrameFusion,89.3,41.3,89.3,73.3,78.2,16.3,47.3,57.4,59.5,58.5,52.3,53.6,59.7`;

$(document).ready(function() {

    initializeFrameFusionHero();
    initializeScrollReveal();

    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");
    });

    // Initialize Carousel
    const carousel = bulmaCarousel.attach('#results-carousel', {
      slidesToScroll: 1,
      slidesToShow: 1,
      infinite: true,
      autoplay: false,
      navigation: true,
      gap: 60
    });

    // Add carousel slide change event listener
    if (carousel && carousel.length > 0) {
      carousel[0].on('slide:change', function() {
        // Reset and restart loading animation when slide changes
        resetCarouselLoading();
      });
    }

    // Initialize slider
    const slider = document.getElementById('interpolation-slider');
    const wrapper = document.getElementById('interpolation-image-wrapper');

    // Total number of frames (0-63 based on the files)
    const totalFrames = 63;

    function updateImage(value) {
      const frameNumber = Math.round((totalFrames * value) / 100);
      wrapper.innerHTML = `
        <div class="columns is-centered">
          <div class="column">
            <img src="${frameFusionAsset(`./static/images/tom_jerry/frame_${frameNumber}.png`)}" class="interpolation-image">
          </div>
          <div class="column">
            <img src="${frameFusionAsset(`./static/images/tom_jerry_prune/frame_${frameNumber}.png`)}" class="interpolation-image">
          </div>
        </div>
      `;
    }

    if (slider && wrapper) {
      // Set initial image
      updateImage(0);

      // Update image when slider moves
      slider.addEventListener('input', function(e) {
        updateImage(e.target.value);
      });
    }

    bulmaSlider.attach();

    // Initialize carousel videos
    const carouselVideos = document.querySelectorAll('.carousel-video');
    carouselVideos.forEach(video => {
      // Set playback rate to complete in 10 seconds (66 frames at 1fps = 6.6x speed)
      video.playbackRate = 6.6;
    });

    // Initialize carousel answer loading animations
    initializeCarouselLoading();

    // Interactive Performance Table functionality
    initializePerformanceTable();

    // Initialize Runtime Comparison Chart
    initializeRuntimeChart();
});

// Performance Table functionality
let sortDirection = {};
let performanceData = [];

// Model size mapping
const modelSizes = {
    'Llava-Video': ['7B', '72B'],
    'NVILA': ['2B', '8B', '15B'],
    'MiniCPM-V': ['8B']
};

function initializePerformanceTable() {
    // Load CSV data
    loadCSVData();

    // Setup filter event listeners
    document.getElementById('modelFilter').addEventListener('change', handleModelChange);
    document.getElementById('sizeFilter').addEventListener('change', filterTable);

    // Initialize sort directions
    const headers = document.querySelectorAll('#performanceTable th[onclick*="sortTable"]');
    headers.forEach((header, index) => {
        sortDirection[index] = 'asc';
    });
}

function loadCSVData() {
    fetch(frameFusionAsset('./static/data/performance_results.csv'))
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
        })
        .then(csvText => {
            performanceData = parseCSV(csvText);
            populateTable(performanceData);
        })
        .catch(error => {
            console.error('Error loading CSV data:', error);
            if (typeof embeddedCSVData !== 'undefined') {
                performanceData = parseCSV(embeddedCSVData.replace(/\\n/g, '\n'));
                populateTable(performanceData);
            } else {
                document.getElementById('performanceTableBody').innerHTML = '<tr><td colspan="16">Failed to load performance data</td></tr>';
            }
        });
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index];
        });
        data.push(row);
    }

    return data;
}

function populateTable(data) {
    const tbody = document.getElementById('performanceTableBody');
    tbody.innerHTML = '';

    // Define metric columns (excluding sticky columns)
    const metricColumns = [
        'VideoNIAH_Avg', 'VideoNIAH_Edit', 'VideoNIAH_Insert1', 'VideoNIAH_Insert2',
        'NExT-QA_Avg', 'NExT-QA_MC', 'NExT-QA_OE',
        'VideoMME_Avg', 'VideoMME_wo_sub', 'VideoMME_w_sub',
        'EgoSchema', 'MVBench', 'Average'
    ];

    // Group data by model and size
    const modelSizeGroups = {};
    data.forEach(row => {
        const key = `${row.Model}-${row.Size}`;
        if (!modelSizeGroups[key]) {
            modelSizeGroups[key] = [];
        }
        modelSizeGroups[key].push(row);
    });

    // Find best compression method for each model-size combination (excluding Original)
    const bestCompressionMethods = {};
    Object.keys(modelSizeGroups).forEach(key => {
        const group = modelSizeGroups[key];
        const compressionMethods = group.filter(row => row.Method !== 'Original');

        if (compressionMethods.length > 0) {
            let bestRow = compressionMethods[0];
            let bestAverage = parseFloat(bestRow.Average) || 0;

            compressionMethods.forEach(row => {
                const average = parseFloat(row.Average) || 0;
                if (average > bestAverage) {
                    bestAverage = average;
                    bestRow = row;
                }
            });

            bestCompressionMethods[key] = bestRow.Method;
        }
    });

    // Find best scores for each column within each model-size group (excluding Original)
    const bestScores = {};
    Object.keys(modelSizeGroups).forEach(key => {
        const group = modelSizeGroups[key];
        const compressionMethods = group.filter(row => row.Method !== 'Original');
        bestScores[key] = {};

        metricColumns.forEach(column => {
            let bestScore = -Infinity;
            compressionMethods.forEach(row => {
                const score = parseFloat(row[column]) || 0;
                if (score > bestScore) {
                    bestScore = score;
                }
            });
            bestScores[key][column] = bestScore;
        });
    });

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-model', row.Model);
        tr.setAttribute('data-size', row.Size);
        tr.setAttribute('data-method', row.Method);

        const modelSizeKey = `${row.Model}-${row.Size}`;
        const isBestCompressionMethod = bestCompressionMethods[modelSizeKey] === row.Method;

        // Add best-result class for best compression method (blue shade)
        if (isBestCompressionMethod) {
            tr.classList.add('best-result');
        }

        // Check which cells should have best-score styling (exclude Original from getting blue text)
        const isOriginal = row.Method === 'Original';
        const isBestVideoNIAH = !isOriginal && parseFloat(row.VideoNIAH_Avg) === bestScores[modelSizeKey]['VideoNIAH_Avg'];
        const isBestVideoNIAHEdit = !isOriginal && parseFloat(row.VideoNIAH_Edit) === bestScores[modelSizeKey]['VideoNIAH_Edit'];
        const isBestVideoNIAHInsert1 = !isOriginal && parseFloat(row.VideoNIAH_Insert1) === bestScores[modelSizeKey]['VideoNIAH_Insert1'];
        const isBestVideoNIAHInsert2 = !isOriginal && parseFloat(row.VideoNIAH_Insert2) === bestScores[modelSizeKey]['VideoNIAH_Insert2'];
        const isBestNextQA = !isOriginal && parseFloat(row['NExT-QA_Avg']) === bestScores[modelSizeKey]['NExT-QA_Avg'];
        const isBestNextQAMC = !isOriginal && parseFloat(row['NExT-QA_MC']) === bestScores[modelSizeKey]['NExT-QA_MC'];
        const isBestNextQAOE = !isOriginal && parseFloat(row['NExT-QA_OE']) === bestScores[modelSizeKey]['NExT-QA_OE'];
        const isBestVideoMME = !isOriginal && parseFloat(row.VideoMME_Avg) === bestScores[modelSizeKey]['VideoMME_Avg'];
        const isBestVideoMMEWoSub = !isOriginal && parseFloat(row.VideoMME_wo_sub) === bestScores[modelSizeKey]['VideoMME_wo_sub'];
        const isBestVideoMMEWSub = !isOriginal && parseFloat(row.VideoMME_w_sub) === bestScores[modelSizeKey]['VideoMME_w_sub'];
        const isBestEgoSchema = !isOriginal && parseFloat(row.EgoSchema) === bestScores[modelSizeKey]['EgoSchema'];
        const isBestMVBench = !isOriginal && parseFloat(row.MVBench) === bestScores[modelSizeKey]['MVBench'];
        const isBestAverage = !isOriginal && parseFloat(row.Average) === bestScores[modelSizeKey]['Average'];

        tr.innerHTML = `
            <td class="sticky-col"><strong>${row.Model}</strong></td>
            <td class="sticky-col">${row.Size}</td>
            <td class="sticky-col"><span class="method-tag ${row.Method.toLowerCase()}">${row.Method}</span></td>
            <td class="metric-cell benchmark-avg${isBestVideoNIAH ? ' best-score' : ''}" data-benchmark="videoniah">${row.VideoNIAH_Avg}</td>
            <td class="metric-cell videoniah-sub${isBestVideoNIAHEdit ? ' best-score' : ''}" style="display: none;">${row.VideoNIAH_Edit}</td>
            <td class="metric-cell videoniah-sub${isBestVideoNIAHInsert1 ? ' best-score' : ''}" style="display: none;">${row.VideoNIAH_Insert1}</td>
            <td class="metric-cell videoniah-sub${isBestVideoNIAHInsert2 ? ' best-score' : ''}" style="display: none;">${row.VideoNIAH_Insert2}</td>
            <td class="metric-cell benchmark-avg${isBestNextQA ? ' best-score' : ''}" data-benchmark="nextqa">${row['NExT-QA_Avg']}</td>
            <td class="metric-cell nextqa-sub${isBestNextQAMC ? ' best-score' : ''}" style="display: none;">${row['NExT-QA_MC']}</td>
            <td class="metric-cell nextqa-sub${isBestNextQAOE ? ' best-score' : ''}" style="display: none;">${row['NExT-QA_OE']}</td>
            <td class="metric-cell benchmark-avg${isBestVideoMME ? ' best-score' : ''}" data-benchmark="videomme">${row.VideoMME_Avg}</td>
            <td class="metric-cell videomme-sub${isBestVideoMMEWoSub ? ' best-score' : ''}" style="display: none;">${row.VideoMME_wo_sub}</td>
            <td class="metric-cell videomme-sub${isBestVideoMMEWSub ? ' best-score' : ''}" style="display: none;">${row.VideoMME_w_sub}</td>
            <td class="metric-cell${isBestEgoSchema ? ' best-score' : ''}">${row.EgoSchema}</td>
            <td class="metric-cell${isBestMVBench ? ' best-score' : ''}">${row.MVBench}</td>
            <td class="metric-cell average-cell${isBestAverage ? ' best-score' : ''}">${row.Average}</td>
        `;

        tbody.appendChild(tr);
    });
}

function handleModelChange() {
    const modelFilter = document.getElementById('modelFilter');
    const sizeFilter = document.getElementById('sizeFilter');
    const selectedModel = modelFilter.value;

    // Clear size filter
    sizeFilter.innerHTML = '';

    if (selectedModel === '') {
        // No model selected - disable size filter
        sizeFilter.disabled = true;
        sizeFilter.innerHTML = '<option value="">Select a model family first</option>';
    } else {
        // Enable size filter and populate with sizes for selected model
        sizeFilter.disabled = false;
        sizeFilter.innerHTML = '<option value="">All Sizes</option>';

        if (modelSizes[selectedModel]) {
            modelSizes[selectedModel].forEach(size => {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = size;
                sizeFilter.appendChild(option);
            });
        }
    }

    // Apply filters
    filterTable();
}

function filterTable() {
    const modelFilter = document.getElementById('modelFilter').value;
    const sizeFilter = document.getElementById('sizeFilter').value;
    const table = document.getElementById('performanceTable');
    const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const model = row.getAttribute('data-model');
        const size = row.getAttribute('data-size');

        let showRow = true;

        if (modelFilter && model !== modelFilter) {
            showRow = false;
        }

        if (sizeFilter && size !== sizeFilter) {
            showRow = false;
        }

        row.style.display = showRow ? '' : 'none';
    }

    // Add highlight animation to visible rows
    setTimeout(() => {
        const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
        visibleRows.forEach(row => {
            row.classList.add('performance-highlight');
            setTimeout(() => row.classList.remove('performance-highlight'), 1000);
        });
    }, 100);
}

function sortTable(columnIndex) {
    // Define column mappings to data fields (matching sortTable onclick indices only)
    const columnMappings = [
        'Model',           // 0
        'Size',            // 1
        'Method',          // 2
        'VideoNIAH_Edit',  // 3 - VideoNIAH Edit (sub)
        'VideoNIAH_Insert1', // 4 - VideoNIAH Insert1 (sub)
        'VideoNIAH_Insert2', // 5 - VideoNIAH Insert2 (sub)
        'NExT-QA_MC',      // 6 - NExT-QA MC (sub)
        'NExT-QA_OE',      // 7 - NExT-QA OE (sub)
        'VideoMME_wo_sub', // 8 - VideoMME w/o sub (sub)
        'VideoMME_w_sub',  // 9 - VideoMME w/ sub (sub)
        'EgoSchema',       // 10 - EgoSchema
        'MVBench',         // 11 - MVBench
        'Average'          // 12 - Average
    ];

    const dataField = columnMappings[columnIndex];
    if (!dataField) {
        console.error('Invalid column index:', columnIndex);
        return;
    }

    const table = document.getElementById('performanceTable');
    const tbody = table.getElementsByTagName('tbody')[0];
    const rows = Array.from(tbody.getElementsByTagName('tr'));

    // Clear previous sort indicators from all headers
    const allHeaders = table.querySelectorAll('th');
    allHeaders.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });

    // Toggle sort direction
    const currentDirection = sortDirection[columnIndex] || 'asc';
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    sortDirection[columnIndex] = newDirection;

    // Find and update the correct header element using onclick attribute
    const targetHeader = table.querySelector(`th[onclick="sortTable(${columnIndex})"]`);
    if (targetHeader) {
        targetHeader.classList.add(newDirection === 'asc' ? 'sort-asc' : 'sort-desc');
    }

    // Sort rows based on data attributes
    rows.sort((a, b) => {
        const modelA = a.getAttribute('data-model');
        const sizeA = a.getAttribute('data-size');
        const methodA = a.getAttribute('data-method');

        const modelB = b.getAttribute('data-model');
        const sizeB = b.getAttribute('data-size');
        const methodB = b.getAttribute('data-method');

        // Find the corresponding data rows
        const rowDataA = performanceData.find(row =>
            row.Model === modelA && row.Size === sizeA && row.Method === methodA
        );
        const rowDataB = performanceData.find(row =>
            row.Model === modelB && row.Size === sizeB && row.Method === methodB
        );

        if (!rowDataA || !rowDataB) {
            return 0;
        }

        let aValue = rowDataA[dataField];
        let bValue = rowDataB[dataField];

        // Handle numeric values (columns 3 and above are metrics)
        if (columnIndex >= 3) {
            aValue = parseFloat(aValue);
            bValue = parseFloat(bValue);

            // Handle NaN values
            if (isNaN(aValue)) aValue = 0;
            if (isNaN(bValue)) bValue = 0;
        } else {
            // For text values, convert to string for comparison
            aValue = String(aValue || '').toLowerCase();
            bValue = String(bValue || '').toLowerCase();
        }

        // Compare values
        if (aValue < bValue) {
            return newDirection === 'asc' ? -1 : 1;
        } else if (aValue > bValue) {
            return newDirection === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // Add loading state
    table.classList.add('table-loading');

    // Reorder rows with animation
    setTimeout(() => {
        rows.forEach(row => tbody.appendChild(row));
        table.classList.remove('table-loading');

        // Add highlight animation to sorted rows
        rows.forEach((row, index) => {
            setTimeout(() => {
                if (row.style.display !== 'none') {
                    row.classList.add('performance-highlight');
                    setTimeout(() => row.classList.remove('performance-highlight'), 1000);
                }
            }, index * 50);
        });
    }, 200);
}

function toggleBenchmark(benchmarkName) {
    const header = document.getElementById(benchmarkName + '-header');
    const expandIcon = header.querySelector('.expand-icon');
    const subCols = document.querySelectorAll('.' + benchmarkName + '-sub');

    const isExpanded = expandIcon.classList.contains('fa-chevron-left');

    if (isExpanded) {
        // Collapse: hide subcategories, keep averages
        header.classList.remove('expanded');
        expandIcon.classList.remove('fa-chevron-left');
        expandIcon.classList.add('fa-chevron-right');

        // Hide subcategory headers
        subCols.forEach(col => {
            col.style.display = 'none';
        });

        // Keep the main benchmark header visible
        header.style.display = '';

        // Keep corresponding average cells visible
        const avgCells = document.querySelectorAll(`.benchmark-avg[data-benchmark="${benchmarkName}"]`);
        avgCells.forEach(cell => {
            cell.style.display = '';
        });

        // Hide all subcategory data cells
        const subDataCells = document.querySelectorAll(`td.${benchmarkName}-sub`);
        subDataCells.forEach(cell => {
            cell.style.display = 'none';
        });
    } else {
        // Expand: show subcategories, keep averages
        header.classList.add('expanded');
        expandIcon.classList.remove('fa-chevron-right');
        expandIcon.classList.add('fa-chevron-left');

        // Show subcategory headers
        subCols.forEach(col => {
            col.style.display = '';
        });

        // Keep the main benchmark header visible
        header.style.display = '';

        // Keep corresponding average cells visible
        const avgCells = document.querySelectorAll(`.benchmark-avg[data-benchmark="${benchmarkName}"]`);
        avgCells.forEach(cell => {
            cell.style.display = '';
        });

        // Show all subcategory data cells
        const subDataCells = document.querySelectorAll(`td.${benchmarkName}-sub`);
        subDataCells.forEach(cell => {
            cell.style.display = '';
        });
    }
}

function resetTable() {
    // Reset filters
    document.getElementById('modelFilter').value = '';
    document.getElementById('sizeFilter').value = '';
    document.getElementById('sizeFilter').disabled = true;
    document.getElementById('sizeFilter').innerHTML = '<option value="">Select a model family first</option>';

    // Reset sort indicators
    const headers = document.querySelectorAll('#performanceTable th');
    headers.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });

    ['videoniah', 'nextqa', 'videomme'].forEach(benchmarkName => {
        const benchmarkHeader = document.getElementById(benchmarkName + '-header');
        const expandIcon = benchmarkHeader?.querySelector('.expand-icon');
        benchmarkHeader?.classList.remove('expanded');
        expandIcon?.classList.remove('fa-chevron-left');
        expandIcon?.classList.add('fa-chevron-right');
        document.querySelectorAll('.' + benchmarkName + '-sub').forEach(col => {
            col.style.display = 'none';
        });
    });

    // Reset sort directions
    Object.keys(sortDirection).forEach(key => {
        sortDirection[key] = 'asc';
    });

    // Reset table to original order by repopulating with original data
    populateTable(performanceData);

    // Add reset animation
    const table = document.getElementById('performanceTable');
    const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');

    setTimeout(() => {
        Array.from(rows).forEach((row, index) => {
            setTimeout(() => {
                row.classList.add('performance-highlight');
                setTimeout(() => row.classList.remove('performance-highlight'), 1000);
            }, index * 30);
        });
    }, 100);
}

// Carousel loading animation functionality
function initializeCarouselLoading() {
    // First, ensure all loading elements are visible and content is hidden
    for (let i = 0; i < 3; i++) {
        const originalLoading = document.getElementById(`original-loading-${i}`);
        const originalContent = document.getElementById(`original-content-${i}`);
        const framefusionLoading = document.getElementById(`framefusion-loading-${i}`);
        const framefusionContent = document.getElementById(`framefusion-content-${i}`);
        const originalTimer = document.getElementById(`original-time-${i}`);
        const framefusionTimer = document.getElementById(`framefusion-time-${i}`);

        if (originalLoading) originalLoading.style.display = 'flex';
        if (originalContent) {
            originalContent.style.display = 'none';
            originalContent.classList.remove('loaded');
        }
        if (framefusionLoading) framefusionLoading.style.display = 'flex';
        if (framefusionContent) {
            framefusionContent.style.display = 'none';
            framefusionContent.classList.remove('loaded');
        }

        // Reset timers
        if (originalTimer) originalTimer.textContent = '0.0s';
        if (framefusionTimer) framefusionTimer.textContent = '0.0s';

        // Reset progress bars
        const originalProgress = originalLoading?.querySelector('.loading-progress-bar');
        const framefusionProgress = framefusionLoading?.querySelector('.loading-progress-bar');
        if (originalProgress) {
            originalProgress.style.width = '0%';
            originalProgress.style.transition = 'none';
        }
        if (framefusionProgress) {
            framefusionProgress.style.width = '0%';
            framefusionProgress.style.transition = 'none';
        }
    }

    // Token counts for each carousel item (Original, FrameFusion)
    const tokenData = [
        { original: 13440, framefusion: 4032 },
        { original: 10290, framefusion: 3087 },
        { original: 9870, framefusion: 2961 }
    ];

    // Base timing constants
    const BASE_DELAY = 500; // Base delay before starting (same for both)
    const TOKEN_FACTOR = 0.25; // Milliseconds per token (increased for more noticeable difference)
    const MIN_DELAY = 500; // Minimum delay in milliseconds
    const MAX_DELAY = 4000; // Maximum delay in milliseconds

    // Calculate delays for each carousel item
    tokenData.forEach((tokens, index) => {
        // Calculate proportional delays based on token count
        const originalDelay = Math.min(Math.max(tokens.original * TOKEN_FACTOR, MIN_DELAY), MAX_DELAY);
        const framefusionDelay = Math.min(Math.max(tokens.framefusion * TOKEN_FACTOR, MIN_DELAY), MAX_DELAY);

        // Log the timing for debugging
        console.log(`Carousel ${index}: Original ${tokens.original} tokens = ${originalDelay}ms, FrameFusion ${tokens.framefusion} tokens = ${framefusionDelay}ms`);

        // Start both animations at the same time (after BASE_DELAY)
        setTimeout(() => {
            // Animate progress bar for Original
            animateProgressBar(`original-loading-${index}`, originalDelay);

            // Animate progress bar for FrameFusion
            animateProgressBar(`framefusion-loading-${index}`, framefusionDelay);

            // Start timers for both
            startTimer(`original-time-${index}`, originalDelay);
            startTimer(`framefusion-time-${index}`, framefusionDelay);
        }, BASE_DELAY);

        // Complete Original loading after its delay
        setTimeout(() => {
            const loadingElement = document.getElementById(`original-loading-${index}`);
            const contentElement = document.getElementById(`original-content-${index}`);

            if (loadingElement && contentElement) {
                // Hide loading, show content
                loadingElement.style.display = 'none';
                contentElement.style.display = 'flex';
                contentElement.classList.add('loaded');
            }
        }, BASE_DELAY + originalDelay);

        // Complete FrameFusion loading after its delay (much shorter)
        setTimeout(() => {
            const loadingElement = document.getElementById(`framefusion-loading-${index}`);
            const contentElement = document.getElementById(`framefusion-content-${index}`);

            if (loadingElement && contentElement) {
                // Hide loading, show content
                loadingElement.style.display = 'none';
                contentElement.style.display = 'flex';
                contentElement.classList.add('loaded');
            }
        }, BASE_DELAY + framefusionDelay);
    });

    // Reset animation when carousel slides change
    const carousel = document.getElementById('results-carousel');
    if (carousel) {
        // Listen for carousel slide changes (if bulma carousel provides events)
        // For now, we'll reset on any interaction
        carousel.addEventListener('click', () => {
            // Reset all loading states
            resetCarouselLoading();
        });
    }
}

function animateProgressBar(loadingId, duration) {
    const loadingElement = document.getElementById(loadingId);
    if (!loadingElement) return;

    const progressBar = loadingElement.querySelector('.loading-progress-bar');
    if (!progressBar) return;

    // Reset progress bar
    progressBar.style.width = '0%';
    progressBar.style.transition = 'none';

    // Force reflow to ensure the reset takes effect
    progressBar.offsetHeight;

    // Start progress animation immediately
    progressBar.style.transition = `width ${duration}ms linear`;
    progressBar.style.width = '100%';
}

function startTimer(timerId, duration) {
    const timerElement = document.getElementById(timerId);
    if (!timerElement) return;

    const startTime = Date.now();
    const endTime = startTime + duration;

    // Store interval ID for cleanup
    const intervalId = setInterval(() => {
        const currentTime = Date.now();
        const elapsed = (currentTime - startTime) / 1000;

        if (currentTime >= endTime) {
            timerElement.textContent = `${(duration / 1000).toFixed(1)}s`;
            clearInterval(intervalId);
        } else {
            timerElement.textContent = `${elapsed.toFixed(1)}s`;
        }
    }, 100);

    // Store interval ID for cleanup during reset
    timerElement.dataset.intervalId = intervalId;
}

function resetCarouselLoading() {
    // Reset all loading and content elements
    for (let i = 0; i < 3; i++) {
        const originalLoading = document.getElementById(`original-loading-${i}`);
        const originalContent = document.getElementById(`original-content-${i}`);
        const framefusionLoading = document.getElementById(`framefusion-loading-${i}`);
        const framefusionContent = document.getElementById(`framefusion-content-${i}`);
        const originalTimer = document.getElementById(`original-time-${i}`);
        const framefusionTimer = document.getElementById(`framefusion-time-${i}`);

        if (originalLoading && originalContent) {
            originalLoading.style.display = 'flex';
            originalContent.style.display = 'none';
            originalContent.classList.remove('loaded');

            // Reset progress bar
            const originalProgress = originalLoading.querySelector('.loading-progress-bar');
            if (originalProgress) {
                originalProgress.style.width = '0%';
                originalProgress.style.transition = 'none';
            }
        }

        if (framefusionLoading && framefusionContent) {
            framefusionLoading.style.display = 'flex';
            framefusionContent.style.display = 'none';
            framefusionContent.classList.remove('loaded');

            // Reset progress bar
            const framefusionProgress = framefusionLoading.querySelector('.loading-progress-bar');
            if (framefusionProgress) {
                framefusionProgress.style.width = '0%';
                framefusionProgress.style.transition = 'none';
            }
        }

        // Clear and reset timers
        if (originalTimer) {
            if (originalTimer.dataset.intervalId) {
                clearInterval(originalTimer.dataset.intervalId);
            }
            originalTimer.textContent = '0.0s';
        }

        if (framefusionTimer) {
            if (framefusionTimer.dataset.intervalId) {
                clearInterval(framefusionTimer.dataset.intervalId);
            }
            framefusionTimer.textContent = '0.0s';
        }
    }

    // Re-initialize after a short delay
    setTimeout(() => {
        initializeCarouselLoading();
    }, 100);
}

// Runtime Comparison Chart functionality
let runtimeChart = null;
let runtimeData = [];

function initializeRuntimeChart() {
  // Load runtime data
  loadRuntimeData();

  // Setup event listeners
  document.getElementById('runtimeModelSelect').addEventListener('change', updateRuntimeChart);
  document.getElementById('runtimeCostSelect').addEventListener('change', updateRuntimeChart);

  // Initialize chart
  updateRuntimeChart();
}

function loadRuntimeData() {
  // Parse the CSV data from the file
  const csvData = `Model,n_frames,cost,num GPU,Prefill time
Llava-Video-7B,32,1.0,1,917.81
Llava-Video-7B,32,0.3,1,569.56
Llava-Video-7B,32,0.5,1,672.66
Llava-Video-7B,32,0.7,1,771.84
Llava-Video-7B,64,1.0,1,1900.63
Llava-Video-7B,64,0.3,1,1111.81
Llava-Video-7B,64,0.5,1,1317.25
Llava-Video-7B,64,0.7,1,1547.23
Llava-Video-7B,85,1.0,1,2605.55
Llava-Video-7B,85,0.3,1,1472.56
Llava-Video-7B,85,0.5,1,1763.23
Llava-Video-7B,85,0.7,1,2081.31
Llava-Video-7B,107,1.0,1,3377.91
Llava-Video-7B,107,0.3,1,1848.56
Llava-Video-7B,107,0.5,1,2232.30
Llava-Video-7B,107,0.7,1,2669.80
Llava-Video-7B,128,1.0,1,4184.29
Llava-Video-7B,128,0.3,1,2222.68
Llava-Video-7B,128,0.5,1,2699.80
Llava-Video-7B,128,0.7,1,3251.99
Llava-Video-7B,256,1.0,1,9510.37
Llava-Video-7B,256,0.3,1,4499.91
Llava-Video-32B,32,1.0,1,2147.56
Llava-Video-32B,32,0.3,1,912.16
Llava-Video-32B,32,0.5,1,1253.50
Llava-Video-32B,32,0.7,1,1652.82
Llava-Video-32B,64,1.0,1,4506.73
Llava-Video-32B,64,0.3,1,1800.40
Llava-Video-32B,64,0.5,1,2496.15
Llava-Video-32B,64,0.7,1,3244.05
Llava-Video-32B,85,1.0,1,6102.58
Llava-Video-32B,85,0.3,1,2372.43
Llava-Video-32B,85,0.5,1,3380.78
Llava-Video-32B,85,0.7,1,4415.20
Llava-Video-32B,32,1.0,2,2328.48
Llava-Video-32B,32,0.3,2,976.63
Llava-Video-32B,32,0.5,2,1375.00
Llava-Video-32B,32,0.7,2,1800.41
Llava-Video-32B,64,1.0,2,4875.98
Llava-Video-32B,64,0.3,2,1886.05
Llava-Video-32B,64,0.5,2,2697.06
Llava-Video-32B,64,0.7,2,3497.02
Llava-Video-32B,128,1.0,2,10435.84
Llava-Video-32B,128,0.3,2,3751.30
Llava-Video-32B,128,0.5,2,5522.17
Llava-Video-32B,128,0.7,2,7315.20
Llava-Video-72B,32,1.0,4,5378.17
Llava-Video-72B,32,0.3,4,1982.71
Llava-Video-72B,32,0.5,4,2939.21
Llava-Video-72B,32,0.7,4,3875.52
Llava-Video-72B,64,1.0,4,11143.49
Llava-Video-72B,64,0.3,4,3879.13
Llava-Video-72B,64,0.5,4,5833.23
Llava-Video-72B,64,0.7,4,7844.65
Llava-Video-72B,128,1.0,4,24510.41
Llava-Video-72B,128,0.3,4,7760.40
Llava-Video-72B,128,0.5,4,12093.20
Llava-Video-72B,128,0.7,4,16827.84
Llava-Video-72B,256,1.0,4,55913.13
Llava-Video-72B,256,0.3,4,15609.24`;

  const lines = csvData.split('\n');
  const headers = lines[0].split(',');

  runtimeData = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index].trim();
      });
      runtimeData.push(row);
    }
  }
}

function updateRuntimeChart() {
  const selectedModel = document.getElementById('runtimeModelSelect').value;
  const selectedCost = parseFloat(document.getElementById('runtimeCostSelect').value);

  // Determine GPU count based on model and cost combination
  let selectedGpu = 1; // Default
  if (selectedModel === 'Llava-Video-72B') {
    selectedGpu = 4; // Llava-Video-72B always uses 4 GPUs
  } else if (selectedModel === 'Llava-Video-32B') {
    // For Llava-Video-32B, check if 2 GPU data exists for the selected cost
    const has2GpuData = runtimeData.some(row =>
      row.Model === selectedModel &&
      parseFloat(row.cost) === selectedCost &&
      parseInt(row['num GPU']) === 2
    );
    if (has2GpuData) {
      selectedGpu = 2;
    } else {
      selectedGpu = 1;
    }
  }
  // Llava-Video-7B always uses 1 GPU

  // Filter data for selected model and GPU count
  const filteredData = runtimeData.filter(row =>
    row.Model === selectedModel &&
    parseInt(row['num GPU']) === selectedGpu
  );

  // Get unique frame counts
  const allFrameCounts = [...new Set(filteredData.map(row => parseInt(row.n_frames)))].sort((a, b) => a - b);

  // Filter frame counts to only include those with complete data (both selected cost and full cost)
  const frameCounts = allFrameCounts.filter(frames => {
    const hasSelectedCost = filteredData.some(row =>
      parseInt(row.n_frames) === frames &&
      parseFloat(row.cost) === selectedCost
    );
    const hasFullCost = filteredData.some(row =>
      parseInt(row.n_frames) === frames &&
      parseFloat(row.cost) === 1.0
    );
    return hasSelectedCost && hasFullCost;
  });

  // Prepare chart data
  const labels = frameCounts.map(frames => `${frames} frames`);
  const selectedCostData = [];
  const fullCostData = [];

  frameCounts.forEach(frames => {
    const selectedCostRow = filteredData.find(row =>
      parseInt(row.n_frames) === frames &&
      parseFloat(row.cost) === selectedCost
    );
    const fullCostRow = filteredData.find(row =>
      parseInt(row.n_frames) === frames &&
      parseFloat(row.cost) === 1.0
    );

    selectedCostData.push(parseFloat(selectedCostRow['Prefill time']));
    fullCostData.push(parseFloat(fullCostRow['Prefill time']));
  });

  // Calculate speedup statistics
  const speedups = selectedCostData.map((selected, index) =>
    fullCostData[index] > 0 ? fullCostData[index] / selected : 0
  ).filter(speedup => speedup > 0);

  const avgSpeedup = speedups.length > 0 ? speedups.reduce((a, b) => a + b, 0) / speedups.length : 0;
  const maxSpeedup = speedups.length > 0 ? Math.max(...speedups) : 0;
  const minSpeedup = speedups.length > 0 ? Math.min(...speedups) : 0;

  // Update speedup summary
  updateSpeedupSummary(avgSpeedup, maxSpeedup, minSpeedup, selectedCost);

  // Create or update chart
  const ctx = document.getElementById('runtimeChart');
  if (runtimeChart) {
    runtimeChart.destroy();
  }

  runtimeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: `FrameFusion (${selectedCost * 100}% cost)`,
          data: selectedCostData,
          backgroundColor: 'rgba(0, 113, 227, 0.82)',
          borderColor: 'rgba(0, 113, 227, 1)',
          borderWidth: 1
        },
        {
          label: 'Original (100% cost)',
          data: fullCostData,
          backgroundColor: 'rgba(134, 134, 139, 0.72)',
          borderColor: 'rgba(134, 134, 139, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Runtime Comparison: ${selectedModel} (${selectedGpu} GPU${selectedGpu > 1 ? 's' : ''})`,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} ms`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Prefill Time (ms)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Number of Frames'
          }
        }
      }
    }
  });
}

function updateSpeedupSummary(avgSpeedup, maxSpeedup, minSpeedup, selectedCost) {
  const summaryDiv = document.getElementById('speedupSummary');
  summaryDiv.innerHTML = `
    <div class="speedup-stats">
      <div class="speedup-stat">
        <div class="value">${avgSpeedup.toFixed(2)}x</div>
        <div class="label">Average Speedup</div>
      </div>
      <div class="speedup-stat">
        <div class="value">${maxSpeedup.toFixed(2)}x</div>
        <div class="label">Maximum Speedup</div>
      </div>
      <div class="speedup-stat">
        <div class="value">${minSpeedup.toFixed(2)}x</div>
        <div class="label">Minimum Speedup</div>
      </div>
      <div class="speedup-stat">
        <div class="value">${(selectedCost * 100).toFixed(0)}%</div>
        <div class="label">Token Budget</div>
      </div>
    </div>
  `;
}
