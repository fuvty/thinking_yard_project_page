# MoA paper review

Reviewed 2026-10-30 against [arXiv v3](https://arxiv.org/html/2406.14909v3), revised 2025-11-24 (COLM 2025). [Version history](https://arxiv.org/abs/2406.14909): v1 2024-06-21; v2 2024-11-01; v3 2025-11-24.

| Claim | Evidence | EN / 中文 decision |
| --- | --- | --- |
| 3.9× effective context | §6.3, Appendix C.1.2, Figure 7 | Keep value; identify average attention span as denominator. Explain the >90% retrieval threshold beside results. |
| 6.6–8.2× vs FlashAttention2; 1.7–1.9× vs vLLM | §6.4, Table 5, Appendix B.2 | Label **decode** throughput. Explain maximum supported batch sizes, Vicuna-7B/13B, 50% density and A100-80GB in results. |
| 1.5–7.1× retrieval | Abstract, §6.3, Table 4 | Retain uniform-window comparison. |
| 25% → 98% retrieval | Table 3 | Retain; specify 25% density and 8k input. |
| 0.25 / 4.95 vs 0.95 / 3.96 | Table 2 | Retain retrieval / PPL values; state 25% density and 8k input in caption. |
| LV-Eval 5%, LongBench 3%, average retrieval <1% | §6.3, Table 4 | Retain reported relative drops. |

No headline numerical replacements were necessary. Both languages now distinguish calibration/search from training and define the metric scopes more clearly. Hero cards retain only values, units and comparison baselines.

Original table images, model names, author links, citation and demo video remain unchanged. Captions and alt text are localized; embedded paper figures/video retain their original language. The matrix animation is illustrative and keeps its original rules and timing; changing percentage readouts use the shared localization runtime.
