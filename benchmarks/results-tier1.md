# Network-desk: upstream vs ours — static + microbench

Generated 2026-06-01T12:05:59.977Z

- **upstream** = `C:\Users\jomore\Repos\network-desk-upstream` (dmauser/network-desk @ master)
- **ours**     = `C:\Users\jomore\Repos\network-desk` (erjosito/network-desk + Phase 1-3 local commits)

## 1. Content footprint

| side     | specialists .md | specialists KB | vault .md | vault KB  | all .md | all KB    |
| -------- | --------------- | -------------- | --------- | --------- | ------- | --------- |
| upstream | 144             | 1421.3 KB      | 0         | 0.0 KB    | 144     | 1421.3 KB |
| ours     | 144             | 1421.3 KB      | 164       | 1408.8 KB | 308     | 2830.1 KB |

- **Delta:** ours has **+164 .md files** (+113.9%), **+1408.8 KB** total (+99.1%).
- The vault layer (`extensions/network-desk/vault/`) is **net new** in ours — 164 pages, 1408.8 KB.

## 2. Tool surface

| side     | tools | names                                                                   |
| -------- | ----- | ----------------------------------------------------------------------- |
| upstream | 5     | cn_capabilities, cn_route, cn_role, cn_orchestrate, cn_skill            |
| ours     | 6     | cn_capabilities, cn_route, cn_role, cn_orchestrate, cn_skill, cn_search |

- **Added:** `cn_search`

## 3. Specialist + skill registry

| side     | specialists | skills (total) | avg skills/specialist |
| -------- | ----------- | -------------- | --------------------- |
| upstream | 20          | 124            | 6.2                   |
| ours     | 20          | 124            | 6.2                   |

- Same specialist set (registry parity confirmed).

## 4. Runtime dependencies

| side     | dep count | deps       |
| -------- | --------- | ---------- |
| upstream | 0         | (none)     |
| ours     | 1         | minisearch |

## 5. extension.mjs size

| side     | LOC | bytes       |
| -------- | --- | ----------- |
| upstream | 852 | 57221 bytes |
| ours     | 902 | 59947 bytes |

## 6. Microbench — cn_search cold-start + per-query latency

Upstream has no equivalent search tool, so this section measures only the new `cn_search` runtime cost.

- **vault-search.mjs import:** 7.23 ms (one-time)
- **First cn_search call (cold — builds index):** 190.09 ms
- **Warm cn_search latency** (60 samples across 12 representative queries × 5 iterations):
  - mean = 0.78 ms, p50 = 0.65 ms, p95 = 2.30 ms, p99 = 3.33 ms, max = 3.33 ms

## 7. Summary

| | upstream | ours | delta |
|---|---:|---:|---:|
| Markdown files | 144 | 308 | +164 (+113.9%) |
| Markdown KB    | 1421.3 KB | 2830.1 KB | +1408.8 KB (+99.1%) |
| Vault pages    | 0 | 164 | +164 |
| Tools          | 5 | 6 | +1 |
| Specialists    | 20 | 20 | +0 |
| Runtime deps   | (see §4) | (see §4) | +1 (minisearch) |

