# Project-page kit

[Design guide](../../README.md)

The current kit is the repository's shared implementation plus its project scaffold. Use it directly. The old standalone React/Babel prototype, copied project menus, independent tokens and sample benchmark rows are superseded by these sources.

## Build from the existing parts

| Need | Reuse |
| --- | --- |
| New source files and one registry entry | [scripts/new-project.mjs](../../../../scripts/new-project.mjs) via `npm run new:project` |
| Hero, sections and typography | [shared/styles/research.css](../../../../shared/styles/research.css) |
| Common surfaces and container | [shared/styles/components.css](../../../../shared/styles/components.css) |
| Pills, authors, citation and footer | [shared/ui/](../../../../shared/ui/) |
| Menus and section navigation | [shared/navigation/](../../../../shared/navigation/) |
| Page assembly and base paths | [scripts/generate.mjs](../../../../scripts/generate.mjs) |

These are repository-relative links; no sibling workspace or external design tool is required. Logos and paper assets are already in `shared/assets/` and `projects/<slug>/static/`, so do not duplicate them in this kit.

## Minimal content pattern

This is a structural example for `content.html`. Replace the placeholders with sourced content and register its section IDs in `page.json`; it is not publishable research copy.

```html
<main>
  <section class="hero" aria-labelledby="hero-title">
    <h1 id="hero-title" class="hero-title">Project title</h1>
    <p class="hero-subtitle">A precise statement of the contribution.</p>
    <!-- Add supported metrics and resource links using shared .btn classes. -->
  </section>
  <section id="overview" class="section">
    <div class="container">
      <p class="section-eyebrow">Overview</p>
      <h2 class="section-title">The research problem.</h2>
      <!-- Add the explanation and source-backed figure. -->
    </div>
  </section>
  <!-- Add method and evaluation sections appropriate to the paper. -->
  <section id="team" class="section section-gray authors-section sp-authors">
    <div class="container">
      <p class="section-eyebrow">Team</p>
      <h2 class="section-title">Meet the researchers.</h2>
      <div class="authors-list"><!-- Verified authors and roles. --></div>
    </div>
  </section>
  <section id="bibtex" class="section">
    <div class="container">
      <p class="section-eyebrow">Citation</p>
      <h2 class="section-title">Cite our work.</h2>
      {{citation}}
    </div>
  </section>
</main>
```

Do not paste a nav or footer into that body: the generator adds them. For a temporary standalone mockup, [colors_and_type.css](../../colors_and_type.css) imports the same primitives. Production projects should continue to use the generator's normal style loading.

## Read working examples

Use the [C2C body](../../../../projects/c2c/content.html) for figure-led sections and resource pills, the [TokenRouter body](../../../../projects/tokenrouter/content.html) for controls and compact disclosures, and [TaH2's styles](../../../../projects/tah2/static/css/index.css) for open figure layouts. These are examples of reusable patterns, not an inventory to maintain as projects are added.
