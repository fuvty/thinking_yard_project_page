# TaH2 project page

Integrated from the sibling `tah2-project-page/` directory. The original is unchanged; its README is preserved as `SOURCE-README.md` for scientific data provenance.

## Site integration

- Route: `/projects/tah2/` (deployment prefix is added by the generator).
- Category: Adaptivity Scaling; hub route: `03` (a new scaling dimension through learned token-level depth).
- Registration and logo: `config/projects.json` and `shared/assets/tah2.png`.
- Uses the shared research theme, navigation, grouped contents menu, back-to-top, citation card, CTA buttons, author pills and footer.
- `page.json` defines Research / Evaluation / Resources entries. `demo`, `runtime-figure` and `depth-figure` belong to Evaluation. One Demo & examples section follows all experimental results, immediately before Team.

## Editing

Edit `content.html` for research copy and structure, `citation.bib` for the citation, and `static/css/index.css` only for project-specific charts/layout. Do not copy navigation or shared UI logic into this project. Keep each full-width `.section` separate from its inner `.container`: section padding and background come from the shared theme, while the container only limits content width. Do not put a zero-vertical-padding wrapper on the section itself.

The original `static/js/data.js`, paper, PDF figures and scientific SVGs were copied unchanged. `static/js/index.js` retains chart animation, model/batch controls, token-depth demonstrations and reduced-motion support; citation copying is handled by the shared controller. Do not adjust plotted data, ratios or chart geometry merely for styling.

The architecture diagram and nine-benchmark figure scroll horizontally on narrow screens to keep labels legible. Other charts stack within the page width.

From the repository root, run `npm run check` and `GITHUB_PAGES=true npm run build`; then `GITHUB_PAGES=true npm run preview`. Check desktop/mobile layout and model, batch, animation, citation and navigation controls after changes.

## Chart interaction

Training length is a post-training context limit, not an output cutoff: paper §5.1 and Appendix A.1 / Table 5 specify 16,384 tokens; §5.2 evaluates output cutoffs up to 32K ([arXiv v1](https://arxiv.org/html/2609.35748v1#S5.SS1)). Keep this distinction in the Key insight caption in both languages.

The scaling and latency charts share a segmented output-length selector: within 16K, or within 32K. The 32K view retains measured 4K–16K curves as pale context and emphasizes the 16K–32K extension (with a shared 16K boundary). The first compute panel shows fitted trends within 16K and measured results up to 32K; the depth panel compares depth ceilings at the selected range’s endpoint. `static/js/chart-motion.js` owns the range filter and one-shot reveal: Standard reasoning first, then all looped variants together, using the homepage’s asymmetric easing over 2.75 seconds (0.9s baseline, a 0.15s pause, then 1.7s for looped models). Reveal distance follows each curve’s screen-space arc length, so empty plot margins do not consume the acceleration or deceleration. Measured markers fade in as the stroke reaches them, and summary badges appear during the final settling phase. Finished charts stay visible. Changing range or scrolling the full chart group out of view and back in restarts the reveal; small movements at the viewport edge do not. Hidden-tab playback pauses, and reduced-motion preferences show the completed chart. Timing must never change the source measurements.

The 4B/8B generalization selector updates cards in place. Bar fills and baseline markers transition from their current positions over 750ms using the same asymmetric easing; repeated switches can interrupt the motion naturally. Numeric labels update directly to the selected measurements. Reduced motion disables the transitions.

## Hero background

`static/js/hero-iterations.js` draws a decorative field of iteration trials: points grow branches away from their parent paths. Some trials retract to their origins; others keep extending along the new branch without merging back. Each trial starts at the exact endpoint of the preceding one. Accepted branch displacement carries forward, and particles restart only beyond the viewport edges. The canvas starts empty: paths are drawn only up to the moving tip, and completed trails fade over 24 seconds. No full guide lines or unvisited nodes are prepainted. These paths illustrate the idea and are not experimental data. The canvas sits behind a central white veil and never intercepts links. It pauses offscreen or in a hidden tab, caps pixel density and frame rate, and uses a static composition for reduced-motion preferences. Its styling lives at the end of the project stylesheet.

## Demo video

`static/videos/tah2-demo.mp4` is a lossless MP4 remux of the supplied `demo.qt` (29.4 seconds, 764 × 504, H.264 video and AAC audio). Both media streams are preserved, with MP4 metadata moved to the front for progressive playback. `tah2-demo-poster.jpg` is extracted at 22 seconds. The generation video and three sampled correct responses share one Demo & examples section after Generalization and before Team. Each has an independent native disclosure, collapsed by default, so either or both can be open. Closing the video pauses playback; token animation visibility follows the inner content, so closed examples do not keep playing. The existing `demo` and `depth-figure` anchors are preserved. The native player uses `controls`, `playsinline` and `preload="none"`; playback starts only on user interaction.

To replace the video: `ffmpeg -i demo.qt -map 0:v:0 -map '0:a?' -c copy -map_metadata -1 -movflags +faststart static/videos/tah2-demo.mp4`. Regenerate the poster from the replacement video and update the intrinsic width/height and CSS aspect ratio if its dimensions change.

## Shared components

The page loads `shared/ui/components/disclosure.css`, `disclosure.js` and `media.css` explicitly from its head. The method note, benchmark results, video and response examples use the same `sp-fold` implementation as the component preview. Preserve the benchmark panel’s default-open state and independent demo panels. Summary translations contain text only; the neutral plus/minus icon stays outside localization. Each panel has one direct `.sp-fold-body` for natural height measurement and focus exclusion.

Video pauses on `sp-fold-change` as closing begins; native `toggle` remains a fallback. Token playback stops on closing, resumes only while visible/open, and preserves the user’s explicit pause choice. The icon button’s pressed state means playback is enabled; its label and tooltip describe the action in the current language. The native video player retains its own controls. There is no select in TaH2, so the custom picker module is not loaded.

The depth legend and playback button share one toolbar. The author section opts into `.sp-authors` for borderless name pills and shared institution/contribution spacing. Component contracts and migration checks are maintained in [the shared controls guide](../../docs/design-system/controls.md).
