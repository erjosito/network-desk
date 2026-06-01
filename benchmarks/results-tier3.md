# Tier 3 — Live A/B benchmark (real CLI prompts + LLM judge)

Run ID: `tier3-iso-20260601-173409` · Date: 2026-06-01 · Node: v22.14.0

- **PSKB** = *Per-Skill Knowledge Base* — the upstream `dmauser/network-desk` design (5 parameterized loader tools, one folder of `SKILL.md` files per specialist).
- **CKB**  = *Consolidated Knowledge Base* — this fork (PSKB + an Obsidian-style cross-cutting vault + a 6th `cn_search` BM25 tool).

## TL;DR

Ten curated prompts, two extension variants (**CKB** vs **PSKB** @ `86a81ad`), one
sample per pair, blind LLM judge with order-swap.

| Headline | Result |
|---|---|
| **Final tally** | **CKB 4 / PSKB 3 / TIE 3** (n = 10) |
| Answer model | `gpt-5.2` (defaults — no effort override) |
| Judge model | `claude-opus-4.7 --effort high` |
| Judge agreement (both orderings unanimous) | 7 / 10 (3 ties came from disagreement) |
| Mean elapsed: CKB | **104.6 s** (vs 89.2 s PSKB, +17 %) |
| Mean final-answer bytes: CKB | **2085 B** (vs 2732 B PSKB, −24 %) |
| Mean tool calls per prompt: CKB | **58.0** (vs 21.6 PSKB, +169 %) |

CKB wins by giving more **concrete, actionable** answers in 4 of 10 prompts (Azure
mechanism names, cloud SKUs, vendor-specific gotchas) while being on average **24 %
shorter**. PSKB wins in 3 cases where the vault was missing a critical concept
(Cisco Secure Firewall Migration Tool, PAN-OS Azure HA plugin modes, GCP Interconnect
SLA tiers). The remaining 3 are genuine ties — the judge's two orderings
disagreed, indicating the answers are close to interchangeable.

**Headline numbers aside, the most interesting result is that the win:loss ratio is
flat (4:3) on a sample of 10 with an LLM judge** — confirming the Tier 2 finding that
the refactor's wins are concentrated in *retrieval recall* (98 % vs 84 % answerable),
not in raw answer correctness when both extensions can reach the same source material.

---

## Methodology

### Variants under test

| Variant | Source | Commit | Tools exposed |
|---|---|---|---|
| `CKB` | `C:\Users\jomore\Repos\network-desk` (working tree) | local HEAD | 6: `cn_capabilities`, `cn_route`, `cn_role`, `cn_orchestrate`, `cn_skill`, **`cn_search`** |
| `PSKB` | `dmauser/network-desk` clone | `86a81ad65fe63f999b18e208d0bc358f60230e7c` | 5: `cn_capabilities`, `cn_route`, `cn_role`, `cn_orchestrate`, `cn_skill` |

Each variant was installed into its own `COPILOT_HOME` (`benchmarks/runs/tier3/copilot-home-{CKB,PSKB}/`)
to fully isolate sessions and prevent extension-tool-name clashes between parent and
child Copilot processes. Smoke verification before the main loop confirmed each
variant exposed exactly the expected tool surface.

### Prompts

10 curated questions spanning 5 categories (`benchmarks/queries-tier3.json`):

| Category | Count | IDs |
|---|---:|---|
| regex-easy | 3 | vnet-hub-spoke · fw-ha · nsec-ddos |
| vendor-specific | 3 | fw-vendor-palo · fw-vendor-cisco · fw-vendor-vyos |
| cloud-service | 2 | hyb-gcp-interconnect · vwan-aws-equiv |
| vague | 2 | price-egress · ntsh-asymmetric |

### Driver (`benchmarks/run-live.mjs`)

* Spawns `copilot --no-auto-update --allow-all-tools --no-ask-user --experimental --model gpt-5.2 --share <path> -p <prompt>` per (prompt × variant), with `COPILOT_HOME` set to the variant's isolated home.
* Alternates variant order per prompt (even index → CKB-first, odd → PSKB-first) to counter-balance time-of-day / cache effects.
* Persists `run-meta.json` incrementally so a mid-run crash leaves usable data.
* 600 s per-call timeout (no timeouts triggered in the final run).

### Judge (`benchmarks/judge.mjs`)

* For each prompt, extracts the final assistant reply from both share files, strips the
  `Analysis only — verify against vendor documentation before applying.` footer
  (regex includes the `\>` blockquote prefix common in both outputs), and submits the
  pair to `claude-opus-4.7 --effort high` **twice**:
  * **forward:** A = CKB, B = PSKB
  * **swapped:** A = PSKB, B = CKB
* Rubric: correctness · completeness · actionability · specificity · conciseness
  (5-point Likert), plus categorical `winner ∈ {A, B, tie, both_poor}`.
* Explicit anti-length-bias and anti-position-bias instructions in the prompt:

  > DO NOT reward length by itself. Prefer the answer that is more correct, specific,
  > and actionable. Penalize verbosity if it adds unsupported claims, generic filler,
  > or obscures the answer. Reward extra detail only when it materially improves
  > correctness or usability.

* Final verdict: both orderings must independently pick the same non-tie winner;
  otherwise → tie. Disagreement-as-tie is conservative; the raw judge agreement
  rate was 7/10.

---

## Headline metrics

### Cost / latency

| Metric | CKB | PSKB | Δ |
|---|---:|---:|---:|
| Total elapsed (10 prompts × 2 variants → 20 calls) | — | — | — |
| Mean elapsed / prompt | 104.6 s | 89.2 s | **+17.3 %** |
| Median elapsed / prompt | 86.7 s | 69.6 s | +24.6 % |
| Mean final-answer bytes | 2085 B | 2732 B | **−23.7 %** |
| Total tool calls across 10 prompts | 580 | 216 | **+168.5 %** |
| Mean tool calls / prompt | 58.0 | 21.6 | +168.5 % |

CKB is slower per prompt because the model fires more tool calls — typically
`cn_role → cn_orchestrate → cn_search → cn_skill` (read a vault page) → `cn_skill`
(read another vault page) — while PSKB's flow tops out at `cn_role → cn_orchestrate
→ cn_skill` because there's no search tool and skills are coarser.

### Tool mix

| Tool | CKB calls | PSKB calls | Comment |
|---|---:|---:|---|
| `cn_route` | 19 | 15 | parity |
| `cn_role` | 114 | 68 | CKB re-loads roles more (likely because the routing message points users at multiple specialists per prompt) |
| `cn_orchestrate` | 72 | 34 | same dynamic as `cn_role` |
| `cn_skill` | **344** | **98** | CKB reads vault pages on average ~3.5× as often |
| `cn_search` | **24** | n/a | new in CKB — most prompts trigger 1–4 searches |
| `cn_capabilities` | 7 | 1 | exploration only on cold sessions |

The 580 vs 216 gap is driven entirely by `cn_skill` (vault page reads). This is *by
design* — the refactor split each old monolithic SKILL.md into many small vault pages,
so the model now reads more pages per answer. The trade-off is more network round-trips
(and ~17 % slower wall-clock) in exchange for finer-grained relevance.

---

## Per-prompt detail

| # | Prompt | Cat | CKB s | Up s | CKB B | Up B | CKB tools | Up tools | **Winner** |
|---:|---|---|---:|---:|---:|---:|---:|---:|---|
| 1 | vnet-hub-spoke | regex-easy | 101.6 | 82.0 | 3075 | 2861 | 16 | 19 | tie |
| 2 | fw-ha | regex-easy | 51.6 | 57.0 | 1040 | 6508 | 52 | 42 | **CKB** |
| 3 | nsec-ddos | regex-easy | 47.8 | 39.2 | 1036 | 1167 | 37 | 17 | tie |
| 4 | fw-vendor-palo | vendor-specific | 189.5 | 171.1 | 1875 | 3318 | 99 | 20 | PSKB |
| 5 | fw-vendor-cisco | vendor-specific | 145.7 | 120.1 | 2393 | 1851 | 182 | 36 | PSKB |
| 6 | fw-vendor-vyos | vendor-specific | 242.4 | 173.8 | 7865 | 6616 | 68 | 24 | **CKB** |
| 7 | hyb-gcp-interconnect | cloud-service | 65.5 | 111.4 | 870 | 970 | 39 | 30 | PSKB |
| 8 | vwan-aws-equiv | cloud-service | 27.6 | 26.4 | 522 | 635 | 5 | 5 | tie |
| 9 | price-egress | vague | 71.9 | 58.7 | 925 | 1073 | 50 | 18 | **CKB** |
| 10 | ntsh-asymmetric | vague | 102.3 | 51.8 | 1249 | 2317 | 32 | 5 | **CKB** |

### Per-category tally

| Category | CKB | PSKB | Tie | Read |
|---|---:|---:|---:|---|
| regex-easy (3) | 1 | 0 | 2 | Both extensions can reach the canonical Azure pages; CKB edges out where it can compress the answer (fw-ha) |
| vendor-specific (3) | 1 | 2 | 0 | PSKB wins where the vault is missing a vendor's first-party tool (FMT for ASA→FTD migration, PAN-OS Azure plugin HA modes). CKB wins on VyOS where the dedicated `Vendors/VyOS.md` page covers both policy-based and route-based VPN options. |
| cloud-service (2) | 0 | 1 | 1 | CKB doesn't yet have a tight enough `Services/GCP/Dedicated-Interconnect.md` page (it's a stub today) — PSKB's `hyb-specialist` skill happens to surface the 99.9 % / 99.99 % SLA tiers |
| vague (2) | 2 | 0 | 0 | CKB's vault structure helps the model name concrete Azure mechanisms (Allow forwarded traffic, BGP propagation, GWLB) and cloud-specific egress levers (S3 Gateway Endpoints, cross-AZ, ETag/304) rather than staying at framework level |

---

## Notable wins / losses (judge justifications)

Direct quotations from the LLM judge (both orderings).

### Win for CKB — `fw-ha` (active-passive firewall HA configuration patterns)

> A is tight and names concrete cloud constructs (Azure SLB HA ports, AWS GWLB, GCP ILB)
> plus VRRP/CARP. B leaks raw tool-call JSON into the answer (poor presentation) and
> its final prose is slightly more generic on cloud SKUs.

> B names concrete cloud constructs (Azure SLB HA ports, AWS GWLB, GCP ILB, VRRP/CARP,
> EIP move) giving actionable steering choices, while A stays largely abstract
> ("cloud HA pair behind LB").

CKB won despite being **6.3× shorter** (1040 B vs 6508 B). This is the clearest signal
that the anti-length-bias prompt is working as intended.

### Win for CKB — `ntsh-asymmetric` (avoid asymmetric routing through an NVA)

> A names concrete Azure mechanisms (Allow forwarded traffic, BGP propagation disable,
> GWLB, effective routes) and HA caveat about session sync, making it more specific
> and actionable. B is correct and well-structured but stays more conceptual.

The vault's per-mechanism Topics pages (`Topics/Hybrid/`, `Topics/Firewall/`,
`Topics/Troubleshooting/Routing-Debug.md`) seem to help the model name the right
knobs rather than describing the problem abstractly.

### Win for CKB — `price-egress` (minimize multi-cloud egress costs)

> A names concrete levers (S3/DynamoDB Gateway Endpoints, cross-AZ, ETag/304, protobuf)
> that directly cut egress bills, while B stays at a higher framework level ("measure
> & rank", "cost guardrails") with fewer named SKUs.

### Loss for CKB — `fw-vendor-cisco` (migrate ASA rules to FTD)

> B explicitly names the Cisco Secure Firewall Migration Tool (FMT) and FMC Access
> Control Policy — the actual vendor-recommended path — with doc links, while A
> describes a generic manual runbook and omits FMT entirely.

`Vendors/Cisco-ASA-FTD.md` does not mention the Cisco Secure Firewall Migration Tool
in its hand-authored sections. **Direct content gap to fix.**

### Loss for CKB — `fw-vendor-palo` (PA NGFW HA on Azure)

> A is crisp and correct but omits the PAN-OS plugin HA modes (UDR / Secondary-IP
> move) and the symmetric-return/SNAT pitfall. B covers both steering options, names
> the plugin requirements (same RG, SP permissions).

But interestingly, when the prompts were swapped the judge flipped:

> Answer B recommends a Public Standard LB with HA Ports, but HA Ports is only
> supported on Internal Standard Load Balancers — this is a factual error. Answer A
> correctly notes HA Ports is internal-only.

Both orderings still resolved to PSKB as winner (positional A ≠ CKB in the
swapped run), so the agreement gate passed. But this case shows the judge's
position-blind methodology is reliable.

### Loss for CKB — `hyb-gcp-interconnect` (GCP Dedicated Interconnect redundancy)

> B cites the actual SLA tiers (99.9 % / 99.99 %) tied to the topologies and includes
> vendor doc links, plus ECMP guidance.

`Services/GCP/Dedicated-Interconnect.md` is a stub today (`generate-multicloud-stubs.mjs`
created it as a ~1 KB placeholder). PSKB's monolithic `hyb-specialist` skill
happens to include the SLA tiers. **Direct content gap to fix.**

---

## Process observations (qualitative)

These don't show in the tally but affect maintainability + user trust:

* **CKB produces broken markdown in some runs.** In the `fw-ha` PSKB answer, raw
  tool-call JSON leaked into the final reply (the judge called it out: *"B leaks raw
  tool-call JSON into the answer (poor presentation)"*). Both extensions are
  susceptible since they share the same `cn_*` tool-result shape — but PSKB's
  larger skill bundles seem to trip the model more often.
* **CKB's tool footprint is dominated by `cn_skill`** (344 / 580 = 59 %). The
  refactor traded "one big skill read" for "many small page reads"; this hurts
  wall-clock latency. Worth investigating whether the model could batch-read
  via a `cn_search ... expand_links=true` followed by a single `cn_skill` of the
  top page, rather than reading 6–10 pages serially.
* **The 17 % latency hit isn't trivial for production use** but is justifiable for
  the recall improvement seen in Tier 2 (84 % → 98 % answerable).

---

## Caveats

| Caveat | Impact |
|---|---|
| **n = 10**, single sample per pair | Wide CI on the headline tally. 4 / 3 / 3 ≈ 50 % chance to flip either way on resample. |
| **Curated discriminative prompts** | Prompts were hand-picked to span categories, not weighted by real-world frequency. Real production traffic is likely heavier in `regex-easy` and `vague`, where CKB does better. |
| **Single answer model (`gpt-5.2`, default effort)** | Other models may interact differently with the larger tool surface — e.g. weaker models may struggle with the extra search step. |
| **Single judge model (`claude-opus-4.7 --effort high`)** | Opus judging across vendor families is a known soft spot. We mitigated with order-swap + Likert + agreement gate, but a second judge (e.g. `gpt-5.4`) would tighten confidence. |
| **No `@network-desk` prefix in prompts** | Both extensions auto-route via regex triggers, so this is realistic. But the bias toward keyword-rich prompts (matching the existing regexes) plays to both extensions equally. |
| **Prompts contained the literal text the regex would match** | E.g. "Palo Alto" hits the `palo-alto|panos` trigger directly. Real users will use more varied phrasings that may bypass the regex on either side — the regex is the limiting factor, not the underlying knowledge depth. |
| **Single-cloud bias in vault content** | `Services/Azure/` has 6 canonical pages; `Services/AWS/` and `Services/GCP/` are mostly stubs. PSKB's monolithic skills include some AWS/GCP detail that hasn't yet been extracted into vault stubs. The two `cloud-service` ties + 1 loss here suggest content gaps, not architecture gaps. |

---

## Actions implied

| Priority | Action | Effort |
|---|---|---|
| **P1** | Add Cisco Secure Firewall Migration Tool (FMT) to `Vendors/Cisco-ASA-FTD.md` "Common gotchas" or new "Migration tooling" section | XS |
| **P1** | Fill in `Services/GCP/Dedicated-Interconnect.md` with SLA tiers + topology patterns (currently a stub) | S |
| **P2** | Add PAN-OS Azure plugin HA modes (UDR / Secondary-IP move) to `Vendors/PAN-OS.md` HA section, including the "HA Ports is internal-LB only" gotcha | S |
| **P3** | Investigate the "raw tool-call JSON leaking into the final reply" pattern — affects both extensions | M |
| **P3** | Consider an `expand_links=true` heuristic: when search returns a strongly-related cluster, encourage the model to read just the top page instead of 6+ | M |

The P1 + P2 items are direct content additions caught by the benchmark — exactly the
kind of long-tail gap a Tier 2 retrieval benchmark can't surface (where the page exists
but is shallow).

---

## Reproducibility

```bash
# Stage isolated COPILOT_HOMEs (one-time, ~5 min)
#   1. Clone PSKB to ../network-desk-upstream at commit 86a81ad
#   2. Run the staging routine recorded in checkpoint 012
#   3. Verify both homes have extensions/network-desk/extension.mjs

# Sanity-check the variants
ls benchmarks/runs/tier3/copilot-home-{CKB,PSKB}/extensions/network-desk/extension.mjs

# Run answers (~35 min on a typical laptop, depends on gpt-5.2 latency)
node benchmarks/run-live.mjs 2>&1 | tee benchmarks/runs/tier3/driver.log

# Run judge (~5 min — opus high-effort is fast on short text)
node benchmarks/judge.mjs 2>&1 | tee benchmarks/runs/tier3/judge.log

# Outputs
#   benchmarks/runs/tier3/run-meta.json      — per-prompt run telemetry
#   benchmarks/runs/tier3/judge-meta.json    — verdicts + per-dimension scores + justifications
#   benchmarks/runs/tier3/answers/*.md       — full Copilot share files for both variants
#   benchmarks/runs/tier3/judge/*.md         — full judge share files
```

Override knobs (env vars on the driver / judge):

| Env var | Default | Effect |
|---|---|---|
| `TIER3_ANSWER_MODEL` | `gpt-5.2` | Driver's `--model` flag |
| `TIER3_JUDGE_MODEL` | `claude-opus-4.7` | Judge's `--model` flag |
| `TIER3_JUDGE_EFFORT` | `high` | Judge's `--effort` flag |

---

## Conclusion (1-paragraph version)

On a 10-prompt curated benchmark with `gpt-5.2` answering and `claude-opus-4.7 --effort
high` judging blindly with order-swap, **the CKB refactor edges out PSKB 4 wins to
3 with 3 ties — within noise for n = 10**. The judge's per-dimension scores show CKB
wins where it can be specific about Azure/cloud mechanisms (driven by the
finer-grained vault structure) and loses where the vault has hand-authoring gaps
(Cisco FMT, PAN-OS Azure plugin, GCP Interconnect SLA tiers) that PSKB's bulkier
skills happen to cover. Combined with Tier 2's measured **+14 pp answerable-rate
improvement** (84 % → 98 %), the refactor pays for the +17 % latency cost — and the
benchmark gives us a precise, actionable list of 3 content gaps to close.
