import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../projects/tah2/static/js/hero-iterations.js', import.meta.url), 'utf8');
function setup(reduced = false) {
  let now = 0, nextFrame = 0;
  const callbacks = new Map(), handlers = new Map();
  class Element {
    constructor(control = false) { this.control = control; }
    closest() { return this.control ? this : null; }
  }
  const target = new Element();
  function context() {
    const strokes = [];
    return {strokes, clearRect() { strokes.length = 0; }, setTransform() {}, save() {}, restore() {}, translate() {},
      beginPath() {}, moveTo() {}, lineTo() {}, setLineDash() {}, fill() {},
      stroke() { strokes.push('stroke'); },
      arc(x, y, radius) { assert.ok(Number.isFinite(x) && Number.isFinite(y) && radius >= 0); },
      createRadialGradient() { return {addColorStop() {}}; }};
  }
  const background = context(), response = context();
  const hero = {getBoundingClientRect: () => ({width: 1100, height: 800, left: 0, top: 0}),
    addEventListener: (name, fn) => handlers.set(name, fn)};
  const canvas = {getContext: () => background, closest: () => hero};
  const responseCanvas = {getContext: () => response};
  const motion = {matches: reduced, addEventListener(name, fn) { this.change = fn; }};
  const win = {scrollY: 0, getSelection: () => ({toString: () => ''}), addEventListener() {}};
  vm.runInNewContext(source, {Element, window: win, document: {hidden: false, addEventListener() {},
    getElementById: id => id === 'iterationField' ? canvas : responseCanvas},
    matchMedia: query => query.includes('reduced-motion') ? motion : {matches: false},
    devicePixelRatio: 1, performance: {now: () => now},
    requestAnimationFrame: fn => { callbacks.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame: id => callbacks.delete(id),
    ResizeObserver: class {observe() {}}, IntersectionObserver: class {observe() {}},
  });
  function advance(seconds) {
    for (let i = 0; i < Math.ceil(seconds * 60); i++) {
      now += 1000 / 60;
      const pending = [...callbacks.values()]; callbacks.clear();
      pending.forEach(fn => fn(now));
    }
  }
  function send(name, extra = {}) {
    handlers.get(name)?.({isPrimary: true, button: 0, pointerId: 1, pointerType: 'touch', clientX: 280, clientY: 200, target, ...extra});
  }
  return {advance, send, response, motion, win, control: new Element(true), callbacks};
}

test('TaH2 taps draw an excursion, allow another lane to respond, and clear after resuming', () => {
  const h = setup(); h.advance(2);
  h.send('pointerdown'); h.send('pointerup');
  assert.ok(h.response.strokes.length > 0);
  h.advance(.3);
  h.send('pointerdown', {clientX: 700}); h.send('pointerup', {clientX: 700});
  assert.ok(h.response.strokes.length > 0);
  h.advance(5);
  assert.equal(h.response.strokes.length, 0);
  h.send('pointerdown'); h.send('pointerup');
  assert.ok(h.response.strokes.length > 0, 'lanes remain interactive after returning');
});

test('TaH2 controls, drags, scrolling and cancelled gestures do not trigger excursions', () => {
  const h = setup(); h.advance(2);
  h.send('pointerdown', {target: h.control}); h.send('pointerup', {target: h.control});
  h.send('pointerdown'); h.send('pointermove', {clientX: 320}); h.send('pointerup');
  h.send('pointerdown'); h.win.scrollY = 50; h.send('pointerup');
  h.send('pointerdown'); h.send('pointercancel'); h.send('pointerup');
  assert.equal(h.response.strokes.length, 0);
});

test('TaH2 reduced motion uses static feedback and can switch back to animation', () => {
  const h = setup(true);
  assert.equal(h.callbacks.size, 0);
  h.send('pointerdown'); h.send('pointerup');
  assert.equal(h.response.strokes.length, 1);
  assert.equal(h.callbacks.size, 0);
  h.motion.matches = false; h.motion.change(); h.advance(2);
  h.send('pointerdown'); h.send('pointerup');
  assert.ok(h.response.strokes.length > 1);
  h.motion.matches = true; h.motion.change();
  assert.equal(h.callbacks.size, 0);
});
