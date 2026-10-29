# TaH2 paper review

Reviewed 2026-10-30 against [arXiv 2609.35748](https://arxiv.org/abs/2609.35748), latest and only submission **v1, 2026-09-28**: **Improving Test-Time Scaling with Adaptive Looped Transformers**. Existing data provenance is documented in [README.md](README.md) and [SOURCE-README.md](SOURCE-README.md).

## Claims and scope

| Item | Official evidence | Page treatment |
| --- | --- | --- |
| +53% accuracy–compute slope | [Figure 1](https://arxiv.org/html/2609.35748v1#S0.F1) and Section 5: Qwen3-1.7B, AIME24–26 mean over 32 samples, 4K–16K output cutoffs. Fitted slope is 2.74 vs 1.79 accuracy percentage points per doubling of decoding FLOPs. | Keep +53%; it is a relative **slope** improvement, not a 53% accuracy improvement. Move the concrete model/evaluation footnotes from the hero into results. |
| About +3.4 pp at matched compute | [Abstract and Section 5](https://arxiv.org/html/2609.35748v1#S5): exceeds Standard's peak accuracy by about 3.4 percentage points at matched decoding compute. | Keep the claim and use pp/百分点. Do not substitute the direct 32K-output accuracy difference (15.49−11.98=3.51), which compares different compute budgets. |
| Depth 2→8 | [Figure 1b](https://arxiv.org/html/2609.35748v1#S0.F1): at the same 16K output cutoff, Standard 10.97%; adaptive TaH2 at ceilings 2/4/8 reaches 13.78/14.13/14.86%. Gains round to 2.8/3.2/3.9 pp with **increasing compute**, not matched compute. | Preserve values and dynamic extension to 32K. Explain the fixed-output versus fixed-compute distinction in results and chart accessible descriptions. |
| Token loss changes | [Figure 3](https://arxiv.org/html/2609.35748v1#S3.F3): 3.42M validation tokens, Ouro iterations 1→2 and Huginn 1→3. Ouro improved/unchanged/worse = 26.0/52.3/21.7%; Huginn = 50.6/33.5/15.9%. “Little change” means absolute loss reduction ≤10⁻³. | Preserve data and the model switch; localize labels/status rather than modifying model names or data keys. |
| Learning from iteration gains | [Section 4](https://arxiv.org/html/2609.35748v1#S4) and [Figure 2](https://arxiv.org/html/2609.35748v1#S0.F2): jointly train backbone/updater/decider; online cost-sensitive labels use lookahead improvement; reinject embeddings; weight executed predictions with stopping probabilities. Inference uses threshold 0.5 and no training-only lookahead. | Retain the actual distinction from TaH's offline mismatch targets and staged training. |
| Serving efficiency | [Table 2](https://arxiv.org/html/2609.35748v1#S5.T2) and [Figure 5](https://arxiv.org/html/2609.35748v1#S5.F5): Mini-SGLang, A800, AIME26; batch sizes 1/4. TaH2 uses 8.59 vs Standard 7.04 GFLOPs/token. Latencies 187.0/285.4 s vs Standard 139.8/220.3 s. | Preserve data and baseline ratios. Better accuracy–latency scaling is not a claim that TaH2 has lower per-token or end-to-end cost than Standard at the same output setting. |
| Cross-domain averages | [Table 3](https://arxiv.org/html/2609.35748v1#S5.T3): 4B 46.4→49.6 (+3.2 pp); 8B 56.1→58.5 (+2.4 pp), nine benchmarks and a separate training setup from the 1.7B study. | Preserve data and 4B/8B switch. Use percentage-point units consistently. |
| Demo | Existing local MP4 is a recording of generation. | Change “live generation trace” to “recorded generation trace” in both languages; preserve source video and actual responses. |

No new experiments, fitted values or raw data were introduced. `static/js/data.js`, source paper figures, PDFs, token responses and video are unchanged.

## Localization and verification

One English structural template plus `locales/zh.json`; complete copy blocks preserve emphasis meaning. Chinese headings use fluid semantic phrases rather than copying English line breaks. Dynamic plot axes, legends, accessible descriptions, animation state, token depth, batch size, model size and loss/accuracy tooltips use the shared `SiteI18n.t` runtime. Resource references stay in the existing shared static paths; no page-relative JavaScript fetches were added.

Checks: translation-key/emphasis and metadata contracts; all element IDs retained; script syntax; a source-level mocked-DOM smoke test ran the full animation lifecycle, model switches and pause controls in English/Chinese with normal/reduced motion. The dataset is unchanged. Visual desktop/mobile verification remains with the integrating agent.
