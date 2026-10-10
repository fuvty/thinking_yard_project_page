// Pure transition policy and playback. Random choices happen once per action,
// never during rendering, so frame rate cannot change the selected operation.
globalThis.AKVMemoryBotPolicy = (() => {
  const SLOTS = [193, 256, 319];
  const compact = slots => SLOTS.slice(0, slots.length);
  const hasGaps = slots => slots.some((x, i) => x !== SLOTS[i]);
  function choose(options, random) {
    let draw = random();
    for (const option of options) {
      draw -= option.probability;
      if (draw < 0) return option.value;
    }
    return options.at(-1).value;
  }
  function transitions(slots) {
    if (slots.length === 1) return [{ value:hasGaps(slots) ? 'Repos' : 'Append', probability:1 }];
    if (slots.length === 3) return [{ value:'Drop', probability:1 }];
    return hasGaps(slots)
      ? [{ value:'Repos', probability:.7 }, { value:'Drop', probability:.3 }]
      : [{ value:'Append', probability:.6 }, { value:'Drop', probability:.4 }];
  }
  function targets(count, operation) {
    const tail = operation === 'Re-prefill' ? .05 : .1;
    return count === 2
      ? [{ value:0, probability:1-tail }, { value:1, probability:tail }]
      : [{ value:0, probability:.5-tail }, { value:1, probability:.5 }, { value:2, probability:tail }];
  }
  function action(slots, operation, random = Math.random) {
    const before = [...slots];
    const removes = operation === 'Drop' || operation === 'Re-prefill';
    const index = removes ? choose(targets(slots.length, operation), random) : null;
    let after;
    if (operation === 'Append') after = [...before, before.at(-1)+63];
    else if (operation === 'Repos') after = compact(before);
    else if (operation === 'Drop') after = before.filter((_, i) => i !== index);
    else after = [...before.slice(0, index), ...SLOTS.slice(index, before.length-1)];
    return { operation, before, after, index, time:0,
      duration:operation === 'Repos' ? 3.5 : operation === 'Re-prefill' && index < before.length-1 ? 7.5 : 3 };
  }
  function next(slots, intent, random) {
    let operation;
    if (intent.kind === 'refill') {
      operation = hasGaps(slots) ? 'Repos' : slots.length < intent.targetSize ? 'Append' : 'Re-prefill';
    } else operation = choose(transitions(slots), random);
    return action(slots, operation, random);
  }
  return { transitions, targets, next };
})();

globalThis.AKVMemoryBotPlayback = (reduced = false, random = Math.random) => {
  const policy = globalThis.AKVMemoryBotPolicy;
  const pending = [];
  const state = { slots:[193,256], action:null, intent:null, running:false, queued:0, reduced, revision:0 };
  function start() {
    if (!state.intent) state.intent = pending.shift() || null;
    state.running = Boolean(state.intent);
    state.queued = pending.length;
    state.action = state.running ? policy.next(state.slots, state.intent, random) : null;
    state.revision++;
  }
  function finish() {
    const operation = state.action.operation;
    state.slots = [...state.action.after];
    if (state.intent.kind === 'cycle' || (state.intent.kind === 'manage' && operation !== 'Append') ||
        (state.intent.kind === 'refill' && operation === 'Re-prefill')) state.intent = null;
    start();
  }
  function drain() {
    while (state.reduced && state.running) finish();
  }
  function advance(kind = 'cycle') {
    if (!['cycle', 'manage', 'refill'].includes(kind)) kind = 'cycle';
    pending.push({ kind, ...(kind === 'refill' ? { targetSize:random() < .45 ? 2 : 3 } : {}) });
    state.queued = pending.length;
    if (!state.running) start();
    drain();
  }
  function tick(seconds) {
    if (!state.running) return;
    state.action.time = Math.min(state.action.duration, state.action.time + Math.max(0, seconds));
    state.revision++;
    if (state.action.time >= state.action.duration) finish();
  }
  function setReduced(value) { state.reduced = value; drain(); }
  return { state, advance, tick, setReduced };
};
