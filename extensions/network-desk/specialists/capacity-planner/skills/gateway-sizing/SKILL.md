# Skill: Gateway Sizing (`ncap_skill_gateway_sizing`)

Select and right-size network gateway services across Azure (VPN Gateway, ExpressRoute, Application Gateway v2, Azure Firewall), AWS (VPN Gateway / Transit Gateway VPN, Transit Gateway), and GCP (Cloud VPN / HA VPN, Cloud Interconnect Dedicated / Partner). Owns the *right-sizing formula* (Required = Current Peak × Growth Factor × Headroom Multiplier; P95 standard / P99 for critical; 1.2 standard / 1.5 critical headroom), the *selection-criteria priority* (throughput → connection count → features → SLA → cost → upgrade path), the *upgrade-trigger thresholds* (downgrade if <50% utilised + no growth; plan upgrade at 70%; act by 80%), the *non-disruptive-vs-disruptive upgrade discipline* (Azure VPN Gen1-5 in-place; Basic→VpnGw* full redeploy; Classic→HA VPN full redeploy in GCP), the *break-even framing for VPN vs ExpressRoute* (data-transfer + latency + compliance drives selection), the *per-tunnel-not-aggregate gotcha* (Azure VPN aggregate is across all tunnels; AWS VPN ~1.25 Gbps per tunnel; ECMP needed for more), and the *packet-size-affects-throughput rule* (Cloud VPN + AWS VPN both packet-rate constrained). All SKU tables (VpnGw1-5 + AZ variants, ExpressRoute bandwidth tiers, Application Gateway v2 CU model, Azure Firewall Standard/Premium, AWS TGW VPC attachment quotas, GCP Cloud VPN HA limits, Cloud Interconnect VLAN capacities) live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *right-sizing formula*, the *selection-criteria priority*, the *upgrade-trigger thresholds*, the *non-disruptive-vs-disruptive* awareness, the *break-even framing for VPN vs ExpressRoute*, the *per-tunnel-vs-aggregate* gotcha, and the *packet-size-affects-throughput* rule. All SKU tables, cost-per-Mbps comparisons, ECMP guidance, MACsec / Direct Express options, and CU-based App Gateway model live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Gateway-Sizing" })` for the methodology, all SKU tables across Azure / AWS / GCP, cost-per-Mbps comparisons, cost-vs-performance tradeoff, ExpressRoute-vs-VPN break-even, and upgrade-path discipline.
2. For ExpressRoute architecture (private peering, ECMP, FastPath, Global Reach), redirect to `cn_skill({ specialist: "cn_hyb", skill: "expressroute-design" })`.
3. For VPN tunnel design and crypto / IKE / failover, redirect to `cn_skill({ specialist: "cn_hyb", skill: "vpn-design" })`.
4. For firewall throughput pricing comparison, redirect to `cn_skill({ specialist: "cn_price", skill: "firewall-pricing" })`.

If a SKU / service isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_ncap" })`.

---

## When to use gateway-sizing

| Scenario | Behaviour |
|---|---|
| "Size Azure VPN Gateway for 2 Gbps + 50 tunnels" | Apply formula → cite VpnGw4AZ from vault → cost / upgrade path |
| "Should we use ExpressRoute or VPN?" | Apply break-even (data + latency + compliance) from vault |
| "AWS VPN throughput is below expected" | Per-tunnel ~1.25 Gbps; ECMP across multiple connections needed for more |
| "Azure Application Gateway sizing for 50k concurrent + 5 Gbps" | Apply CU formula from vault (max of connections / throughput / compute) |
| "GCP Cloud VPN claims 3 Gbps — true?" | No — packet-rate constrained (250k pps); ~3 Gbps is upper-bound for large packets |
| "Azure Firewall Premium throughput with TLS inspection" | ~40% reduction; cite vault |
| "Upgrade path from VpnGw2 → VpnGw4?" | Non-disruptive in-place upgrade (Gen2 required for VpnGw4/5); cite vault |
| "GCP Classic VPN → HA VPN" | Disruptive; new gateway required; plan parallel + cutover |
| ExpressRoute deep architecture (peerings, Global Reach, Direct) | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "expressroute-design" })` |
| VPN tunnel design / crypto / failover | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "vpn-design" })` |
| Firewall pricing comparison | Redirect: `cn_skill({ specialist: "cn_price", skill: "firewall-pricing" })` |
| Bandwidth forecasting / growth modeling | Redirect: `cn_skill({ specialist: "cn_ncap", skill: "bandwidth-forecasting" })` |
| Scalability / throughput-calculations across the broader topology | Redirect: `cn_skill({ specialist: "cn_ncap", skill: "scalability-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical gateway-sizing reference — right-sizing methodology + formula + selection-criteria priority, Azure VPN Gateway SKUs (VpnGw1-5 + AZ variants + aggregate throughput + per-tunnel cap + tunnel/P2S counts), Azure ExpressRoute SKUs (bandwidth tiers + metered vs unlimited pricing + Direct + MACsec + Global Reach), Azure Application Gateway v2 CU model, Azure Firewall throughput (Standard 30 Gbps / Premium 100 Gbps with TLS reduction), AWS VPN Gateway throughput per tunnel + ECMP for scale, AWS Transit Gateway VPC attachment quotas, GCP Cloud VPN packet-rate constraint + HA VPN, GCP Cloud Interconnect Dedicated 10G/100G + Partner attachments, cost vs performance tradeoffs (cost-per-Mbps table), decision framework, ExpressRoute vs VPN break-even, upgrade path planning (non-disruptive vs disruptive) | [[Gateway-Sizing]] | `cn_vault_page({ page: "Gateway-Sizing" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Cloud + gateway type** in scope (Azure VPN / ER / App GW / FW, AWS VPN/TGW, GCP VPN / Interconnect).
2. **Current peak throughput** — P95 standard, P99 critical.
3. **Annual growth rate** estimate (%).
4. **Planning horizon** (1 / 2 / 3 years).
5. **Criticality** — standard (1.2 headroom) vs critical (1.5).
6. **Connection / tunnel count** projected — drives SKU for connection capacity even if throughput is low.
7. **Feature requirements** — BGP, active-active, zone-redundant, IKEv2, FastPath, Global Reach, MACsec.
8. **SLA target** — 99.9 vs 99.95 vs 99.99 — affects HA VPN vs single, zone-redundant SKU choice.
9. **Cost ceiling** — per-month budget.
10. **Encryption / private-path compliance** — drives ER vs VPN.
11. **Data-transfer volume per month** — drives ER metered vs unlimited break-even.
12. **Packet-size profile** — small packets (VoIP / API) significantly reduce VPN throughput vs large packets (bulk transfer).

---

## Workflow

1. **Collect inputs** above.
2. **Load `Gateway-Sizing`**.
3. **Apply the sizing formula** — Required = Current Peak × Growth Factor × Headroom Multiplier.
4. **Pick the SKU** from the relevant vault table that meets Required + connection count + feature set + SLA.
5. **Cross-check per-tunnel-vs-aggregate** — for AWS VPN, per-tunnel ~1.25 Gbps + need ECMP across multiple connections to scale; for Azure, aggregate is across all tunnels but per-tunnel still capped ~1.25 Gbps (IPsec overhead).
6. **Cross-check packet-size impact** — for VPN gateways, smaller packets reduce achievable throughput; flag if workload is API/VoIP-heavy.
7. **For ER vs VPN** — apply break-even analysis from vault using monthly data transfer + latency + compliance + budget.
8. **For App Gateway v2** — apply CU formula (max of concurrent connections / 2500, throughput / 2.22 Mbps, compute units) → min and max instance count.
9. **For Azure Firewall** — choose Standard vs Premium; apply ~40% throughput reduction for TLS inspection; size SNAT ports (each PIP = 2,496 ports per backend × up to 250 PIPs).
10. **For GCP Cloud Interconnect** — apply the bandwidth-tier decision tree (<1G Partner / 1-10G Dedicated 10G / 10-80G LAG of 10G / >80G Dedicated 100G).
11. **Plan upgrade path** — non-disruptive in-place where supported; flag disruptive (Basic→VpnGw* / Classic→HA VPN) as parallel-deploy + cutover.
12. **Plan downgrade** if current utilisation <50% + no growth.
13. **Plan monitoring thresholds** — alert at 70% (plan upgrade) and 80% (act).
14. **Cost-per-Mbps cross-check** for VPN — VpnGw4AZ/5AZ are cheapest per Mbps at scale; flag if customer sized down to VpnGw1-3 unnecessarily.
15. **Surface anti-patterns** — sizing on single-flow throughput, ignoring packet-size impact, ignoring per-tunnel cap, choosing Basic VPN for production, no upgrade plan, no monitoring thresholds.
16. **Emit** in the output format below.

---

## Output format

Every gateway-sizing answer should emit:

1. **Inputs assumed** — cloud + gateway, current peak (P95/P99), growth %, horizon, criticality, connection count, features, SLA.
2. **Required capacity calculation** — formula applied with numbers.
3. **SKU recommendation** citing the vault table — meets throughput + connections + features + SLA.
4. **Per-tunnel / aggregate / packet-size cross-checks** with explicit warning if workload hits a caveat.
5. **Cost** — monthly base + (for ER metered) data charges + cost-per-Mbps comparison.
6. **ER vs VPN break-even** if both applicable.
7. **Upgrade path** — non-disruptive or disruptive + plan if disruptive.
8. **Monitoring thresholds** — 70% (plan) and 80% (act) alerts.
9. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
10. **What this excludes** — ER architecture (`hyb/expressroute-design`), VPN crypto (`hyb/vpn-design`), firewall pricing (`price/firewall-pricing`), forecasting (`ncap/bandwidth-forecasting`).
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

For pricing-laden answers also add: `Pricing is indicative — verify against current vendor pricing pages before budgeting.`

---

## Common workflow mistakes (do not repeat these)

1. **Sizing on single-flow throughput.** Real workloads hash across multiple flows; single-flow is a worst-case microbenchmark.
2. **Ignoring packet-size impact on VPN throughput.** A "1.25 Gbps tunnel" delivers 400 Mbps for 200-byte packets.
3. **Ignoring per-tunnel cap.** AWS VPN ~1.25 Gbps per tunnel; need ECMP across multiple connections; Azure VPN aggregate is shared across all tunnels.
4. **Choosing Basic Azure VPN for production.** No BGP, no AZ, no upgrade path to VpnGw* (full redeploy required).
5. **Recommending Classic VPN in GCP.** HA VPN is the modern path (99.99% SLA); Classic is legacy.
6. **No upgrade path plan.** SKU chosen today is at 50% but maxes out next year; no plan = production fire.
7. **Sizing without monitoring thresholds.** First sign of capacity exhaustion is the outage.
8. **App Gateway v2 sized by max instances only.** Min instances drive baseline cost; pick max for autoscale + min for steady-state cost balance.
9. **Azure Firewall Premium without TLS-reduction headroom.** Premium with TLS inspection delivers ~60% of headline throughput.
10. **No SNAT-port sizing for Azure Firewall outbound-heavy workloads.** Each PIP = 2,496 ports per backend; verify max ports needed.
11. **Choosing ER metered when monthly transfer is high.** Break-even at ~4-6 TB depending on SKU; metered loses above.
12. **No multi-region / Global Reach awareness.** Single ER circuit is single-point-of-failure; plan dual ER + Global Reach for cross-region.

**Analysis only — verify against vendor documentation before applying.**

Pricing is indicative — verify against current vendor pricing pages before budgeting.
