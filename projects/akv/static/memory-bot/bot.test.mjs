import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const context = {};
for (const name of ['scene', 'state', 'bot']) {
  runInNewContext(readFileSync(new URL(`./${name}.js`, import.meta.url), 'utf8'), context);
}
const scene = context.AKVMemoryBotScene;
const policy = context.AKVMemoryBotPolicy;
const createPlayback = context.AKVMemoryBotPlayback;
const plain = value => JSON.parse(JSON.stringify(value));
const finish = playback => playback.tick(playback.state.action.duration);
const inventories = [[193], [256], [319], [193,256], [193,319], [256,319], [193,256,319]];
const action = (operation, before = [193,256,319], index = 0) => ({operation,before,index,time:0});
const at = (a, time) => scene.sample({...a,time});
function complete(playback) {
  const operations = [];
  while (playback.state.running && operations.length < 100) {
    operations.push(playback.state.action.operation);
    finish(playback);
  }
  assert.equal(playback.state.running, false, 'every request must terminate');
  return operations;
}
function seeded(seed = 17) {
  return () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
}

test('transition probabilities cover every inventory and reserve rare tail targets', () => {
  for (const slots of inventories) {
    const options = policy.transitions(slots);
    assert(Math.abs(options.reduce((s,o) => s+o.probability, 0)-1) < 1e-12);
    for (const option of options) {
      assert(option.probability > 0);
      if (option.value === 'Append') assert(slots.at(-1) < 319);
      if (option.value === 'Drop') assert(slots.length >= 2);
      if (option.value === 'Repos') assert(slots.some((x,i) => x !== 193+63*i));
    }
  }
  for (const [operation, tail] of [['Drop',.1], ['Re-prefill',.05]]) {
    for (const count of [2,3]) {
      const options = policy.targets(count, operation);
      assert.equal(options.at(-1).probability, tail);
      assert(Math.abs(options.reduce((s,o) => s+o.probability, 0)-1) < 1e-12);
      let start = 0;
      for (const option of options) {
        const draw = start + option.probability / 2;
        const slots = [193,256,319].slice(0,count);
        // A high draw selects Drop in the normal two-cache transition first.
        const draws = operation === 'Drop' ? [.99,draw] : [draw];
        const a = policy.next(slots, {kind:operation === 'Drop' ? 'cycle' : 'refill',targetSize:2}, () => draws.shift());
        assert.equal(a.index, option.value);
        start += option.probability;
      }
    }
  }
});

test('management completes the first non-Append; context prepares two or three caches once', () => {
  for (const slots of inventories) for (const draw of [0,.5,.99]) {
    const playback = createPlayback(false, () => draw);
    playback.state.slots = [...slots];
    playback.advance('manage');
    const operations = complete(playback);
    assert(operations.length <= 3);
    assert(operations.slice(0,-1).every(op => op === 'Append'));
    assert(['Drop','Repos'].includes(operations.at(-1)));
    const reduced = createPlayback(true, () => draw);
    reduced.state.slots = [...slots];
    reduced.advance('manage');
    assert.deepEqual(plain(reduced.state.slots), plain(playback.state.slots));

    let draws = 0;
    const refill = createPlayback(false, () => { draws++; return draw; });
    refill.state.slots = [...slots];
    refill.advance('refill');
    const target = draw < .45 ? 2 : 3;
    while (refill.state.action.operation !== 'Re-prefill') {
      assert(['Append','Repos'].includes(refill.state.action.operation));
      finish(refill);
    }
    assert.equal(refill.state.action.before.length, Math.max(target,slots.length));
    assert.equal(draws, 2, 'draw the target size and removal position only once each');
    finish(refill);
    assert.equal(refill.state.running, false);
  }
});

test('mixed rapid requests stay FIFO and switching to reduced motion drains the queue', () => {
  const playback = createPlayback(false, () => 0);
  playback.advance();
  playback.tick(.5);
  const current = playback.state.action;
  playback.advance('refill');
  playback.advance('manage');
  assert.equal(playback.state.action, current);
  assert.equal(current.time, .5);
  assert.equal(playback.state.queued, 2);
  finish(playback);
  assert.equal(playback.state.intent.kind, 'refill');
  assert.equal(playback.state.action.operation, 'Re-prefill');
  finish(playback);
  assert.equal(playback.state.intent.kind, 'manage');
  assert.deepEqual(complete(playback), ['Append','Drop']);
  const expected = plain(playback.state.slots);
  const reduced = createPlayback(false, () => 0);
  reduced.advance(); reduced.advance('refill'); reduced.advance('manage');
  reduced.setReduced(true);
  assert.equal(reduced.state.running, false);
  assert.equal(reduced.state.queued, 0);
  assert.deepEqual(plain(reduced.state.slots), expected);
});

test('long random walks retain a valid inventory and continuous action boundaries', () => {
  const random = seeded(), playback = createPlayback(false, random);
  const seen = new Set();
  for (let i=0; i<2000; i++) {
    playback.advance(['cycle','manage','refill'][i%3]);
    let steps = 0;
    while (playback.state.running) {
      assert(++steps <= 4);
      const a = playback.state.action;
      seen.add(`${a.operation}:${a.index}`);
      assert.deepEqual(plain(a.before), plain(playback.state.slots));
      const start = at(a,0), end = at(a,a.duration);
      assert.equal(start.occupied, a.before.length);
      assert.equal(end.occupied, a.after.length);
      assert(Math.abs(end.lean) < 1e-8);
      const visible = [...end.statics];
      if (a.operation === 'Append') visible.push(end.moving);
      assert.deepEqual(visible.map(p=>p.x).sort((a,b)=>a-b), plain(a.after));
      if (a.operation === 'Drop') assert.deepEqual(plain(a.after), plain(a.before.filter((_,j)=>j!==a.index)));
      if (a.operation === 'Repos') assert.equal(a.after.length,a.before.length);
      if (a.operation === 'Re-prefill') assert.deepEqual(plain(a.after.slice(0,a.index)),plain(a.before.slice(0,a.index)));
      finish(playback);
      const slots = plain(playback.state.slots);
      assert(slots.length >= 1 && slots.length <= 3);
      assert.equal(new Set(slots).size,slots.length);
      assert(slots.every((x,j)=>[193,256,319].includes(x) && (!j || x>slots[j-1])));
    }
  }
  for (const operation of ['Drop','Re-prefill']) for (const index of [0,1,2]) assert(seen.has(`${operation}:${index}`));
});

test('Drop leaves first, middle and tail gaps; Repos alone compacts retained cache', () => {
  for (const index of [0,1,2]) {
    const drop = action('Drop',[193,256,319],index);
    const retained = [193,256,319].filter((_,i)=>i!==index);
    for (let t=0;t<=3;t+=.05) assert.deepEqual(plain(at(drop,t).statics.map(p=>p.x)),retained);
    assert.equal(at(drop,0).moving.x,[193,256,319][index]);
    assert.equal(at(drop,1.3).occupied,2);
  }
  for (const slots of inventories.filter(s=>s.some((x,i)=>x!==193+63*i))) {
    const repos = action('Repos',slots);
    for (let t=0;t<=3.5;t+=.05) {
      const f = at(repos,t);
      assert.equal(f.occupied,slots.length);
      assert.equal(f.moving,null);
      if (t<=1.55) assert.deepEqual(plain(f.statics.map(p=>p.x)),slots);
      else assert(Math.abs(f.lean)<1e-8);
    }
    assert.deepEqual(plain(at(repos,3.5).statics.map(p=>p.x)),slots.map((_,i)=>193+63*i));
  }
});

test('re-prefill preserves earlier KV, contracts only later KV and rebuilds with a delayed reaction', () => {
  for (const index of [0,1]) {
    const refill = action('Re-prefill',[193,256,319],index);
    for (let t=0;t<=7.5;t+=.1) {
      const f = at(refill,t);
      if (index) { assert.equal(f.statics[0].x,193); assert.equal(f.statics[0].scale,undefined); }
      assert(f.statics.every(p=>p.scale===undefined || p.scale>=0 && p.scale<=1));
    }
    const shrinking = at(refill,2.95);
    assert.equal(shrinking.shock,0);
    assert(shrinking.statics.slice(index).every(p=>p.scale>0 && p.scale<1));
    const empty = at(refill,3.5);
    assert(empty.shock>.9);
    assert.equal(empty.occupied,index);
    assert(empty.statics.slice(index).every(p=>p.scale===0));
    const growing = at(refill,4.8);
    assert(growing.effort>.9);
    assert(growing.statics[index].scale>0 && growing.statics[index].scale<1);
    const settled = at(refill,7.5);
    assert.deepEqual(plain(settled.statics.map(p=>p.x)),[193,256]);
    assert.equal(settled.occupied,2);
    assert.equal(settled.effort,0);
    assert.equal(settled.shock,0);
  }
});

test('rare tail re-prefill preserves the whole prefix without unnecessary collapse or effort', () => {
  for (const slots of [[193,256],[193,256,319]]) {
    const refill = action('Re-prefill',slots,slots.length-1);
    const chosen = policy.next(slots,{kind:'refill',targetSize:2},()=>.99);
    assert.equal(chosen.duration,3);
    for (let t=0;t<=3;t+=.05) {
      const f=at(refill,t);
      assert.deepEqual(plain(f.statics.map(p=>p.x)),slots.slice(0,-1));
      assert.equal(f.shock,undefined);
      assert.equal(f.effort,undefined);
    }
  }
});

test('hand contact, hidden withdrawal, matched eyes and finite rendering survive all targets', () => {
  const actions = [action('Append',[193]),action('Append',[193,256]),action('Repos',[193,319]),
    ...[0,1,2].flatMap(i=>[action('Drop',undefined,i),action('Re-prefill',undefined,i)])];
  for (const a of actions) {
    const duration=a.operation==='Re-prefill' && a.index<2 ? 7.5 : a.operation==='Repos' ? 3.5 : 3;
    for (let time=0;time<=duration;time+=1/30) {
      const f=at(a,time), svg=scene.contents({...a,time});
      assert(!/NaN|undefined|Infinity/.test(svg));
      const eyes=[...svg.matchAll(/<path d="([^"]+)" fill="#1d1d1f" transform="translate\([^)]+\) rotate\([^)]+\)"\/>/g)];
      assert.equal(eyes.length,2);
      assert.equal(eyes[0][1],eyes[1][1]);
      if (f.reach===1) {
        const hand=f.handSide>0?f.right:f.left;
        assert(Math.abs(Math.hypot(hand.x-f.moving.x,hand.y-f.moving.y)-Math.hypot(19,12))<1e-8);
      }
      if (a.operation==='Append' && time<.65) assert.equal(f.grip,1);
      if (a.operation==='Drop' && time>2.3) {
        assert.equal(f.handHidden,true);
        assert.equal(f.back,true);
        assert(!svg.includes('reveal-1'));
      }
    }
  }
  const body=svg=>svg.match(/<path d="([^"]+)" fill="#f5f5f7"\/>/)[1];
  const left=scene.contents(null,{x:-34,y:-22}),right=scene.contents(null,{x:34,y:22});
  assert.equal(body(left),body(right));
  assert.notEqual(left,right);
});

test('DOM playback freezes offscreen and in hidden tabs; touch scrolling never starts eye tracking', () => {
  const elements = new Map(), listeners = {}, frames = new Map();
  let observe, nextFrame = 0, scrolls = 0;
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      innerHTML:'', events:{}, attributes:{}, disabled:true,
      addEventListener(name, fn) { this.events[name] = fn; },
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name]; },
      removeAttribute() {}, animate() {},
      scrollIntoView() { scrolls++; },
      getBoundingClientRect() { return {left:0,top:0,bottom:193,width:220,height:193}; }
    });
    return elements.get(id);
  };
  const refill = element('refill-trigger'), cycle = element('cycle-trigger');
  refill.setAttribute('data-memory-bot-action', 'refill');
  cycle.setAttribute('data-memory-bot-action', 'manage');
  const document = {hidden:false,querySelectorAll:() => [refill,cycle],getElementById:element,addEventListener:(name, fn) => { listeners[name] = fn; }};
  const dom = {
    document, window:{innerHeight:844}, matchMedia:() => ({matches:false,addEventListener() {}}),
    IntersectionObserver:class { constructor(fn) { observe = fn; } observe() {} },
    requestAnimationFrame:fn => { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame:id => frames.delete(id),
    AKVMemoryBotPlayback:reduced => createPlayback(reduced, () => 0),
    AKVMemoryBotScene:{...scene,contents:(action,gaze,slots) => JSON.stringify({action,gaze,slots})}
  };
  runInNewContext(readFileSync(new URL('./bot.js', import.meta.url), 'utf8'), dom);
  const draw = () => JSON.parse(element('memory-bot-drawing').innerHTML);
  const frame = now => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(now)); };
  observe([{isIntersecting:true}]);
  assert.equal(frames.size, 0, 'idle bot does not schedule rendering');
  listeners.pointermove({pointerType:'touch',clientX:300,clientY:300});
  assert.equal(frames.size, 0);
  element('memory-bot-action').events.click();
  for (let time = 0; time <= 1000; time += 40) frame(time);
  const before = draw().action.time;
  assert(Math.abs(before - 1) < 1e-8);
  observe([{isIntersecting:false}]);
  assert.equal(frames.size, 0);
  frame(10000);
  assert.equal(draw().action.time, before);
  observe([{isIntersecting:true}]);
  frame(20000); frame(20040);
  assert(Math.abs(draw().action.time - before - .04) < 1e-8, 'offscreen time is not added on return');
  document.hidden = true;
  listeners.visibilitychange();
  const hiddenTime = draw().action.time;
  frame(30000);
  assert.equal(draw().action.time, hiddenTime);
  assert.equal(frames.size, 0);
  document.hidden = false;
  listeners.visibilitychange();
  frame(40000); frame(40040);
  assert(Math.abs(draw().action.time - hiddenTime - .04) < 1e-8);
  assert.equal(refill.disabled, false);
  assert.equal(cycle.disabled, false);
  refill.events.click();
  cycle.events.click();
  assert.equal(scrolls, 2, 'card actions bring a bot hidden under navigation fully into view');
  assert.match(element('memory-bot-action').attributes['aria-label'], /2 queued/);
  for (let now = 40080; now < 44000; now += 40) frame(now);
  assert.equal(draw().action.operation, 'Re-prefill');
  assert.equal(refill.attributes['data-active'], 'true');
  assert.equal(cycle.attributes['data-active'], 'false');
  for (let now = 44000; now < 51000; now += 40) frame(now);
  assert.equal(draw().action.operation, 'Append');
  assert.equal(cycle.attributes['data-active'], 'true');
});
