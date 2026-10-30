import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../projects/tah2/static/js/chart-motion.js', import.meta.url), 'utf8');
function setup(reduced = false) {
  const frames = new Map(), draws = [], roots = [{}, {}], listeners = {};
  let next = 0, visibility, preference, now = 0;
  const motion = {matches: reduced, addEventListener(_, fn) { preference = fn; }};
  const document = {hidden: false, addEventListener(name, fn) { listeners[name] = fn; }};
  const context = {
    window: {}, document, matchMedia: () => motion,
    requestAnimationFrame(fn) { frames.set(++next, fn); return next; },
    cancelAnimationFrame(id) { frames.delete(id); },
    IntersectionObserver: class { constructor(fn) { visibility = fn; } observe() {} }
  };
  vm.runInNewContext(source, context);
  const api = context.window.TaH2Charts;
  const controller = api.create({roots, draw: ms => draws.push(ms)});
  return {
    api, controller, draws, frames,
    visible(value, ratio = value ? 1 : 0, index = 0) { visibility([{target: roots[index], isIntersecting: value, intersectionRatio: ratio}]); },
    hidden(value) { document.hidden = value; listeners.visibilitychange(); },
    reduced(value) { motion.matches = value; preference(); },
    advance(count) { for (let i = 0; i < count; i++) { now += 50; const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(now)); } }
  };
}

test('TaH2 reveals reasoning before all looped variants, with non-linear timing', () => {
  const {api} = setup();
  assert.equal(api.progress(900, true), 1);
  assert.equal(api.progress(api.loopStart, false), 0);
  assert.equal(api.progress(api.duration, false), 1);
  assert.ok(api.progress(api.loopStart + 850, false) > .5);
  for (const baseline of [true, false]) {
    const values = Array.from({length: 60}, (_, i) => api.progress(i * 50, baseline));
    assert.ok(values.every((value, i) => value >= 0 && value <= 1 && (!i || value >= values[i - 1])));
  }
});

test('TaH2 range selection preserves measured points and shares the 16K boundary', () => {
  const {api} = setup();
  const data = [4, 8, 16, 20, 32].map(cutoff => Object.freeze({cutoff, accuracy: cutoff / 3}));
  Object.freeze(data);
  assert.deepEqual(api.points(data, '16'), data.slice(0, 3));
  assert.deepEqual(api.points(data, '32'), data.slice(2));
  assert.deepEqual(api.context(data, '32'), data.slice(0, 3));
  assert.equal(api.context(data, '16').length, 0);
  assert.deepEqual([...new Set([...api.context(data, '32'), ...api.points(data, '32')])], data);
});

test('TaH2 stroke timing follows curve length independently of plot position', () => {
  const {api} = setup();
  const points = [{x: 100, y: 40}, {x: 130, y: 40}, {x: 130, y: 80}];
  const halfway = api.trace(points, .5);
  assert.equal(halfway.points.at(-1).x, 130);
  assert.equal(halfway.points.at(-1).y, 45); // 35 of 70 pixels, including the turn.
  assert.equal(halfway.opacity(1), 1);
  assert.equal(halfway.opacity(2), 0);
  const shifted = api.trace(points.map(p => ({x: p.x + 500, y: p.y})), .5);
  assert.equal(shifted.points.at(-1).x - 500, halfway.points.at(-1).x);
  assert.equal(shifted.points.at(-1).y, halfway.points.at(-1).y);
  assert.equal(api.trace(points, 0).points.length, 0);
  const complete = api.trace(points, 1);
  assert.deepEqual(Array.from(complete.points), points);
  assert.equal(complete.opacity(2), 1);
  assert.equal(api.trace([points[0], points[0]], .5).opacity(1), 1);
});

test('TaH2 finishes once, pauses in hidden tabs, and replays only after a full exit', () => {
  const h = setup();
  assert.equal(h.frames.size, 0);
  h.visible(true); h.advance(5);
  h.hidden(true); const paused = h.draws.at(-1); h.advance(20);
  assert.equal(h.draws.at(-1), paused);
  h.hidden(false); h.advance(60);
  assert.equal(h.draws.at(-1), h.api.duration);
  assert.equal(h.frames.size, 0);
  h.visible(true, .05); h.visible(true, .2);
  assert.equal(h.frames.size, 0);
  h.visible(true, 1, 1); h.visible(false);
  assert.equal(h.frames.size, 0); // The other chart in the group is still visible.
  h.visible(false, 0, 1); h.visible(true, .01);
  assert.equal(h.frames.size, 0);
  h.visible(true, .2);
  assert.equal(h.draws.at(-1), 0);
  for (let i = 0; i < 10; i++) h.controller.restart();
  assert.equal(h.frames.size, 1);
  h.advance(60);
  assert.equal(h.draws.at(-1), h.api.duration);
  assert.equal(h.frames.size, 0);
});

test('TaH2 reduced motion shows final data and never starts an automatic replay', () => {
  const h = setup(true);
  h.visible(true); h.controller.restart();
  assert.equal(h.draws.at(-1), h.api.duration);
  assert.equal(h.frames.size, 0);
  h.reduced(false);
  assert.equal(h.frames.size, 0);
  h.controller.restart(); h.advance(3); h.reduced(true);
  assert.equal(h.draws.at(-1), h.api.duration);
  assert.equal(h.frames.size, 0);
});
