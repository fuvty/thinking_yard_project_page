import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html = await readFile(new URL('../projects/tah/content.html', import.meta.url), 'utf8');
const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(script => script.includes("getElementById('tokenCanvas')"));

test('TaH hero keeps animating when a smaller viewport rebuilds its token grid', () => {
  let rect = {width: 1440, height: 900}, nextFrame, resize, draws = 0;
  const context = new Proxy({}, {get: (_, key) => key === 'fillText' ? () => draws++ : () => {}});
  const canvas = {style: {}, getContext: () => context, parentElement: {
    style: {}, getBoundingClientRect: () => rect, addEventListener() {}
  }};
  const math = Object.create(Math);
  let seed = 17;
  math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
  vm.runInNewContext(source, {
    document: {getElementById: id => id === 'tokenCanvas' ? canvas : {textContent: ''}},
    window: {devicePixelRatio: 1, addEventListener: (name, fn) => {if (name === 'resize') resize = fn;}},
    requestAnimationFrame: fn => {nextFrame = fn;}, Math: math,
    SiteI18n: {t: text => text}
  });
  const advance = () => {const frame = nextFrame; nextFrame = null; assert.ok(frame); frame();};
  for (let frame = 0; frame < 600; frame++) advance();
  for (const width of [320, 1440, 390, 768]) {
    rect = {width, height: 740};
    resize();
    const before = draws;
    for (let frame = 0; frame < 120; frame++) advance();
    assert.ok(draws > before, `Canvas still draws after resizing to ${width}px`);
  }
});
