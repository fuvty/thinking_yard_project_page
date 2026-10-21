# AKV · Cache Engineering for Agents

Registered under Context Scaling / Route 03. The content revision follows the supplied `main.pdf`, retaining the original visual theme.

## Content sources

- Research narrative and operations: supplied `ICLR2027_AKV/tex/0_abstract.tex`, `1_intro.tex`, and `3_method.tex`.
- Benchmark values, latency, and throughput: `tex/4_experiment.tex`. Model selectors reproduce the table values and rounded averages. The 27.7% and +1.7-point headlines follow the manuscript; do not derive the former from rounded average costs.
- RSI: 17.8% lower cost **relative to Standard**, for MiniMax-M2.7 on BrowseComp-Plus at search iteration 6. This is a separate experiment, not an additional reduction applied to 27.7%.
- Paper figures: original manuscript PDFs, rendered to SVG without redrawing. SVG conversion respects the PDF crop box to omit blank page margins. Original PDFs remain in the source assets for reference; the page omits original-figure links and the Figure 9(a) data-download link.
- Radix-tree explainer: `static/figures/radix-tree.svg` is a simplified vector schematic of trajectories 1 and 2 in `figure/trajectory.pdf`, grounded in `3_method.tex` (drop-aware reuse and eviction). It shows shared A–B, branch-specific C states, and drop markers. The captions distinguish logical dropping from physical eviction and note position-aware reuse for Repos.
- Logo: the updated user-supplied `logo.jpg` (2026-10-10), prepared with tighter framing and a transparent background using the built-in image-generation editor, saved as `shared/assets/akv.png`. Used by navigation, hub cards, and the favicon. The original supplied file is preserved.
- Figure 9(a): supplied `48c14-96c12-kv96c14.csv`, 918 records, 3 methods × 3 repeats, 100 tasks per run.

## Benchmark threshold clarification

The project owner confirmed on 2026-10-10 that GPT-OSS-120B / MiniMax-M2.7 / MiroThinker-1.7-Mini use 128K / 200K / 256K context windows and Standard summarization thresholds of 96K / 96K / 192K, respectively. Text Engineering summarizes at 48K for all three models. These settings supersede the local manuscript’s blanket 128K-context / 75% / 96K description. The page keeps a qualitative comparison in the baseline cards and exact values in “Summarization settings”. This changes explanatory copy only; benchmark values, the separate serving experiment, and the manuscript are unchanged.

## Page narrative

The page distinguishes cache engineering (operations), AKV serving (interface and state management), and cache policies (RSI). Reading order: insight → context/cache comparison → three operations → state-history challenge → reuse, eviction and restoration → benchmarks → GPU-budget experiment and serving measurements → RSI. The hero retains the full-viewport layout, text-only title, subtitle and three headline metrics. The logo remains in menus, hub cards and the favicon. Navigation, footer, back-to-top and citation controls stay shared.

The dark insight section pairs Context engineering and Cache engineering. Clicking “Edit the prefix. Re-prefill the rest.” demonstrates suffix invalidation and reconstruction; clicking “Let agents manage their own KV cache” completes the first non-Append operation. Both cards queue requests and bring the bot into view. Groups and cards stack responsively, preserving the `#motivation` anchor.

The portable [`static/memory-bot/`](static/memory-bot/README.md) package contains the renderer, state policy, DOM controller, styles, fallback, standalone demo and tests. Its [state transition diagrams and probabilities](static/memory-bot/STATE_MACHINE.md) describe Append, Drop, Repos and Re-prefill. Ordinary bot clicks play one action. Drop preserves retained positions; Repos compacts them; re-prefill preserves preceding KV and rebuilds only the suffix.

The overview uses the Core Idea section from feat commit `ed07e82`, with a revised motivation paragraph and three paired text/cache comparisons (control, recomputation, and historical information), marked by monochrome sad/happy SVG faces sharing the memory bot’s n=4 superellipse outline. The Context/Cache comparison uses two columns on desktop, with each synchronized SVG animation above its three explanatory points; phones stack the cards. The title is “From Context Engineering to Cache Engineering”. The animation sequence and collapsed operation definitions remain unchanged. The historical-information explanation uses A and B from the animation and distinguishes retained KV from recomputation without A. `core-scene.js` renders both the live animation and generated static fallbacks; `core-comparison.js` handles switching and playback. Imported styles live in `core-comparison.css` and are scoped to `#overview`. Previous overview figures remain as unused assets. All other sections and the current hero animation are preserved.

The serving section starts with history-dependent KV states and the original three-trajectory figure. The figure also contains the extended radix tree and retains the `#radix-tree` anchor. Three equal cards summarize reuse, eviction, and one-pass restoration inside a single, initially collapsed “Three mechanisms behind AKV serving” disclosure. A separate stateless-interface disclosure follows, with three complete request examples and server-state playback. Resident compatible states are reused directly; restoration applies to missing states.

Messages in the live core comparison and three-history diagrams use chat bubbles; KV blocks and radix-tree nodes keep their rectangular shapes. The generated core SVG fallbacks use the same bubble geometry. Stateless-interface playback retains its 1.8× operation speed and request crossfades, with shorter empty holds: request 1 lasts 4 seconds, request 2 lasts 6 seconds, and request 3 lasts 9 seconds (a 19-second loop). Requests 2 and 3 hold each completed operation for 1.5 seconds before starting the next operation (Append → Drop and Drop → Repos); the final result also remains visible before looping. Its code highlights follow the server's operation clock: the new message during Append, only the matching operate-after map entry during Drop, and the `reposition` field during Repos. Carried operations and idle inspection periods are not highlighted; full message histories stay present after Drop.

Evaluation starts with the definitions of Standard (a higher summarization threshold), Text Engineering (a lower, 48K threshold) and AKV (retain the latest 12 tool responses’ KV). Table 1 is presented through the benchmark selectors and labeled bars; the duplicate full-comparison table is omitted. Figure 9(a) follows as a separate 100-task experiment, then two compact Table 2 charts show output throughput and P95 latency across concurrency 8–16. The complete Table 2 and replay protocol are collapsed below. `static/js/serving.js` is the single numeric source for these two charts and the full serving table. It transcribes the supplied paper’s Table 2; these Top-80 measurements are distinct from Figure 9(a), and neither changes the headline benchmark aggregation. No Figure 7 or Cache-As-Tool section is included. RSI remains the sole policy-search example.

## Hero cache tree

`static/js/hero-flow.js` draws one stationary-root tree from the lower-left corner into a broad fan. Ordered angular sectors prevent crossings. A per-load seed varies binary/ternary forks, sector widths, fork positions and twig lengths; resizing preserves the seed. Later forks fill the middle and outer crown, with shorter companion twigs among branches that reach the frame. Phones use fewer branching levels. A soft central veil protects readability, and measured hero content bounds keep release sites outside the copy.

The canopy unfolds along connected Bézier segments within 2 seconds, including a 0.2-second delay. Cubic ease-in continuously accelerates the reveal, with slight pace differences between branches. Subsequent updates send an orb along the live tree using cubic ease-in-out and the Home page’s Gaussian path gleam:

- **Growth:** a purple orb reaches a tip, carries a new segment outward, then fades over 1.05 seconds.
- **Release:** a yellow orb stops at the first selected node. Candidates brighten during approach, hold for 0.18 seconds after arrival, then fade and contract over 0.65 seconds. Descendants reconnect smoothly. Affected tips wait 20–36 seconds before growing again; releases vary in depth and location, preserving structural junctions.

Clicking the hero alternates release and growth on eligible branches. Repeated clicks launch concurrent orbs; reservations protect selected spans and growing tips. Arrived drops run one at a time while growth can proceed independently. Waiting orbs stay visible. A root pulse gives immediate feedback; clicks during entrance accelerate the reveal and queue their actions. Autoplay resumes after four seconds without input. Links, controls and drag gestures do not advance the tree; browser text selection from double/triple clicks does not suppress those clicks. A focus-visible button supports keyboard input.

Rendering targets 30 fps, caps DPR at 2, and pauses offscreen or in hidden tabs. Reduced motion shows the complete tree and applies manual actions immediately. ResizeObserver updates the composition and text bounds. Timing is illustrative, not measured performance.

Closing gaps is an abstract visual metaphor: AKV retains its logical token and operation history, and request-local Drop does not imply immediate eviction of shared storage or automatic key repositioning. The detailed system section explains these distinctions.

## Figure 9(a) replay

Rebuild the web data with:

```sh
python3 scripts/prepare-akv-data.py ../48c14-96c12-kv96c14.csv
```

The generator preserves adjusted elapsed times and computes GPU hours as `elapsed_seconds * 8 / 3600`. The CSV already divides original times by 1.13 (Standard), 1.0788 (Text Engineering), or 1.0 (AKV). No second adjustment is applied.

Each run is a right-continuous step function. The mean is calculated at the union of event times, holding each run's final score after it completes. Shading is the **min–max range**, not a confidence interval. Mean final scores are 40.6667%, 32.3333%, and 47.0%, respectively. Concurrency differs: Standard C=12, Text Engineering C=14, AKV C=14.

Public CSV contains only the plotting and timing fields; internal paths, timestamps, execution IDs and experiment identifiers are omitted. The original source is unchanged outside this repository.

Replay loops automatically while visible, drawing for 12 seconds and holding the completed curves for 3.5 seconds. The figure always shows the mean of all three runs, with a compact pause/resume control. Reduced-motion users see the complete plot. Playback suspends outside the viewport or while the document is hidden and resumes on return. Timing normalization remains documented here rather than in the public-facing page.

Benchmark results use TaH2-style grouped bars for all three methods, with model and Accuracy/Cost selectors. Axes start at zero; accuracy uses a fixed 0–100% scale. Exact values appear on the bars; there is no duplicate benchmark table.

## Release resources

The owner-confirmed paper URL is [the arXiv PDF](https://arxiv.org/pdf/2610.28577), linked from Read Paper. The owner-confirmed code repository is [thu-nics/AKV](https://github.com/thu-nics/AKV), linked from the View Code resource. `citation.bib` contains the owner-supplied BibTeX, rendered and copied by the shared citation component. Author order and roles remain as provided in `content.html`.

## Reload position

An early script in `head.html` disables native scroll restoration for reloads without a URL fragment, so the cover and its entrance animation start in view without first flashing a previous reading position. Explicit chapter fragments and back/forward navigation retain native behavior. The prior restoration mode resumes after the initial display, and also when leaving the page.

## Editing / preview

Edit `content.html`, `page.json`, and `static/css/index.css`. Interactive behavior and benchmark table data live in `static/js/index.js`; replay math is in `static/js/replay-math.js`; Table 2 data and rendering live in `static/js/serving.js`.

```sh
npm run check
GITHUB_PAGES=true npm run build
GITHUB_PAGES=true npm run preview
# http://127.0.0.1:3002/thinking_yard_project_page/projects/akv/
```

The registry automatically includes AKV in the hub and shared navigation. No deployment or push is needed for local review.
