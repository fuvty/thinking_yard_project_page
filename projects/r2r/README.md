# R2R page

The English template and `locales/zh.json` share one layout. Preserve paper results, workflow phases, continuation examples, author order and contribution marks.

## Shared components

- Light video, method and result panels use `details.sp-fold`. Each has one direct `.sp-fold-body`, a separately translated label and a neutral plus/minus icon. Panels open independently.
- The workflow retains separate play, pause and reset actions using shared circular controls. Do not merge their semantics into a toggle or replace the workflow state machine.
- Closing the video panel pauses its native video on `sp-fold-change`; native `toggle` is the unenhanced fallback. Reopening never autoplays it.
- Authors use `.sp-authors` with shared institution and contribution typography.
- The dark token-classification panel retains its dark shell with `data-legacy-disclosure`. The shared adapter supplies keyboard-operable native button activation, expanded state and inert closed content; the light-only component is not applied here.

Component contracts are in [Shared controls](../../docs/design-system/controls.md). Check desktop/mobile and both languages, including independent panels, keyboard controls, video pause-on-close and workflow play/pause/reset. Preserve source figure and video URLs.
