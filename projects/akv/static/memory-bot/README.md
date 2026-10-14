# AKV memory keeper

A standalone, code-drawn SVG bot for a dark surface (`#1d1d1f`). No framework, build step or external dependencies. All implementation, preview assets and tests live in this directory.

## Reuse

1. Copy this directory to the destination repository.
2. Include the stylesheet and scripts in this order, adjusting the path:

   ```html
   <link rel="stylesheet" href="memory-bot/bot.css">
   <script defer src="memory-bot/scene.js"></script>
   <script defer src="memory-bot/state.js"></script>
   <script defer src="memory-bot/bot.js"></script>
   ```

3. Copy the `.akv-memory-bot` element from [demo.html](demo.html). Update the preview image's path to `memory-bot/preview.svg`; preserve the element IDs. The controller initializes automatically. This integration supports one bot per document.

Open `demo.html` directly to preview the package outside the project page. Its body styles only provide a dark canvas; the bot stylesheet contains its sizing, focus ring, caption, accessible description and unclipped SVG treatment. Default width is 220px, or 180px on phones. Keep ancestor overflow visible so extended hands remain visible.

## Files

- `scene.js`: geometry, gesture choreography, nonlinear motion and SVG rendering.
- `state.js`: inventory, weighted transition policy and request queue.
- `bot.js`: DOM integration, pointer gaze, keyboard activation, visibility and reduced motion.
- `STATE_MACHINE.md`: transition diagrams and probability tables.
- `bot.css`: styles scoped to the bot.
- `preview.svg`: initial two-cache frame, used before JavaScript initializes or when unavailable.
- `demo.html`: complete standalone integration.
- `bot.test.mjs`: portable tests using Node's built-in test runner.

## Behavior

The bot rests until clicked. Each bot click samples one valid action from the current cache inventory; rapid clicks queue complete requests. The [state transition diagrams and probabilities](STATE_MACHINE.md) define the behavior.

Append emerges already holding cache. Drop can remove the first, middle or (rarely) last cache while keeping retained positions fixed. Repos shakes, settles, then compacts the retained cache. The inventory always contains one to three caches. Append/Drop take 3 seconds; Repos takes 3.5 seconds.

Gestures retain distinct phases, nonlinear easing and brief holds. Hand visibility and cache visibility are independent, so placement and withdrawal do not flash cache on or off. Both eyes follow the mouse; touch scrolling does not move them. Offscreen and hidden-tab playback freezes. Rendering stops at rest and runs at most 30 fps while active. Reduced motion applies clicks immediately and disables gaze tracking.

An optional external button with `data-memory-bot-action="refill"` queues the re-prefill demonstration. The AKV page attaches it to the “Edit the prefix. Re-prefill the rest.” card under Context engineering. A button with `data-memory-bot-action="manage"` plays any preparatory Appends and then completes the first Drop or Repos, as used by “Let agents manage their own KV cache” under Cache engineering. Use a native button with an accessible name; the controller enables it and sets `data-active="true"` while the demonstration runs:

```html
<button type="button" data-memory-bot-action="refill" disabled>Re-prefill</button>
```

Re-prefill prepares two or three caches, removes the selected cache, and contracts only the later cache along a logistic S-curve. Earlier KV stays intact. Before the suffix starts disappearing, the bot lowers its eyes and gradually melts into a wider, flattened pose anchored at its base, holds through the loss, then pulls itself upright to rebuild the suffix. This takes 7.5 seconds; the rare tail edit takes 3 seconds because no later KV requires recomputation. The rebuilt count equals the retained count. Card requests and bot clicks share one queue.

This is an illustrative brand animation. Drop does not represent physical storage eviction.

## Editing and checks

`AKVMemoryBotPlayback(reduced = false, random = Math.random)` supplies the inventory and queue. Call `advance('refill')`, `advance('manage')`, or `advance()` for the respective requests, and `tick(seconds)` to progress. `state.action` describes the current operation, before/after slots, selected index, duration and elapsed time; it is null at rest.

`AKVMemoryBotScene.sample(action, slots)` returns a pose. `contents(action, gaze, slots)` renders SVG contents; gaze is an optional `{x, y}` override. For an idle frame pass null for action and the resting inventory as slots. `svg()` renders the initial two-cache preview.

Run from this directory:

```sh
node --test bot.test.mjs
```

After changing the renderer, regenerate the fallback:

```sh
node --input-type=module <<'JS'
import { writeFileSync } from 'node:fs';
await import('./scene.js');
writeFileSync('preview.svg', AKVMemoryBotScene.svg() + '\n');
JS
```

The renderer adapts the supplied AKV `logo-bot/index.html` v8 geometry: an n=4 body, matched eyes and padded arms. The prototype credits `jeremy-prt/bloub` for architectural inspiration; no upstream implementation or assets are included. The original prototype remains outside this package.
