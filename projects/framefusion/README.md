# FrameFusion page

The English source is `content.html`. The Chinese-site route intentionally shows English content with shared language fallback; do not add a separate translation without review.

## Shared controls

`head.html` loads shared disclosure and select modules. The demo video, benchmark table and runtime chart use independent `sp-fold` panels, collapsed by default. Their content remains page-owned. Closing the video pauses it immediately; it never starts automatically. The runtime chart resizes on `sp-fold-settled`, after the panel reaches its final width and height, rather than a timed delay.

The four model/size/budget selects use `data-picker` with associated labels. Native values and `change` events still drive the table and chart. Changing model family rebuilds the available sizes; Reset emits `change` so the enhanced trigger and dependent filter reflect the reset values. The native select remains the fallback if enhancement is unavailable.

The author section uses `sp-authors`; verified names, links, affiliation markers and contribution roles remain in the page source. See the [shared controls guide](../../docs/design-system/controls.md) for contracts and background support.

## Preserve and verify

Keep benchmark CSV loading and its embedded fallback, sorting and expandable benchmark columns, runtime measurements, Chart.js rendering, video sources and hero/carousel interactions. After changes, verify model → size filtering, Reset, runtime model/budget choices, closing/reopening the chart, video pause on close, keyboard access and mobile layout. Run `npm run check` and `GITHUB_PAGES=true npm run build` after changes.
