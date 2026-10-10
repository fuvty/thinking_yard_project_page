import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const context = {};
for (const name of ['scene', 'bot']) {
  runInNewContext(readFileSync(new URL(`./${name}.js`, import.meta.url), 'utf8'), context);
}
const scene = context.AKVMemoryBotScene;
const createPlayback = context.AKVMemoryBotPlayback;
const runAction = playback => playback.tick(scene.actionAt(playback.state.time).end - playback.state.time);

// Only caches painted over the forehead window are visible at rest. Caches
// carried behind the body must not count toward the displayed contents.
const foregroundCaches = time => {
  const svg = scene.contents(time);
  const foreground = svg.slice(svg.indexOf('<rect x="154"'));
  return [...foreground.matchAll(/<rect x="-21"[^>]+transform="translate\(([^)]+)\) rotate\(([^)]+)\)"/g)]
    .map(([, position, rotation]) => `${position} ${rotation}`).sort();
};

test('visible caches persist through hand withdrawal and every action boundary', () => {
  const rests = [
    [0, ['193 225 0', '256 225 0']],
    [3, ['193 225 0', '256 225 0', '319 225 0']],
    [6, ['256 225 0', '319 225 0']],
    [9.5, ['193 225 0', '256 225 0']],
    [12.5, ['256 225 0']],
    [16, ['193 225 0']],
    [19, ['193 225 0', '256 225 0']]
  ];
  for (const [boundary, expected] of rests) {
    // Include the previous action's entire settled tail, the exact boundary,
    // and the next action's anticipation, also across a repeated cycle.
    for (const cycle of [0, 19]) {
      for (let frame = boundary === 0 ? 0 : -30; frame <= 12; frame++) {
        assert.deepEqual(foregroundCaches(cycle + boundary + frame / 60), expected,
          `cache contents flicker near ${cycle + boundary}s (frame ${frame})`);
      }
    }
  }
  for (const start of [0, 16]) {
    const expected = foregroundCaches(start + 3);
    for (let frame = 96; frame < 180; frame++) {
      assert.deepEqual(foregroundCaches(start + frame / 60), expected,
        'a placed cache must remain visible while the hand retracts');
    }
  }
});

test('rapid clicks retain each Append, Drop, and Repos action in order', () => {
  const playback = createPlayback();
  for (let i = 0; i < 6; i++) playback.advance();
  assert.equal(playback.state.queued, 5);
  const counts = [scene.sample(playback.state.time).occupied];
  const operations = [];
  for (let i = 0; i < 6; i++) {
    operations.push(scene.sample(playback.state.time).operation);
    runAction(playback);
    counts.push(scene.sample(playback.state.time).occupied);
  }
  assert.deepEqual(operations, ['Append', 'Drop', 'Repos', 'Drop', 'Repos', 'Append']);
  assert.deepEqual(counts, [2, 3, 2, 2, 1, 1, 2]);
  assert.equal(playback.state.running, false);
  assert.equal(playback.state.queued, 0);
});

test('the bot stays at rest until clicked, and settles after one complete action', () => {
  const playback = createPlayback();
  playback.tick(10);
  assert.equal(playback.state.time, 0);
  assert.equal(playback.state.running, false);
  playback.advance();
  assert.equal(playback.state.running, true);
  runAction(playback);
  const time = playback.state.time;
  playback.tick(10);
  assert.equal(playback.state.time, time);
  playback.advance();
  runAction(playback);
  assert.equal(playback.state.time, scene.actionAt(time).end);
});

test('reduced motion performs deliberate actions immediately and never autoplays', () => {
  const playback = createPlayback(true);
  for (const count of [3, 2, 2, 1, 1, 2]) {
    playback.advance();
    assert.equal(scene.sample(playback.state.time).occupied, count);
  }
  const time = playback.state.time;
  playback.tick(10);
  assert.equal(playback.state.time, time);
  assert.equal(playback.state.running, false);
});

test('switching to reduced motion finishes every queued operation at its own boundary', () => {
  const playback = createPlayback();
  for (let i = 0; i < 6; i++) playback.advance();
  playback.tick(.8);
  playback.setReduced(true);
  assert.equal(playback.state.time, 19);
  assert.equal(playback.state.running, false);
  assert.equal(playback.state.queued, 0);
  assert.equal(scene.sample(playback.state.time).occupied, 2);
});

test('pointer gaze changes both eyes without changing the memory/body pose', () => {
  const body = svg => svg.match(/<path d="([^"]+)" fill="#f5f5f7"\/>/)[1];
  const left = scene.contents(0, {x:-34,y:-22});
  const right = scene.contents(0, {x:34,y:22});
  assert.equal(body(left), body(right));
  assert.notEqual(left, right);
  for (const svg of [left, right]) {
    const eyes = [...svg.matchAll(/<path d="([^"]+)" fill="#1d1d1f" transform="translate\([^)]+\) rotate\([^)]+\)"\/>/g)];
    assert.equal(eyes.length, 2);
    assert.equal(eyes[0][1], eyes[1][1]);
    assert(!svg.includes('NaN'));
  }
});

test('Append emerges holding cache and Drop never brings an empty hand back out', () => {
  for (const start of [0, 16]) {
    for (let time = start; time < start + .65; time += 1 / 60) {
      const pose = scene.sample(time);
      assert.equal(pose.reach, 1, 'the hand starts attached to its tile');
      assert.equal(pose.grip, 1);
    }
    assert.equal(scene.sample(start).handHidden, true);
  }
  for (const start of [3, 9.5]) {
    const stowed = scene.sample(start + 2.3);
    for (let time = start + 2.3; time < start + 3; time += 1 / 60) {
      const pose = scene.sample(time);
      assert.equal(pose.handHidden, true);
      assert.equal(pose.back, true);
      assert.equal(pose.grip, 1);
      assert.deepEqual(pose.left, stowed.left, 'the hand stays inside instead of returning to the body edge');
      assert(pose.left.x - 17 > 128, 'the complete palm fits behind the body');
      assert(!scene.contents(time).includes('reveal-1'), 'the tucked hand is no longer drawn');
    }
  }
});

test('dark renderer preserves continuous hand contact and equal eyes throughout the story', () => {
  assert.equal(scene.svg(0), scene.svg(19));
  for (let time = 0; time < 19; time += 1 / 60) {
    const pose = scene.sample(time), next = scene.sample(time + 1 / 60);
    const visible = pose.reach > 0 && !pose.handHidden;
    const nextVisible = next.reach > 0 && !next.handHidden;
    if (visible || nextVisible) for (const side of ['left', 'right']) {
      assert(Math.hypot(pose[side].x - next[side].x, pose[side].y - next[side].y) < 18);
    }
    if (pose.reach === 1) {
      const hand = pose.handSide > 0 ? pose.right : pose.left;
      assert(Math.abs(hand.r - pose.moving.r) < 1e-8);
      assert(Math.abs(Math.hypot(hand.x - pose.moving.x, hand.y - pose.moving.y) - Math.hypot(19, 12)) < 1e-8);
    }
    const eyes = [...scene.svg(time).matchAll(/<path d="([^"]+)" fill="#1d1d1f" transform="translate\([^)]+\) rotate\([^)]+\)"\/>/g)];
    assert.equal(eyes.length, 2);
    assert.equal(eyes[0][1], eyes[1][1]);
  }
});

test('Drop leaves later states at their original positions until another click starts Repos', () => {
  for (const start of [3, 9.5]) {
    const before = scene.sample(start), lifted = scene.sample(start + 1.28);
    assert.equal(before.handSide, -1);
    assert(before.statics.every(state => state.x > before.moving.x));
    assert.equal(lifted.occupied, before.occupied - 1);
    assert(lifted.moving.y < before.moving.y);
    assert.deepEqual(lifted.statics, before.statics, 'later states stay in place during removal');
    for (let time = start; time <= start + 3; time += 1 / 60) {
      assert.deepEqual(scene.sample(time).statics, before.statics);
    }
    const playback = createPlayback();
    playback.state.time = start;
    playback.advance();
    runAction(playback);
    assert.equal(playback.state.time, start + 3);
    playback.tick(60);
    assert.equal(playback.state.running, false);
    assert.deepEqual(scene.sample(playback.state.time).statics, before.statics);
    assert(scene.sample(playback.state.time).statics[0].x > 193, 'the prefix gap survives at rest');
  }
});

test('Repos shakes first, then shifts retained states without changing their count or order', () => {
  for (const start of [6, 12.5]) {
    const before = scene.sample(start), settled = scene.sample(start + 3.4);
    let directionChanges = 0, direction = 0;
    for (let time = start; time < start + 3.5; time += 1 / 60) {
      const pose = scene.sample(time);
      assert.equal(pose.operation, 'Repos');
      assert.equal(pose.occupied, before.occupied);
      assert.equal(pose.moving, null, 'no cache is carried away during Repos');
      assert.equal(pose.reach, 0);
      if (pose.local <= 1.55) assert.deepEqual(pose.statics, before.statics);
      else assert(Math.abs(pose.lean) < 1e-8, 'the shake settles before cache positions change');
      const nextDirection = Math.sign(pose.lean);
      if (Math.abs(pose.lean) > .1) {
        if (direction && nextDirection !== direction) directionChanges++;
        direction = nextDirection;
      }
      pose.statics.forEach((state, index) => {
        const shift = before.statics[index].x - state.x;
        assert(shift >= 0 && shift <= 63);
        if (index) assert(Math.abs(state.x - pose.statics[index - 1].x - 63) < 1e-8);
      });
    }
    assert(directionChanges >= 5, 'a short series of alternating shakes');
    settled.statics.forEach((state, index) => assert.equal(state.x, before.statics[index].x - 63));
  }
});

test('DOM playback freezes offscreen and in hidden tabs; touch scrolling never starts eye tracking', () => {
  const elements = new Map(), listeners = {}, frames = new Map();
  let observe, nextFrame = 0;
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      innerHTML:'', events:{}, disabled:true,
      addEventListener(name, fn) { this.events[name] = fn; },
      setAttribute() {}, removeAttribute() {}, animate() {},
      getBoundingClientRect() { return {left:0,top:0,width:220,height:193}; }
    });
    return elements.get(id);
  };
  const document = {hidden:false,getElementById:element,addEventListener:(name, fn) => { listeners[name] = fn; }};
  const dom = {
    document, matchMedia:() => ({matches:false,addEventListener() {}}),
    IntersectionObserver:class { constructor(fn) { observe = fn; } observe() {} },
    requestAnimationFrame:fn => { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame:id => frames.delete(id),
    AKVMemoryBotScene:{sample:scene.sample,actionAt:scene.actionAt,contents:(time,gaze) => JSON.stringify({time,gaze})}
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
  const before = draw().time;
  assert(Math.abs(before - 1) < 1e-8);
  observe([{isIntersecting:false}]);
  assert.equal(frames.size, 0);
  frame(10000);
  assert.equal(draw().time, before);
  observe([{isIntersecting:true}]);
  frame(20000); frame(20040);
  assert(Math.abs(draw().time - before - .04) < 1e-8, 'offscreen time is not added on return');
  document.hidden = true;
  listeners.visibilitychange();
  const hiddenTime = draw().time;
  frame(30000);
  assert.equal(draw().time, hiddenTime);
  assert.equal(frames.size, 0);
  document.hidden = false;
  listeners.visibilitychange();
  frame(40000); frame(40040);
  assert(Math.abs(draw().time - hiddenTime - .04) < 1e-8);
});
