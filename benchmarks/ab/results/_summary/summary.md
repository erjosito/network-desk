# Network Desk A/B Benchmark — Pattern G vs Upstream
_Generated: 2026-06-02T13:42:39+00:00_

**Answer model:** `gpt-5.5` (effort `medium`) — both variants run through Copilot CLI subprocess.
**Judge model:** `claude-opus-4.6` (effort `high`) — answer order randomized per query to neutralize position bias.

## Latency & token efficiency

| metric | pattern-g | upstream |
|---|---|---|
| queries run | 15 | 15 |
| p50 wall (ms) | 65530 | 114109 |
| p95 wall (ms) | 98086 | 189869 |
| p50 LLM api (ms) | 26283 | 32325 |
| mean output tokens (JSONL) | 897 | 965.7 |
| mean premium requests | 7.5 | 7.5 |
| mean tool calls | 2 | 3.6 |
| mean cn_* tool calls | 0 | 2.3 |
| contaminated runs (wrote files) | 0 | 0 |
| architecture-used rate | 0.9333333333333333 | 1.0 |
| network-desk skill load rate | 1.0 | — |
| network-desk skill invoke rate | 0.9333333333333333 | — |

## Judge verdict (head-to-head)

- Pattern G wins: **6**  · Upstream wins: **7**  · Ties: **2**  · Unparsed: **0**

### Mean judge scores per axis (0-10)

| axis | pattern-g | upstream |
|---|---|---|
| technical_accuracy | 8.3 | 8.4 |
| completeness | 7.9 | 7.9 |
| actionability | 7.5 | 7.7 |
| clarity | 8.2 | 8 |
| conciseness | 7.4 | 6.9 |

## Per-query verdicts

| id | winner | reason |
|---|---|---|
| fw-ha | upstream | B's table maps patterns to use cases for faster decision-making; numbered checklist with preemption/rollback guidance is more operationally actionable |
| fw-rule-audit | upstream | A is more actionable: specifies exact input fields needed, names correct structured log tables (AZFWNetworkRule), and gives prioritized remediation order. B bro |
| fw-vendor-cisco | pattern-g | B adds mandatory routing/UDR step, asymmetric routing risks, specific validation flows, and structured collection group design that A omits |
| fw-vendor-fortigate | upstream | B is more precise (FGCP, NP/ASIC offload, granular session-sync control, correct CLI path) and more actionable with specific test scenarios and operational guid |
| fw-vendor-opnsense | pattern-g | Both technically sound; A is cleaner and more concise. B adds API/HA detail but opening filler and extra verbosity hurt clarity/conciseness. |
| fw-vendor-palo | pattern-g | B includes critical IP forwarding requirement, NAT Gateway bypass warning, sizing by threat throughput, and dynamic address groups—practical details A omits |
| fw-vendor-vyos | pattern-g | A provides concrete CLI syntax, architecture diagram, and specific deployment steps making it significantly more actionable while maintaining equal technical ac |
| hyb-bgp-design | upstream | B provides specific local-pref values, explicit failover test steps, valid doc links, and clearer inbound/outbound separation making it more actionable |
| hyb-dx-macsec | pattern-g | Both technically equivalent; B is more focused without unnecessary routing preamble and disclaimer, adds practical detail about VIF coverage and IPsec overhead  |
| hyb-er-fastpath | upstream | A provides concrete IP limits, SKU thresholds, ER Direct vs provider distinctions, and specific fallback scenarios—all verifiable against docs. B is accurate bu |
| hyb-gcp-interconnect | tie | Both technically sound. A more complete (encryption, monitoring, refs) but has noisy preamble. B cleaner, more concise, better directional BGP guidance and MTU  |
| vnet-hub-spoke | tie | Both technically sound. A broader coverage (VWAN option, DDoS, DNS, NSGs); B more actionable subnet sizing. Trade-off is completeness vs conciseness. |
| vnet-ip-planning | upstream | B has invalid 5-octet notation (10.x.y.1.0/24) in subnet examples; A is technically clean, immediately implementable, and well-structured throughout. |
| vnet-peering-transitivity | pattern-g | B is better structured with actionable sub-steps, clearer formatting, and no wasted preamble about routing to a specialist. |
| vnet-subnet-math | upstream | Both correct (27 usable). B adds useful detail on which addresses are reserved (first 4 + last 1) and uses a clearer table format. |

---

Raw per-query results live under `results/<variant>/<id>.{json,jsonl}`. 
Per-judgement details live under `results/judge/<id>.{json,jsonl}`.
