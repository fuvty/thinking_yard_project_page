# Repository guide

This is the unified Thinking Yard / NICS-EFC research site. Work only in source directories. `public/` and `out/` are generated and ignored. Do not introduce nested Git repositories or submodules.

## Single sources of truth

- Project names, descriptions, category membership, logos and routes: `config/projects.json`.
- Category labels and order: `config/categories.json` — Adaptivity Scaling, Context Scaling, Model Compression.
- All navigation markup, state and styling: `shared/navigation/`.
- Footer, back-to-top and citation markup/behavior, CTA and author-pill styling: `shared/ui/`. Do not reintroduce project-specific copies.
- Visual tokens: `shared/styles/tokens.css`; common components: `shared/styles/components.css` and `research.css`.
- Read `docs/design-system/README.md` before broad visual changes, then the relevant chapter. This repo-local guide replaces the external `alpha_design_system` prototype; shared implementation files remain the source of truth.
- A project contains `page.json`, `head.html`, `content.html`, `citation.bib`, and `static/`. Place exactly one `{{citation}}` slot in content.html. Do not duplicate navigation, footer or embed another project registry in it. The generator appends the shared footer automatically.
- Read Paper links open the PDF directly; use `https://arxiv.org/pdf/<paper-id>` for arXiv. Reuse the shared pill styles for resource links.

## Approved navigation

- At page top, Home always returns to the local hub.
- At >=900px, three categories are centered and open on mouse hover; the panel keeps the project's logo and description. Delay pointer-leave dismissal by 180ms so crossing into the panel works. Keep click and keyboard access.
- Narrow/touch layouts use All projects with the same three groups.
- After scrolling more than 8px, retract global navigation. The local bar contains only the project title and On this page, with a section dropdown.
- On this page opens on desktop mouse hover with a 180ms leave grace period, reversible entrance/exit transitions, and no hover focus stealing. Preserve click/touch and ArrowDown/Escape access; closed contents are inert.
- Section metadata uses the shared Research / Evaluation / Resources taxonomy (`config/section-groups.json`), with short descriptions. Preserve existing anchors; label authors as Team and BibTeX as Citation. The hub uses Scaling routes / Projects instead.
- Bar labels use one 13px token; the project title is distinguished by weight. Controls have 44px tap height.
- Use restrained entrance animation and respect reduced motion.

## Preservation and verification

Preserve paper content, author order and roles, figures, tables, videos and each project's interactions: CSV filtering, model/batch selectors, token traces, matrix demos, playback and measured charts. Consult the relevant project's README for data provenance and behavior. Preserve the hub's curve math. Do not maintain a second project inventory in these instructions.

Run `npm run check` and `GITHUB_PAGES=true npm run build` for changes to shared rendering, configuration, or routing. Check desktop and mobile when changing visuals. The validator checks local resources and anchors; browser testing checks runtime data and layout. No deployment is needed for routine local changes unless requested.

Use `npm run new:project -- slug "Name" category` to scaffold additions. Keep deployment base paths configurable. Links between project pages must resolve inside this site. External paper/code/author links stay external.
