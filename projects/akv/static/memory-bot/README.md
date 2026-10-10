# AKV memory keeper

A standalone, code-drawn SVG bot for a dark surface (`#1d1d1f`). No framework, build step or external dependencies. All implementation, preview assets and tests live in this directory.

## Reuse

1. Copy this directory to the destination repository.
2. Include the stylesheet and scripts in this order, adjusting the path:

   ```html
   <link rel="stylesheet" href="memory-bot/bot.css">
   <script defer src="memory-bot/scene.js"></script>
   <script defer src="memory-bot/bot.js"></script>
   ```

3. Copy the `.akv-memory-bot` element from [demo.html](demo.html). Update the preview image's path to `memory-bot/preview.svg`; preserve the element IDs. The controller initializes automatically. This integration supports one bot per document.

Open `demo.html` directly to preview the package outside the project page. Its body styles only provide a dark canvas; the bot stylesheet contains its sizing, focus ring, caption, accessible description and unclipped SVG treatment. Default width is 220px, or 180px on phones. Keep ancestor overflow visible so extended hands remain visible.

## Files

- `scene.js`: geometry, operation timeline, nonlinear motion and SVG rendering.
- `bot.js`: click queue, pointer gaze, keyboard activation through the native button, visibility and reduced-motion handling.
- `bot.css`: styles scoped to the bot.
- `preview.svg`: initial two-cache frame, used before JavaScript initializes or when unavailable.
- `demo.html`: complete standalone integration.
- `bot.test.mjs`: portable tests using Node's built-in test runner.

## Behavior

The bot rests until clicked. Each click performs one complete action; rapid clicks queue actions in order:

`Append → Drop → Repos → Drop → Repos → Append`

Append/Drop take 3 seconds; Repos takes 3.5 seconds. Append emerges already holding cache and places it with the right hand. Drop removes the first cache with the left hand, retaining later positions and leaving a gap. Repos gives a short head-led shake, settles, then slides retained cache left. Cache counts repeat `2 → 3 → 2 → 2 → 1 → 1 → 2`.

Gestures retain distinct phases, nonlinear easing and brief holds. Hand visibility and cache visibility are independent, so placement and withdrawal do not flash cache on or off. Both eyes follow the mouse; touch scrolling does not move them. Offscreen and hidden-tab playback freezes. Rendering stops at rest and runs at most 30 fps while active. Reduced motion applies clicks immediately and disables gaze tracking.

This is an illustrative brand animation. Drop does not represent physical storage eviction, and only Repos changes retained positions.

## Editing and checks

`AKVMemoryBotScene.sample(seconds)` returns the pose. `contents(seconds, gaze?)` returns SVG contents; the optional gaze is `{x, y}` in SVG units. `svg(seconds = 0)` returns a complete, transparent SVG with the preview's cropped viewBox. `AKVMemoryBotPlayback(reduced = false)` supplies the controller's independent action queue.

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
