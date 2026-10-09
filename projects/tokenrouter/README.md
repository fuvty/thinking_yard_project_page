# TokenRouter project page

This page uses the shared project generator, navigation, tokens, CTAs, team pills, citation card, footer and back-to-top control. Its entry in `config/projects.json` adds it to the hub and every project menu under **Adaptivity Scaling**.

## Content and provenance

Primary source: the supplied `latex/main.tex`, `macro.tex`, `tex/0_abstract.tex` through `tex/6_conclusion.tex`, and active (uncommented) content in `tex/x_appendix.tex`. Supplementary writing drafts and commented-out experiment tables were not used as current paper claims.

- Hero: “A serving engine for token-level LLM routing.” Links to [the paper PDF](https://arxiv.org/pdf/2610.12242) and [the code](https://github.com/thu-nics/TokenRouter), alongside the NeurIPS 2026 badge. The five-algorithm statistic refers to the paper evaluation, not all available schedulers.
- Architecture: model-local subservers, the client–server / decoding / inter-model loops, and pending-state handoff/resume.
- Programming: API signatures and R-Stitch route/send excerpts follow the released code and its README. The receive panel describes inherited behavior. A folded quick start links to client, Python engine, multi-node and reproduction instructions.
- Routing-granularity diagram: illustrative assignments, explicitly labeled, not a generation trace. Session mode assigns the full conversation immediately; Query mode colors one entire response at a time; only Token mode advances individual tokens. Playback controls and progress labels follow the selected granularity, with no playback control for the immediate session assignment.
- Scheduling: exact toy workload and simulation functions from `R2RSysFigures/src/schedule_timeline.py`, small-model latency 1 and large-model latency 3.5. Times are illustrative normalized units, not measured latency. The source scheduler's flush behavior is preserved.
- Main benchmark: `R2RSysFigures/data/TokenRouter.csv`, forward-filled grouping fields, `agentic_single` excluded as in the original plotting script. All other measured values remain unchanged. Missing values remain null / N/A.
- Speed / throughput: `R2RSysFigures/data/tradeoff.csv`. Curves connect concurrency in order, not points sorted by speed. The 18.58× comparison is explicitly TokenRouter N=16 vs. official R2R N=1, not an equal-concurrency gain.
- Threshold sweep: measured rows of `R2RSysFigures/data/delayedBatching.md` only.
- Ablation: original N=8 figure values (base 132.78, CUDA graphs 230.79, async 296.86, delayed batching 372.48, official 134.90). Effects are cumulative.
- Model-pair, deployment and original-algorithm tables: active tables in `tex/x_appendix.tex` and `tex/5_experiment.tex`. These are separate experimental settings, not mixed into the main CSV chart.
- Authors: supplied by the user, in the supplied order. Tianyu Fu, Yichen You and Yu Wang retain their existing personal/institutional homepage links from the R2R/TaH pages. Tengxuan Liu links to his institutional homepage and Yixin Dong to github.com/ubospica, both supplied by the user. Authors without a supplied or existing homepage stay plain text; OpenReview links are omitted. Tianyu Fu and Tengxuan Liu share the confirmed equal-contribution marker. Yu Wang is marked as corresponding author, as confirmed by the user. The NeurIPS 2026 badge was supplied by the user. Paper/code links and arXiv citation metadata follow the released repository README; affiliations remain unspecified.

### Source inconsistencies to resolve in the paper

1. The prose reports a maximum 64.15× throughput gain, whereas CITER / high-effort / N=4 in the CSV is 288.67 / 4.49 = 64.29×. The hero uses the paper’s rounded 2–64× throughput gain range, and the interactive figure computes directly from the measurements.
2. The delayed-batching prose uses p=0.35, while the supplied plotting script compares the measured sweep with the p=0.2 predictions. Those two prediction tables have different optima. The page displays measured results only and describes the analytical model without claiming that this inconsistent prediction table validates its optimum.
3. Some referenced paper figure PDFs are absent. Web diagrams and plots are reconstructed from text, simulation source and original data; no missing paper link is exposed.
4. The model-pair sweep appears as an active table in `tex/5_experiment.tex`; its duplicate in the appendix is commented out. The page uses the active table. Workload labels for the threshold sweep and ablation stay within explicitly supplied metadata (AIME2024 and R2R / N=8, respectively).

## Assets and maintenance

```sh
python3 projects/tokenrouter/tools/prepare_assets.py ../latex
npm run check
GITHUB_PAGES=true npm run build
GITHUB_PAGES=true npm run preview
```

`prepare_assets.py` uses only Python's standard library. It copies the original CSV/Markdown measurements, produces `static/data/measurements.json`, reuses the supplied scheduling functions without importing their plotting dependencies, and rebuilds the sampled road geometry. The shared logo is copied unchanged from the released repository’s `resource/logo.png` to `shared/assets/tokenrouter.png` and is not overwritten by this script. The shared PNG is used by the hub, project menus and favicon.

The mark generalizes `equal_width_swirl_logo_v4.py` to the user’s requested five roads: constant-width roads, cubic Bézier approaches tangent to a gently modulated fivefold guide, a 74° surface arc, a 46° marking arc, and arclength-spaced dashes. The later image reference informs the rounded merge treatment. SVG strokes replace polygon unions.

The hero expands the five-road mark's visual language to eight broad roads around a central guide: one at the top, one at the bottom, and three on each side. Each port begins as one continuous surface carrying opposing traffic, splitting into short entrance and exit branches only near the ring. The layout is mirrored about the page center, with the lower side pair opening onto the left and right edges. All eight ports support both directions, while every token follows the central guide counterclockwise. Twelve staggered journeys keep the idle background quiet while keeping all ports active. The painted branches and moving tokens share the same paths; quintic Bézier curves match position, tangent and curvature at the guide.

Each token follows one complete path: off-screen entrance → merge → guide → a different exit → off-screen departure. Token opacity stays constant; tokens recycle only after the entire trail is outside the viewport. Motion follows five beats: fast approach, braking at the entrance, acceleration around the ring, braking at the exit, and acceleration away. Ring cruising is 35% faster, with approach, junction and departure speeds unchanged. The hub's asymmetric cubic-bezier(.42, 0, .12, 1) controls velocity transitions; its analytic integral controls distance, preserving continuous speed across phases. A short position history makes the trail stretch and gather with speed, capped at 64px on desktop and 44px on mobile. There is no overlay that hides tokens in the middle of a trip. The background pauses off-screen/in background tabs and offers an explicit pause control.

Each port has a fixed color shared by its incoming and outgoing requests and trails. Color changes only between the entrance and exit joins on the ring: progress is distance along that ring segment, interpolating hue at constant OKLCH lightness and chroma without a separate color timer. Approach and departure branches stay entirely in their port color regardless of token speed or route. Clicking or tapping a non-interactive part of the hero adds 16 temporary requests on desktop or 12 on mobile. A short expanding ripple acknowledges the click immediately, while all eight entrances light up together in their matching colors to reflect the added traffic across the network. Repeated clicks restart a single entrance pulse without stacking opaque road highlights; the nearest entrance sends the first requests. Feedback clears within 1.25 seconds; requests enter from just outside the viewport with staggered arrivals and retire only after completing their routes. Every click is admitted. Per-port arrivals are spaced by at least 85ms, so repeated bursts remain distinct; excess arrivals wait outside the viewport instead of being discarded. High traffic reduces trail subdivision detail rather than dropping requests. Heads and trails use lower opacity for softer colors. Controls, drags, scrolling, text-selection drags and cancelled gestures do not trigger traffic. Repeated stationary clicks still work when the browser selects a word on a double click. Paused or reduced-motion backgrounds remain paused, and pausing clears transient feedback. Road surfaces are cached between resizes to keep the busier animation inexpensive.

Three explanatory figures play once when visible and support pause, replay and scrubbing. Routing granularity reveals tokens chronologically; the handoff illustration shows A’s preserved local cache while B/C keep decoding; scheduling playback derives active batches, waiting requests and completion counts directly from the source simulation history. Scheduling strategies share the same time scale and playback rate. Explanatory motion is explicitly distinguished from benchmark measurements. Reduced-motion mode presents static completed figures and allows manual exploration without automatic playback.

The team section uses the shared `authors-section` and `author-tag` styles, with no local pill overrides.

Page-specific code:

- `static/js/model.js`: pure selection, comparison, scale and path math.
- `static/js/index.js`: measured figures, scheduling playback and accessible native controls.
- `static/js/demos.js`: routing granularity and asynchronous request handoff illustrations.
- `static/js/playback.js`: shared animation lifecycle, scrubbing and reduced-motion behavior.
- `static/js/hero.js`: decorative road canvas, without text.
- `static/css/index.css`: responsive layouts and diagram treatments.

All resource paths work beneath the configurable GitHub Pages prefix. Generated `public/` and `out/` are not source files.
