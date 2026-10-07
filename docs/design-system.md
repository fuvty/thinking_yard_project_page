# Shared visual system

Derived from the workspace's `alpha_design_system` and approved C2C prototype.

- Apple system font stack first; body 17px / 1.47, near-black #1d1d1f.
- White / #fbfbfd canvas, #f5f5f7 section surface, #0071e3 blue controls.
- Reserve the 135-degree #667eea → #764ba2 gradient for project titles, research stats and active project tint.
- Hero title clamp(48px, 8vw, 96px); section title clamp(32px, 5vw, 56px).
- Default/wide container variables: 980px / 1200px. Section rhythm: 100px vertical padding.
- Pill CTAs, softly rounded figures/cards, restrained shadows; no decorative stock imagery.
- Scientific content remains precise and declarative; preserve the authors' claims and numbers.

`shared/styles/tokens.css` is the maintained token source. Pages with `"theme": "research"` in `page.json` share `research.css`; all project pages share `components.css`. Project overrides load after shared primitives. Shared navigation and UI controls load last so each page has identical control styles. Modifier selectors such as `.section.section-dark` remain more specific than base selectors.

Navigation is entirely namespaced with `sp-` so Bulma and project-specific styles cannot change it. Its complete markup is generated at build time by `shared/navigation/render.mjs`, including in the Next.js hub. `controller.js` adds behavior without fetching a registry at runtime. The local copies in `shared/assets` make menu logos independent of old repository hosts.

## Navigation taxonomy and motion

The global menu reads project membership from [config/projects.json](../config/projects.json), the sole project registry. Category labels and order come from [config/categories.json](../config/categories.json) on both desktop and mobile. The hub's numbered routes are a separate conceptual axis; they do not change these project categories. Do not maintain a second project list in documentation.

The local **On this page** menu classifies sections by reading purpose, with labels defined once in `config/section-groups.json`:

- **Research**: context, motivating insights, method, and method-specific details such as calibration.
- **Evaluation**: examples, demos, measured results, and the concluding summary.
- **Resources**: team and citation. Use these labels consistently even when a preserved anchor is named `authors` or `bibtex`.

Each `page.json` section has `id`, `label`, `group`, and a short `description`. Keep existing anchor URLs. The method is part of FrameFusion's overview, so its link is explicitly **Overview & method**. Preserve meaningful differences instead of inventing nonexistent sections. The hub uses **Scaling routes** and **Projects** groups appropriate to its content.

At >=900px with a fine mouse pointer, On this page opens on hover without stealing focus. Leaving the trigger or panel waits 180ms, allowing the pointer to cross the gap. Entering the panel cancels dismissal. Entry fades down 8px over 280ms, with a subtle 35ms group stagger; exit fades up over 180ms and can reverse immediately on re-entry. The panel is inert as soon as closing starts. Touch remains click-driven; ArrowDown opens, Escape dismisses and returns focus. Reduced-motion removes all transitions. Desktop uses parallel columns; mobile uses a scrollable vertical stack with at least 44px link targets.

## Shared controls

`shared/ui/` owns the footer, back-to-top button, citation card, CTA buttons and author pills. The shared renderer adds a 48px blue circle with the same outline chevron to the hub and all papers. It appears after 500px of scrolling, stays 24px from desktop edges or 16px from mobile edges (respecting safe areas), and hides while a navigation menu is open. Entry/exit use opacity and an 8px translation; hover lifts 2px. Its keyboard action returns focus to Home after scrolling and clears the old section hash. Reduced-motion uses immediate scrolling. The hub's desktop mandatory scroll snapping retains its immediate return with a short snap suspension, preventing an in-flight anchor animation from landing on another chapter; this handling lives in the same shared controller.

Each paper stores its unchanged citation in `citation.bib`; `{{citation}}` renders one common card with a light header, 44px copy button and horizontally scrollable 13px monospace text. Copy success uses a checkmark and **Copied** for 2400ms; failure offers **Try again** and announces a manual-copy alternative. A failed legacy clipboard fallback must not report success. Paper/code links use the same 17px pill CTA treatment, and author tags use the same 14px text with at least a 44px target. Legacy Bulma controls inside scientific demos retain their own styles.

## Dependencies preserved during migration

FrameFusion retains its legacy carousel / slider and Font Awesome runtime dependencies because its interactive demonstrations use them. Its project CSS already overrides the old template appearance. Other papers retain MathJax, PapaParse or their own scripts where needed. Migrating this code does not require rewriting working scientific demonstrations into React.

## Shared footer

The generator and hub use the same `renderFooter` in `shared/ui/render.mjs`. Site/team labels come from `config/site.json`; Home and All projects resolve through the configured base path. All pages use the same light-gray surface, 980px container, 13–14px type, 44px link targets and mobile stacking. Footer content must not be duplicated in project files. Remove visible legacy template credits, stale copyright years and repeated social icons; preserve project resource links in the research content. The shared footer remains a scroll-snap endpoint on the hub.
