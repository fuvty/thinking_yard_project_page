# TokenRouter paper review

Checked 2026-10-30 against [arXiv version history](https://arxiv.org/abs/2610.12242). The latest public version is **v1, submitted 2026-10-08**. It is marked accepted by NeurIPS 2026. The review uses the [official v1 HTML](https://arxiv.org/html/2610.12242v1), alongside the supplied `latex/R2RSysFigures` measurements already preserved by this page.

| Area | Source and decision |
| --- | --- |
| Hero | Keep the clear, rounded **2–64×** gain, five evaluated algorithms and three interface functions. Abstract / §5.2 reports 2.01–64.15× against the stronger available baseline. No experimental setup or table references added to the hero. |
| High-effort workload | §5.1 selects AIME2024 problems whose Qwen3-32B solutions exceed 8,192 tokens, then evaluates with an 8,192-token output cap. Clarified this criterion in both EN and ZH results details. |
| Ablation | [Table 6](https://arxiv.org/html/2610.12242v1#A1.T6) lists official R2R at **134.89 tokens/s**, N=8. Corrected the visible EN/ZH caption from 134.90. The original supplied plotting data retains 134.90 in the unused `ablationOfficial` field; raw measurements are not silently rewritten. Cumulative bars remain 132.78, 230.79, 296.86 and 372.48. |
| Original settings | Tables 2 and 4 support the displayed model/task settings and values. Model-pair and deployment tables remain separate experiments. Cross-node results match Table 9. |
| Concurrency | Keep **18.58×** explicitly as TokenRouter N=16 versus official R2R N=1, with comparable single-user speed. It is not an equal-concurrency comparison. |
| Scheduling | §4.3 / Appendix D derive a threshold under stationary routing probabilities and fixed per-model step latency. Preserve that scope and the distinction between illustrative scheduling timelines and measured experiments. |
| Interface | The working examples follow the released [TokenRouter code](https://github.com/thu-nics/TokenRouter), not the paper's simplified pseudocode. Preserve `route(batch, result)`, model-name / Boolean routing decisions, `PeerReq` construction and inherited `receive(msgs)` behavior. |

## Unresolved source differences

- The supplied CITER / high-effort / N=4 measurements yield 288.67 / 4.49 = **64.29×**, while paper prose reports a maximum **64.15×**. Keep exact supplied measurements in interactive charts and the paper's rounded hero range. Neither is recast as a new universal guarantee.
- The supplied delayed-batching prose and plotting script use different routing probabilities (0.35 versus 0.2). The page shows measured thresholds only; it does not claim the inconsistent prediction table validates an optimum.

## Localization and verification

`locales/zh.json` owns page metadata, complete semantic copy blocks, accessible attributes and runtime strings. The source template retains IDs, links, code and measurement values. `static/js/i18n.js` delegates to the shared `SiteI18n` dictionary. The measurement fetch stays relative to its module URL, so both locale routes load the same data.

Localized interactive surfaces include routing granularity, request handoff, all API tabs, scheduling strategies/playback/scrubbers, workload/concurrency/metric selectors, batching thresholds, throughput/speed plots and ablation labels. Algorithm names, implementation baseline names, mathematical variables, real code and author names remain unchanged.

Source localization contracts pass (228 copy blocks, 27 attribute groups). All 13 TokenRouter model/hero/playback tests pass. A runtime render sweep covers all workload/metric combinations, all scheduling modes and all API tabs. Final desktop/mobile visual verification is performed during site integration.
