# Visual foundations

[Guide index](README.md) · Implementation: [tokens](../../shared/styles/tokens.css), [components](../../shared/styles/components.css), [research primitives](../../shared/styles/research.css)

## Color and surfaces

| Use | Value / existing token |
| --- | --- |
| Main text and dark sections | `#1d1d1f` / `--apple-black` |
| Secondary text | `#86868b` / `--apple-gray`; use the darker `#6e6e73` where small explanatory text needs more contrast |
| Canvas | `#ffffff` / `--apple-white` |
| Subtle surface / nav | `#fbfbfd` / `--apple-off-white` |
| Section and control gray | `#f5f5f7` / `--apple-light-gray` |
| CTA blue / hover / dark-section blue | `#0071e3` / `#0077ed` / `#0a84ff` |
| Signature gradient | `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` / `--c2c-gradient` |
| Dark-section gradient text | `#a78bfa` → `#c084fc` |
| Success / warning / danger | `#30d158` / `#ff9f0a` / `#ef4444`; supplement color with labels |

Reserve the signature gradient for titles, selected statistics and low-opacity active-state tints. Plain dark statistics are also used successfully. Concept icons stay neutral. Avoid full-page colored gradients, decorative blobs and heavy colored borders. A limited colored summary panel in an existing page does not establish a new page-wide palette.

Charts may use additional colors when they encode models, routes or outcomes. Keep those meanings stable across a figure and its controls. The hub's purple, green and blue distinguish its three mathematical routes; they are not three replacement brand themes.

## Typography

Use the Apple system stack in `--font-sans`; Chinese uses `--font-sans-zh`, with PingFang SC and Microsoft YaHei fallbacks. Both are maintained in the shared tokens, not copied into each page. Use installed system fonts; no webfont download is needed. Code uses `--font-mono`. Do not restore the old kit's Inter/JetBrains Mono imports or legacy Google Sans/Noto Sans template typography.

The defaults below describe English typography. Chinese project headings use normal tracking and a 1.3 line-height; Chinese hero and section introductions use approximately 1.65. Apply language rules through the shared language stylesheet according to the content's actual `lang`, including English fallback pages inside the Chinese site.

| Role | Default treatment |
| --- | --- |
| Body | 17px, line-height about 1.47, tracking −0.022em |
| Hero title | `clamp(48px, 8vw, 96px)`, weight 700, line-height 1.1, tracking −0.045em |
| Section title | `clamp(32px, 5vw, 56px)`, weight 600, line-height 1.1, tracking −0.03em |
| Hero subtitle | `clamp(21px, 3vw, 28px)`, approximately 680px measure |
| Section introduction | 21px, approximately 600–680px measure |
| Eyebrow | 14px, weight 600, uppercase, tracking 0.04em, blue |
| Navigation label | Shared 13px token; project title distinguished by weight |
| Figure caption / code | 13–15px caption; 13px / 1.6 monospace citation |

Readable phrasing takes priority over equal line lengths. `text-wrap: balance` can improve a short heading's shape, but does not understand Chinese word boundaries. Keep paragraphs fluid; avoid forced desktop line breaks, blanket no-wrap rules, or shrinking Chinese type to make a translation fit. Check narrow screens and enlarged text as well as desktop. Shared phrase and term treatments are documented in [localization](../localization.md#中文排版实现). Do not reduce the resource-pill font independently for one project.

## Space, shape and elevation

- Default content width: 980px; wide figures and navigation: 1200px. Keep about 24px horizontal gutters, adapting to the viewport.
- Default section padding: 100px vertically. Compact layouts can use about 64–72px; preserve the distinction between sections and within-section spacing.
- A 3-column grid with 24px gaps works for parallel concepts. Text/figure splits often use `1fr 1.2fr` and approximately 64px gaps. Stack when labels or figures would become cramped.
- Cards: 16–20px radius, usually 24–32px padding, soft `0 2px 20px rgba(0,0,0,.04)` shadow. Figures: 12–16px radius. Pill: 980px radius.
- Hairlines: `rgba(0,0,0,.06–.08)` on light surfaces. Dark cards use a 5% white fill and 10% white border.
- Use translucent blur for the fixed navigation. Keep content surfaces readable and mostly opaque. Avoid cards inside cards and framing every paragraph.

## Icons and imagery

Use paper figures, measured plots, method diagrams, real demos and the registered logo. Do not substitute decorative stock images for scientific content. Shared logos live in `shared/assets/`; use `object-fit: contain` so their proportions survive small navigation tiles.

Use Font Awesome for existing utility/brand icons or compatible inline SVGs. New Font Awesome usage can reuse the bundled files in `shared/vendor/fontawesome-5.15.1/`; use glyph names supported by that version. Decorative icons need `aria-hidden="true"`; icon-only controls need a meaningful accessible name.

Concept icons use a 24×24 outline SVG, roughly 1.6–2px stroke, rounded caps and joins, in a neutral tile when a tile helps grouping. No gradient icon backgrounds or emoji bullets. The Hugging Face brand mark is an allowed exception.
