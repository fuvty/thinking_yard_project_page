import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../projects/akv/static/js/hero-flow.js', import.meta.url), 'utf8');
function scene() {
  const events = {}, selection = {isCollapsed: true};
  const ctx = new Proxy({}, {get: () => () => {}, set: () => true});
  const hero = {children: [], getBoundingClientRect: () => ({width: 1280, height: 800, left: 0, top: 0}), addEventListener: (name, fn) => {events[name] = fn;}};
  const math = Object.create(Math); math.random = () => .113;
  const sandbox = {
    document: {querySelector: () => hero, getElementById: () => ({getContext: () => ctx, addEventListener() {}}), addEventListener() {}, hidden: false},
    window: {addEventListener() {}, getSelection: () => selection},
    matchMedia: () => ({matches: false, addEventListener() {}}), Math: math, devicePixelRatio: 1,
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    IntersectionObserver: class {observe() {}}, ResizeObserver: class {observe() {}}
  };
  vm.runInNewContext(source.replace('  resize();\n})();', '  resize();\n globalThis.probe = {update, get: () => ({nodes, matchings, readyActions, time, entranceEnd})};\n})();'), sandbox);
  const probe = sandbox.probe;
  while (probe.get().time < probe.get().entranceEnd + .05) probe.update(1 / 30);
  const emit = (name, data = {}) => events[name]?.({button: 0, pointerId: 1, clientX: 400, clientY: 300, target: {closest: () => false}, ...data});
  return {...probe, emit, selection};
}

test('rapid hero clicks launch parallel matches even when multi-click selects text', () => {
  const s = scene(), before = s.get().nodes.length;
  for (let detail = 1; detail <= 6; detail++) {
    s.emit('pointerdown');
    s.selection.isCollapsed = detail === 1;
    s.emit('click', {detail});
  }
  assert.equal(s.get().matchings.length, 6);
  assert.equal(s.get().nodes.length, before, 'Updates wait for orb arrival');
  const flights = [...s.get().matchings];
  for (let i = 0; i < 600; i++) {
    s.update(1 / 30);
    const {nodes, matchings, readyActions} = s.get(), live = new Set(nodes);
    for (const flight of [...matchings, ...readyActions]) assert(live.has(flight.target));
    for (const node of nodes) if (node.parent) assert(live.has(node.parent));
  }
  assert(flights.every(f => !s.get().matchings.includes(f) && !s.get().readyActions.includes(f)));
});

test('dragging, cancelled gestures and links do not launch hero matches', () => {
  const s = scene();
  s.emit('pointerdown');
  s.emit('pointermove', {clientX: 430});
  s.emit('pointermove'); // Returning to the origin still counts as a drag.
  s.selection.isCollapsed = false;
  s.emit('click', {detail: 2});
  assert.equal(s.get().matchings.length, 0);
  s.emit('pointerdown'); s.emit('pointercancel'); s.emit('click', {detail: 1});
  assert.equal(s.get().matchings.length, 0);
  s.emit('pointerdown'); s.emit('click', {detail: 1, target: {closest: () => true}});
  assert.equal(s.get().matchings.length, 0);
  s.emit('pointerdown'); s.emit('click', {detail: 1});
  assert.equal(s.get().matchings.length, 1, 'A fresh click works after a drag or selected text');
});
