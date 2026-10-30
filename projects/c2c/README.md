# C2C page

The English template and `locales/zh.json` share one layout. Preserve paper claims, figures, CSV measurements, author order and contribution marks when changing the presentation.

## Shared components

- Detailed results use `details.sp-fold` with one direct `.sp-fold-body`; labels are localized separately from the neutral icon.
- Sharer and receiver filters use the shared enhanced select. Keep their IDs, values and `updatePerformanceTable()` change handler. The native select remains the source of truth and the no-JavaScript fallback.
- Authors use `.sp-authors` and shared affiliation/contribution styling.
- The dark oracle panel keeps its dark shell with `data-legacy-disclosure`; the shared adapter provides native button activation, expanded state and inert closed content. Do not apply the light-only `sp-fold` style to it.

Optional modules are loaded from `head.html`. Component contracts are in [Shared controls](../../docs/design-system/controls.md).

Check both languages on desktop and mobile: filter changes must update the summary and table, menus close on a second trigger click/Escape, and both detailed-results and oracle panels remain independently operable by keyboard. Check author wrapping and all original figure links.
