# TaH page

The English template and `locales/zh.json` share one layout. Preserve model-specific results, matrix and token animations, paper figures, author order and contribution marks.

## Shared components

- Training details and runtime-efficiency results use `details.sp-fold`, with one direct `.sp-fold-body` and a neutral icon outside the translated label.
- Model-size selection uses `.sp-segmented`; `switchModelSize()` updates `aria-pressed`, the visible result table and summary values.
- Authors use `.sp-authors` with shared affiliation and contribution typography.
- The two dark oracle/accuracy-landscape panels retain their dark shells with `data-legacy-disclosure`. The shared adapter supplies native button keyboard activation, expanded state and inert closed content. Do not apply the light-only disclosure component to these panels.

Component contracts are in [Shared controls](../../docs/design-system/controls.md). Check both languages at desktop/mobile widths, model switching, independent panels, keyboard access and figure overflow. Keep the architecture animation and scientific data independent of shared UI logic.
