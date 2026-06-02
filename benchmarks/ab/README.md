# A/B Benchmark: Pattern G vs Upstream

Compares **Pattern G** (tiered skills on this branch) against the **upstream** repo ([dmauser/network-desk](https://github.com/dmauser/network-desk)) using GitHub's own model infrastructure.

## Quick Start

```bash
# 1. Get a GitHub token with models:read scope
export GITHUB_TOKEN=$(gh auth token)
# or: export GITHUB_TOKEN=ghp_your_personal_access_token

# 2. Dry-run (no API calls — shows context size comparison)
python benchmarks/ab/run_benchmark.py --dry-run

# 3. Quick test (3 queries)
python benchmarks/ab/run_benchmark.py --max-queries 3

# 4. Full benchmark (49 queries, ~5-10 min)
python benchmarks/ab/run_benchmark.py
```

## What It Measures

| Metric | How |
|--------|-----|
| **Token efficiency** | Actual input/output tokens from API response |
| **Latency** | Wall-clock seconds per query |
| **Quality** | LLM-as-judge pairwise scoring on 5 dimensions |

Quality dimensions: correctness, completeness, actionability, specificity, conciseness.

## Architecture

```
User Query ──► build_pattern_g_context()  ──► GitHub Models API ──► Answer A
                 (SKILL.md + specialist)          (gpt-4.1)
                                                                      │
User Query ──► build_upstream_context()   ──► GitHub Models API ──► Answer B
                 (upstream role file)             (gpt-4.1)           │
                                                                      ▼
                                               GitHub Models API ──► Verdict
                                                    (o3 judge)
```

## Models (via GitHub Models API)

- **Answer model**: `openai/gpt-4.1` (configurable: `--answer-model`)
- **Judge model**: `openai/o3` (configurable: `--judge-model`)

Other models available on GitHub Models: `openai/gpt-4o`, `openai/o4-mini`, etc.

## Why GitHub Models API?

This project targets GitHub Copilot as its runtime. Using GitHub's own inference endpoint:
1. Validates that both architectures work with Copilot's model serving
2. Tests under the same rate limits and tokenization as production
3. Requires only a GitHub token (no external API keys)

## Output

Results are saved to `benchmarks/ab/results/`:
- `results.json` — full data (answers, token counts, verdicts)
- `report.md` — human-readable summary with tables

## Options

```
--answer-model MODEL   Model for answer generation (default: openai/gpt-4.1)
--judge-model MODEL    Model for judging (default: openai/o3)
--max-queries N        Limit number of queries
--judge-only           Re-run judge on existing answers (skip generation)
--dry-run              Show context sizes without API calls
```

## Prerequisites

```bash
pip install openai   # OpenAI SDK (used with GitHub Models endpoint)
```

No other dependencies needed.
