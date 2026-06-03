# Network Desk A/B Benchmark — Pattern G vs Upstream
_Generated: 2026-06-03T09:27:22+00:00_

**Answer model:** `gpt-5.5` (effort `medium`) — both variants run through Copilot CLI subprocess.
**Judge model:** `claude-opus-4.6` (effort `high`) — answer order randomized per query to neutralize position bias.

## Latency & token efficiency

| metric | pattern-g | upstream |
|---|---|---|
| queries run | 32 | 32 |
| p50 wall (ms) | 67804 | 92061 |
| p95 wall (ms) | 104398 | 177330 |
| p50 LLM api (ms) | 28350 | 31119 |
| mean output tokens (JSONL) | 930.3 | 942.1 |
| mean premium requests | 7.5 | 7.5 |
| mean tool calls | 2 | 4.4 |
| mean cn_* tool calls | 0 | 3 |
| contaminated runs (wrote files) | 0 | 0 |
| architecture-used rate | 0.9375 | 1.0 |
| network-desk skill load rate | 1.0 | — |
| network-desk skill invoke rate | 0.9375 | — |

## Judge verdict (head-to-head)

- Pattern G wins: **16**  · Upstream wins: **9**  · Ties: **7**  · Unparsed: **0**

### Mean judge scores per axis (0-10)

| axis | pattern-g | upstream |
|---|---|---|
| technical_accuracy | 8.4 | 8.5 |
| completeness | 8.2 | 7.9 |
| actionability | 7.9 | 7.8 |
| clarity | 8.3 | 8.2 |
| conciseness | 7.4 | 7.2 |

## Per-query verdicts

| id | winner | reason |
|---|---|---|
| cap-throughput | upstream | B gives precise throughput rating (650 Mbps), uses defensible 60% utilization rule, and includes doc link; A understates VpnGw1 capacity and over-engineers with |
| cdn-cloudfront | pattern-g | A names specific managed policies (CachingOptimized/CachingDisabled), shows concrete header examples, and details custom error response codes—more directly acti |
| cnet-cni | tie | Both valid CNI picks for strict planning; A more actionable with table/CIDR detail, B more concise and arguably better scoped but uses non-standard 'static bloc |
| dns-private-resolver | tie | Both technically accurate with correct inbound-endpoint pattern. A adds regional resiliency, spoke guidance, doc links; B is tighter and more focused. Trade-off |
| doc-xlsx-report | pattern-g | B uses real Excel structured references, enumerates specific networking resources, adds tag governance, and specifies pivot row/value configs—more directly impl |
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
| iac-terraform-hub | tie | Both technically correct with azurerm ~>4.0. A adds tags/shared-svc subnet; B adds spoke route table. Different completeness trade-offs, similar overall quality |
| ipv6-migration | tie | A excels with exit criteria and risk register; B is more concise with stronger Azure-specific details (ICMPv6, /64 constraints, Basic LB). Both technically soun |
| lb-l4-vs-l7 | pattern-g | A provides more concrete protocol examples (MQTT, SIP, gRPC, K8s Ingress) improving actionability; B wastes space with unnecessary 'routing through specialists' |
| mcn-service-mapping | pattern-g | A correctly cites Private Service Access (VPC peering for managed services); B conflates it with Private Google Access (subnet setting for API reach). A is also |
| mon-flow-logs | pattern-g | B provides a concrete CLI command and structured table making it immediately actionable; both are technically sound but B is more operationally useful |
| nauto-drift | pattern-g | B adds validation step, continuous operation loop, and more specific per-drift-type remediation actions; both accurate but B is more complete and actionable. |
| nsec-ddos | pattern-g | B adds auth-endpoint hardening, graceful degradation, baseline TLS policy, cross-cloud table, and origin design principle—all substantive and correct. |
| ntsh-mtu | tie | Both technically accurate, well-structured, actionable. B adds asymmetric ICMP path insight; A adds IPv6 detail. Net equivalent quality. |
| pl-endpoint-dns | pattern-g | B adds PE placement guidance (hub vs spoke table), DNS Private Resolver outbound coverage, and a pitfalls section—all substantive and accurate extra value over  |
| price-egress | pattern-g | A offers better structure, more specific tactics (container images, package repos, secrets), and a useful target-architecture synthesis; B is tighter but adds f |
| sase-ztna | pattern-g | B covers more practical details (DNS, IPv6, legacy protocols, pitfalls, success criteria) that matter in real migrations; A is cleaner but less complete |
| vnet-hub-spoke | tie | Both technically sound. A broader coverage (VWAN option, DDoS, DNS, NSGs); B more actionable subnet sizing. Trade-off is completeness vs conciseness. |
| vnet-ip-planning | upstream | B has invalid 5-octet notation (10.x.y.1.0/24) in subnet examples; A is technically clean, immediately implementable, and well-structured throughout. |
| vnet-peering-transitivity | pattern-g | B is better structured with actionable sub-steps, clearer formatting, and no wasted preamble about routing to a specialist. |
| vnet-subnet-math | upstream | Both correct (27 usable). B adds useful detail on which addresses are reserved (first 4 + last 1) and uses a clearer table format. |
| vwan-routing-intent | upstream | B uses correct Azure destination labels (Internet/PrivateTraffic), includes NVA option, mentions propagate default route setting, and covers inter-hub/capacity  |

---

Raw per-query results live under `results/<variant>/<id>.{json,jsonl}`. 
Per-judgement details live under `results/judge/<id>.{json,jsonl}`.
