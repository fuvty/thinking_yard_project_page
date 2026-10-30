# MoA page

`content.html` owns the page structure; `locales/zh.json` supplies Chinese text. Keep paper figures, measured values, author order and roles unchanged when adjusting presentation.

## Shared controls

The three result panels use native `details.sp-fold` with the shared disclosure CSS and script loaded from `head.html`. Long-context performance starts open; runtime and ablation start closed. All panels can remain open independently. Translation belongs to the title span, outside the neutral plus/minus icon. Figure and body layout remains in the project stylesheet; opening, closing, focus exclusion and reduced-motion behavior come from the shared component.

The author section uses `sp-authors` and shared affiliation/contribution styles. The existing hero attention field, calibration visualizations and native video player remain page-owned. See the [shared controls guide](../../docs/design-system/controls.md) for integration contracts.

## Verify

Check both language routes, independent/default-open panels, keyboard activation, rapid reversal, wide/narrow figure layouts, readable author wrapping and native video controls. Run `npm run check` and `GITHUB_PAGES=true npm run build` after changes.
