# Page patterns and components

[Guide index](README.md) · Shared controls: [shared/ui/styles.css](../../shared/ui/styles.css)

## Research-page composition

Lead with the project name, one clear statement of the contribution, two or three supported metrics and resource links. Follow with a research narrative: problem or opportunity → evidence motivating the method → mechanism → measured results → team and citation. Combine or reorder sections when the paper requires it; do not add filler just to match a template.

Use white sections for explanation, one focused dark section for a key insight or architecture, and light gray for dense evidence or the team. Alternate surfaces where they clarify the story, not on a mechanical every-other-section schedule. Headings can be left-aligned or centered; keep one alignment within a module.

The current site includes both figure-led pages and pages with interactive explanations, API examples, token traces and measured charts. FrameFusion and MoA already use the shared visual language; their surviving legacy runtime dependencies are not a reason to restart their migration or reapply Bulma styling.

## Hero

- A full-width, near-white canvas with centered content and generous space; no enclosing hero card. Start from `min-height: 100svh` or the shared viewport-height treatment, then allow the content to grow.
- Gradient project title; readable subtitle; small, precise metric labels. State the comparison basis or setting where it changes the meaning of a number.
- Background motion abstracts the paper's mechanism. Keep enough activity visible around the copy to communicate the idea. Partial overlap is acceptable when the text stays clear.
- Keep resources easy to find. Avoid adding Demo/Results pills automatically; the shared section menu already provides navigation.
- Narrow screens may stack metrics and resource pills. A tall mobile hero is preferable to clipping, tiny labels or compressed tap targets.

## Resource pills

Use `.btn.btn-primary` for **Read Paper** and `.btn.btn-secondary` for **View Code** and other available resources. The C2C row is the visual reference: 17px type, `16px 32px` padding, 980px radius, 8px icon/text gap and approximately 16px between pills. Reuse shared styles and allow wrapping.

**Read Paper opens the paper PDF directly.** For arXiv, use `https://arxiv.org/pdf/<paper-id>`, without a forced download. Other publishers should use their confirmed PDF URL. A new-tab link includes `rel="noopener"`. Citation metadata can retain its canonical abstract-page URL.

Paper, GitHub and conference icons are small and inherit the text color. A conference/award label is a non-link badge unless there is a useful confirmed destination. Match the pill size and border treatment; do not shrink the badge separately on mobile. Never invent publication status or a resource URL.

## Figures, results and controls

Put the research content first: a large readable figure, short explanation, then controls and caption close to the evidence. Use an open layout or one restrained surface around a coherent interactive figure. Reuse the [shared controls and surface contract](controls.md) for native selects, segmented buttons, neutral playback actions and native disclosures. Sliders and diagram-specific controls can vary with their purpose; not every control is a large hero pill.

- Keep axis labels, units, legend and measurement conditions visible. Preserve raw values, unavailable measurements and the order of a sweep.
- Keep measured results distinct from explanatory simulations and decorative animation. Label illustrative timing or token assignments as illustrative.
- A speedup must identify its baseline and setting. Do not change a measured series to match rounded prose; record source inconsistencies in the project's README.
- Tables use light headers, compact rows and hairlines. Tint the relevant method subtly and identify best values with weight or a label as well as color.
- Dense tables and code scroll inside their own labeled container. Avoid making the entire page scroll horizontally.
- Use `<details>` for exact values, setup, derivations or a compact quick start. The central claim should remain visible without opening a disclosure.
- Explain the science and the selected state. Avoid visible instructions about implementation details or redundant “click here” text.

## Team, citation and page ending

Use shared `.authors-list` and `.author-tag` styles. Link only verified homepages; unlinked names remain text. Preserve the supplied author order. Add `*` for confirmed equal contribution and `†` for a confirmed corresponding author, with a visible legend and `aria-describedby` connecting marked names to it. Do not infer these roles.

Store BibTeX in `citation.bib` and put one `{{citation}}` slot in the content. The generated shared card provides the light header, horizontal code scrolling, copy button and success/failure feedback. Do not copy its markup or JavaScript into a project.

The shared footer is light gray with site identity, Home and All projects. The shared 48px blue back-to-top circle appears after scrolling and preserves keyboard focus behavior. Use the existing implementation; do not bring back the old kit's black social footer or local copies of these controls.

## Hub composition

The hub is a separate visual pattern in [hub/](../../hub/): a large scientific curve beside a restrained text panel, followed by project highlights generated from the registry. At desktop widths it uses a sticky chart and staged scroll narrative. Below its 980px breakpoint the chart sits above the text and mandatory scroll snapping is removed. Do not apply the hub's scroll snapping to long research pages.

Preserve the actual curve relationships in [curve-math.ts](../../hub/curve-math.ts): pointwise transformations and the envelope of branches are part of the explanation, not ornamental paths. Keep route colors and the accompanying text consistent.
