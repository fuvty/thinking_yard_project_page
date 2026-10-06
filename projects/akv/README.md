# AKV · Cache Engineering for Agents

Registered under Context Scaling / Route 03. The content revision follows the supplied `main.pdf`, retaining the original visual theme.

## Content sources

- Research narrative and operations: supplied `ICLR2027_AKV/tex/0_abstract.tex`, `1_intro.tex`, and `3_method.tex`.
- Benchmark values, latency, and throughput: `tex/4_experiment.tex`. Model selectors reproduce the table values and rounded averages. The 27.7% and +1.7-point headlines follow the manuscript; do not derive the former from rounded average costs.
- RSI: 17.8% lower cost **relative to Standard**, for MiniMax-M2.7 on BrowseComp-Plus at search iteration 6. This is a separate experiment, not an additional reduction applied to 27.7%.
- Paper figures: original manuscript PDFs, rendered to SVG without redrawing. SVG conversion respects the PDF crop box to omit blank page margins. Original PDFs remain in the source assets for reference; the page omits original-figure links and the Figure 9(a) data-download link.
- Radix-tree explainer: `static/figures/radix-tree.svg` is a simplified vector schematic of trajectories 1 and 2 in `figure/trajectory.pdf`, grounded in `3_method.tex` (drop-aware reuse and eviction). It shows shared A–B, branch-specific C states, and drop markers. The captions distinguish logical dropping from physical eviction and note position-aware reuse for Repos.
- Logo: the supplied `logo.jpg`, copied unchanged to `shared/assets/akv.jpg`.
- Figure 9(a): supplied `48c14-96c12-kv96c14.csv`, 918 records, 3 methods × 3 repeats, 100 tasks per run.

## Page narrative

The page distinguishes cache engineering (operations), AKV serving (interface and state management), and cache policies (RSI). Reading order: context/cache comparison → three operations → state-history challenge → reuse, eviction and restoration → benchmarks → GPU-budget experiment and serving measurements → RSI. The hero retains the full-viewport layout, text-only title, subtitle and three headline metrics. The logo remains in menus, hub cards and the favicon. Navigation, footer, back-to-top and citation controls stay shared.

The overview uses the Core Idea section from feat commit `ed07e82`, including its copy, side-by-side comparison, switchable Context/Cache Engineering SVG animation, and collapsed operation definitions. `core-scene.js` renders both the live animation and generated static fallbacks; `core-comparison.js` handles switching and playback. Imported styles live in `core-comparison.css` and are scoped to `#overview`. Previous overview figures remain as unused assets. All other sections and the current hero animation are preserved.

The serving section starts with history-dependent KV states and the original three-trajectory figure. The figure also contains the extended radix tree and retains the `#radix-tree` anchor. Three equal cards summarize reuse, eviction, and one-pass restoration. Duplicate tree, reposition, and restoration disclosures are omitted. The section ends with the three cards; there is no separate stateless-interface explanation. Resident compatible states are reused directly; restoration applies to missing states. API JSON and parameter grammar remain omitted.

Evaluation starts with the definitions of Standard (96K summarization), Text Engineering (48K summarization) and AKV (retain the latest 12 tool responses’ KV). Table 1 is presented through the benchmark selectors and labeled bars; the duplicate full-comparison table is omitted. Figure 9(a) follows as a separate 100-task experiment, then two compact Table 2 charts show output throughput and P95 latency across concurrency 8–16. The complete Table 2 and replay protocol are collapsed below. `static/js/serving.js` is the single numeric source for these two charts and the full serving table. It transcribes the supplied paper’s Table 2; these Top-80 measurements are distinct from Figure 9(a), and neither changes the headline benchmark aggregation. No Figure 7 or Cache-As-Tool section is included. RSI remains the sole policy-search example.

## Hero cache flow

`static/js/hero-flow.js` shows twelve short, unlabelled text/cache pairs around the desktop hero (five on phones). Rising, falling, and S-shaped paths mix the two behaviors across the background and use staggered phases, so they never reset together. Context edits fade a local span; both processing heads retreat together, erasing both trails behind their retreat and redrawing them on replay. Here the strands represent processing progress: erasing the text trail does not imply deleting the underlying source text. Direct cache edits leave gaps while both heads continue. Each illustrative cycle lasts 18 seconds; its timing is not measured performance.

Clicking a visible retained segment in a cache-engineering pair removes it locally until that pair's next cycle. The reading area stays clear. Rendering pauses offscreen and in hidden tabs, targets 60 fps with DPR capped at 2, and uses a static frame for reduced motion.

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

## Pending release details

Per the owner's instruction, authors, paper URL, code URL, and citation are intentionally unfilled. `citation.bib` is empty and its required shared citation slot is hidden until details are supplied. No fabricated author or publication information is included. Add actual links and author pills to `content.html`, populate `citation.bib`, and unhide the citation slot at release.

## Editing / preview

Edit `content.html`, `page.json`, and `static/css/index.css`. Interactive behavior and benchmark table data live in `static/js/index.js`; replay math is in `static/js/replay-math.js`; Table 2 data and rendering live in `static/js/serving.js`.

```sh
npm run check
GITHUB_PAGES=true npm run build
GITHUB_PAGES=true npm run preview
# http://127.0.0.1:3002/thinking_yard_project_page/projects/akv/
```

The registry automatically includes AKV in the hub and shared navigation. No deployment or push is needed for local review.
