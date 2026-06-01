# Skill: Multi-Cloud Transit Design (`mcn_skill_transit_design`)

Design and implement transit architectures that connect workloads across Azure, AWS, and GCP. Owns the *pattern selection* (VPN mesh vs colocation fabric vs cloud-native interconnect vs third-party transit fabric vs hub-spoke-per-cloud vs flat mesh vs hierarchical regional/global), the *ASN-planning* discipline (assign unique private ASNs per cloud), the route-filtering / summarisation methodology, and the "no native cloud-to-cloud peering exists between Azure/AWS/GCP" baseline fact. The full CLI for VPN mesh per cloud, Megaport MCR / Equinix Fabric procedures, Aviatrix / Alkira / Prosimo overview, BGP examples, and bandwidth/SLA table all live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *pattern decision tree* (when to use VPN mesh vs colocation vs third-party transit fabric), the ASN-planning discipline, the route-summarisation rule (advertise summary at boundary), the "redundant paths always" rule for production, and the "Azure-Oracle is the exception, otherwise no native cloud-to-cloud peering exists" baseline. All CLI, vendor product summaries, Terraform examples, and the bandwidth/SLA matrix live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Transit-Hub" })` for the canonical CLI per cloud pair, colocation models (Megaport MCR / Equinix NE), cloud-native pairs table, third-party transit fabrics (Aviatrix / Alkira / Prosimo), ASN-planning template, route-filtering rules, transit-architecture patterns, and bandwidth/SLA matrix.
2. Cite the vault page when quoting CLI, ASN ranges, or bandwidth/SLA values.

If a cloud pair / vendor isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_mcn" })`.

---

## When to use transit-design

| Scenario | Behaviour |
|---|---|
| "Design transit between Azure and AWS" | Walk pattern decision tree → recommend VPN / colocation / third-party fabric; output topology + ASN plan |
| "Should we use Aviatrix / Alkira / Prosimo?" | Apply third-party-fabric criteria (segmentation needs, multi-cloud-policy-plane needs, scale) |
| "Megaport MCR vs Equinix Fabric" | Surface colocation-model comparison from vault |
| "Native interconnect between Azure and AWS?" | Correct the assumption — only Azure-Oracle is native; everything else needs VPN / colo / third-party |
| ASN planning across clouds | Apply the ASN-template; require unique private ASN per cloud and on-prem |
| "How do we summarise prefixes at cloud boundary?" | Apply route-filtering rules from vault |
| Cost comparison of transit options | Redirect: `cn_skill({ specialist: "cn_mcn", skill: "cost-comparison" })` |
| Pure egress redesign within a cloud | Redirect: `cn_skill({ specialist: "cn_price", skill: "egress-architecture" })` |
| Multi-cloud addressing | Redirect: `cn_skill({ specialist: "cn_mcn", skill: "addressing-plan" })` |
| Multi-cloud latency tuning | Redirect: `cn_skill({ specialist: "cn_mcn", skill: "latency-optimization" })` |
| Detailed ExpressRoute design | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "expressroute-design" })` |
| Detailed AWS Transit Gateway design | Redirect: `cn_skill({ specialist: "cn_vnet", skill: "hub-spoke-design" })` (for AWS hub-spoke + TGW) |
| BGP policy / routing design | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "routing-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical multi-cloud transit reference — VPN mesh CLI per pair, colocation models (Megaport MCR / Equinix NE), cloud-native interconnect pairs table, third-party transit fabrics (Aviatrix / Alkira / Prosimo), BGP routing across clouds (ASN planning, route filtering), transit architecture patterns (hub-spoke per cloud / flat mesh / hierarchical), bandwidth/SLA matrix | [[Transit-Hub]] | `cn_vault_page({ page: "Transit-Hub" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Cloud pair(s)** — Azure-AWS / Azure-GCP / AWS-GCP / 3-way.
2. **Aggregate cross-cloud bandwidth requirement** — drives VPN-vs-private-circuit-vs-third-party choice.
3. **Latency budget** — internet path acceptable vs <2 ms same-metro requirement.
4. **Production SLA** — VPN tunnels alone don't meet 99.95%+ without redundant pairs.
5. **Segmentation requirement** — multi-tenant / multi-environment isolation drives third-party fabric.
6. **Multi-cloud-policy-plane requirement** — single pane of glass across clouds → Aviatrix/Alkira.
7. **On-prem participation** — does the transit also need to include on-prem datacenter?
8. **Existing colocation footprint** — already in Equinix/Megaport metros?
9. **AS-number availability** — confirm private ASN range available (64512–65534 / 4200000000–4294967294).
10. **Region(s) / metros** — colocation pattern only works in metros with cloud on-ramps.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Transit-Hub`**.
3. **Disambiguate cloud-to-cloud baseline** — confirm "no native interconnect between Azure/AWS/GCP" (only Azure-Oracle is the exception). Don't waste cycles searching for a native product.
4. **Apply the pattern decision tree**:
   - **Low bandwidth (<1 Gbps), no SLA constraint** → VPN mesh.
   - **Medium-high bandwidth, latency-sensitive, single metro** → colocation (Megaport MCR or Equinix Fabric).
   - **Need single multi-cloud policy plane / segmentation / encryption-at-rest in transit** → third-party fabric (Aviatrix / Alkira / Prosimo).
   - **3+ clouds with regional + global hierarchy** → hierarchical pattern.
   - **Small (3-5 networks)** → flat mesh; otherwise hub-spoke per cloud with cross-cloud backbone.
5. **For VPN mesh** — produce CLI per cloud pair (cite vault), require redundant tunnels for SLA.
6. **For colocation** — pick metro (e.g., Ashburn / Dallas / Frankfurt with on-ramps); MCR for SDN-managed L3 vs NE for full appliance (Cisco / PAN / Fortinet).
7. **For third-party fabric** — choose based on segmentation / encryption / app-layer-optimisation need.
8. **Apply ASN-planning template** — unique private ASN per cloud and on-prem (e.g., Azure 65010, AWS 65020, GCP 65030, on-prem 65001, colo 65050).
9. **Apply route-filtering rules** — summarise at cloud boundary (`10.0.0.0/10`, `10.64.0.0/10`); filter specific small prefixes; AS-path-prepend for failover; prefix limits to prevent leaks.
10. **Specify redundancy** — never single-tunnel / single-circuit in production; meet the SLA's redundancy precondition.
11. **Surface anti-patterns** — single-VPN-tunnel "for HA", same ASN reuse across clouds, missing prefix filters, flat mesh past 5 networks, picking colocation when no metro footprint exists.
12. **Emit** in the output format below.

---

## Output format

Every transit-design answer should emit:

1. **Inputs assumed** — cloud pair, bandwidth, latency budget, SLA, segmentation needs.
2. **Baseline fact** — confirm no native interconnect between the requested cloud pair (unless Azure-Oracle).
3. **Pattern selected** — VPN mesh / colocation / third-party fabric / hub-spoke + ASN topology — with rationale.
4. **ASN plan** — table per node with private ASN.
5. **Route-filter plan** — summary advertisement per boundary; suppressed specifics; prefix limits.
6. **CLI / Terraform pointer** — cite vault snippets; don't reinvent.
7. **Redundancy posture** — tunnel/circuit pairs, AZ/zone diversity, failover behaviour.
8. **Bandwidth/SLA expectation** — cite the matrix row that matches.
9. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
10. **What this excludes** — cost modelling (`mcn/cost-comparison`), addressing (`mcn/addressing-plan`), latency tuning (`mcn/latency-optimization`), ER/DX/Interconnect detail (`cn_hyb/expressroute-design`).
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Recommending "native peering between Azure and AWS"** — it doesn't exist (except Azure-Oracle). Always start by confirming the baseline.
2. **Single VPN tunnel for production.** Doesn't meet HA SLA; outage on the tunnel kills the connection. Always pair.
3. **Reusing the same private ASN across clouds.** Causes BGP loops, route-rejection, and silent path issues. Unique per cloud + on-prem.
4. **No prefix summarisation at boundaries.** Route-table bloat across clouds, slow convergence, and "every change reverberates" syndrome.
5. **No prefix limits** on BGP sessions. A route-leak on one side blasts the whole transit.
6. **Recommending colocation for a metro where the customer has no footprint.** Drives 6+ months of build-out before any traffic flows.
7. **Recommending Aviatrix/Alkira/Prosimo at small scale.** Adds runtime + license costs for cases solvable by VPN mesh; only justify when segmentation / multi-cloud policy plane / app-layer optimisation are required.
8. **Flat mesh past ~5 networks.** N×(N-1)/2 peerings becomes unmanageable; switch to hub-spoke per cloud with cross-cloud backbone.
9. **Skipping AS-path prepending for failover paths.** All paths look equal; failover behaviour becomes unpredictable.
10. **Recommending GCP HA VPN as single-interface.** HA VPN's SLA requires the two-interface configuration with redundant tunnels.
11. **Mixing colocation cross-connects (L2) with cloud-native VPN (L3) without acknowledging the encapsulation/MTU implications.** Causes MTU black-holing.
12. **Designing transit without a route-table inventory.** Cross-cloud advertised prefixes overlap with on-prem or other cloud and silently break reachability.

**Analysis only — verify against vendor documentation before applying.**
