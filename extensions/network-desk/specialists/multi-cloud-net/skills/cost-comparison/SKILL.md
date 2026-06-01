# Skill: Multi-Cloud Cost Comparison (`mcn_skill_cost_comparison`)

Compare networking costs across Azure, AWS, and GCP for multi-cloud architectures. Owns the *scenario-bucket methodology* (low / moderate / high volume break-even logic), the pricing-model glossary (ingress/cross-AZ/inter-region/internet egress/private circuit/transit/private endpoint), the "model both directions" discipline for chatty east-west systems, and the cross-cloud transfer-optimisation strategy catalogue. The detailed pricing-source tables, per-cloud meter rules, and committed-use discount mechanics live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *scenario-bucket framing* (<5 TB → VPN/public, 5–50 TB → break-even, 50+ TB → private/CDN/data-locality), the "model packet path + both directions" rule, the "blended-rate-not-list-price" guidance, and the boundary-cache + data-locality strategy. The pricing-source URLs, per-meter design implications, and committed-use mechanics live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Multi-Cloud-Cost-Comparison" })` for the canonical pricing-source table, pricing-model-guidance table, scenario buckets, and optimisation-strategy catalogue.
2. Cite the vault page when stating tier rules, free-tier rules, or per-meter design implications.
3. For pure egress redesign (single-cloud), redirect to `cn_skill({ specialist: "cn_price", skill: "egress-architecture" })`.

If a cloud pair / scenario isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_mcn" })`.

---

## When to use cost-comparison

| Scenario | Behaviour |
|---|---|
| "Which clouds should host which workloads from a cost view?" | Walk scenario buckets + optimisation strategies + pricing-model guidance |
| "Is multi-cloud cheaper than single-cloud for X?" | Compute cross-cloud egress (both sides) + transit fees, compare to single-cloud baseline |
| Break-even on private circuit vs VPN/internet for X-Y cloud pair | Compute fixed-port + metered-private vs internet egress + tunnel fees |
| Chatty east-west database/queue across clouds | Surface the "model both directions" mistake; recommend boundary cache or data locality |
| Transit-fee modelling (e.g., AWS TGW processing $/GB on top of egress) | Pull from pricing-model-guidance row |
| Detailed *transit topology design* (mesh / hub-spoke / colocation / SDN) | Redirect: `cn_skill({ specialist: "cn_mcn", skill: "transit-design" })` |
| Single-cloud egress redesign | Redirect: `cn_skill({ specialist: "cn_price", skill: "egress-architecture" })` |
| Single-cloud network cost trim | Redirect: `cn_skill({ specialist: "cn_price", skill: "cost-optimizer" })` |
| Side-by-side per-service price comparison (one service across clouds) | Redirect: `cn_skill({ specialist: "cn_price", skill: "cross-cloud-comparison" })` |
| Multi-cloud addressing plan | Redirect: `cn_skill({ specialist: "cn_mcn", skill: "addressing-plan" })` |
| Latency optimisation across clouds | Redirect: `cn_skill({ specialist: "cn_mcn", skill: "latency-optimization" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical multi-cloud cost comparison — pricing-source tables (Azure / AWS / GCP), pricing-model-guidance per meter, scenario buckets, cross-cloud optimisation strategies (CDN, compression, boundary cache, data locality, committed use, AWS inter-AZ minimisation) | [[Multi-Cloud-Cost-Comparison]] | `cn_vault_page({ page: "Multi-Cloud-Cost-Comparison" })` |
| Pure egress architectural patterns (companion) | [[Egress-Cost-Architecture]] | `cn_vault_page({ page: "Egress-Cost-Architecture" })` |
| Side-by-side per-service comparison (companion) | [[Cross-Cloud-Price-Comparison]] | `cn_vault_page({ page: "Cross-Cloud-Price-Comparison" })` |

Row #1 is mandatory.

---

## Required inputs — collect before answering

1. **Cloud pair(s)** — Azure-AWS / Azure-GCP / AWS-GCP / 3-way.
2. **Estimated monthly cross-cloud traffic GB** by direction.
3. **Traffic type** — bulk replication / chatty east-west (DB queries) / user-facing / event streams.
4. **Latency requirement** — synchronous (drives data-locality redesign) vs asynchronous (allows event-driven replication).
5. **Existing private connectivity** — already have ER/DX/Interconnect? colocation? Megaport?
6. **Commitment horizon** — willing to commit for committed-use discounts.
7. **Regional pair / continent pair** — drives inter-region rates.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Multi-Cloud-Cost-Comparison`**.
3. **Place workload in scenario bucket** — <5 TB / 5-50 TB / 50+ TB / chatty east-west.
4. **For chatty east-west specifically** — push hard on boundary cache and data locality before any transfer-cost optimisation; the cheapest cross-cloud byte is the one not sent.
5. **For each significant flow** — model both directions; many east-west fees apply to each direction independently.
6. **Compute the comparison**:
   - **Option A (VPN/internet)** = egress + tunnel fees + transit/processing fees.
   - **Option B (private circuit / colocation)** = fixed monthly port/circuit/gateway + metered private transfer + cross-connect fees.
   - **Option C (third-party transit fabric)** = controller/gateway runtime + per-GB processing + native egress (still applies).
   - **Option D (architectural redesign)** = engineering effort + ongoing operational cost − dropped cross-cloud bytes.
7. **Apply optimisation-strategy catalogue** — CDN offload, compression, boundary cache, data locality, committed use, AWS inter-AZ minimisation.
8. **Recompute at blended tier rate** for the user's volume, not list price.
9. **Compute break-even months** for any non-zero setup option.
10. **Surface anti-patterns** — single-direction modelling; ignoring transit processing fees; quoting list price; assuming ingress is always free without checking service-specific processing fees.
11. **Emit** in the output format below.

---

## Output format

Every multi-cloud cost-comparison answer should emit:

1. **Inputs assumed** — cloud pair, volume by direction, traffic type, latency requirement.
2. **Scenario bucket** — <5 TB / 5-50 TB / 50+ TB / chatty east-west — with rationale.
3. **Option matrix** — A (VPN) / B (private circuit) / C (third-party transit) / D (architecture redesign). Show fixed + metered + total at user's volume.
4. **Cross-cloud strategy applied** — CDN / compression / boundary cache / data locality (with order-of-magnitude impact).
5. **Recommended option** + rationale citing the scenario-bucket rule.
6. **Break-even months** for any non-zero-setup option.
7. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
8. **What this excludes** — topology design (`mcn/transit-design`), addressing plan (`mcn/addressing-plan`), latency tuning (`mcn/latency-optimization`).
9. **Footer** — `Pricing is indicative — verify against current vendor pricing pages before budgeting.` then `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Modelling only one direction** of an east-west flow. Many cross-AZ / inter-region / transit fees apply per direction; symmetric flows are charged twice.
2. **Quoting list price** instead of the blended-tier rate at the user's monthly volume. Egress is tiered; the per-GB at 100 TB is materially lower than at 1 TB.
3. **Ignoring transit processing fees.** AWS TGW data-processing $/GB stacks on top of inter-VPC and egress charges; Azure vWAN secured-hub adds $182.50/month + data processing; GCP NCC adds processing too.
4. **Assuming ingress is free** without checking service-specific processing fees on the receiving side (Private Endpoint, PrivateLink interface, LB processing).
5. **Recommending private circuit for < 5 TB/month.** Fixed port + gateway costs overwhelm the metered savings.
6. **Recommending VPN for 50+ TB/month** in production. Private connectivity break-even + reliability typically favours dedicated.
7. **Not modelling boundary cache / data locality** for chatty east-west. Cross-cloud DB reads from app tier in the other cloud are the most expensive design pattern there is.
8. **Comparing only Option A vs B**, ignoring D (architectural redesign). Sometimes moving the data eliminates the question.
9. **Skipping the cross-AZ check on AWS.** $0.01/GB per direction adds up to a serious bill for distributed systems.
10. **Forgetting committed-use discounts** when the customer is willing to commit. EA / MAP / EDP / committed-use can be 10-30% off list once threshold met.
11. **Recommending multi-region active-active for low-RPO availability** when async meets SLA at a fraction of the egress.
12. **Not staging a 30-day post-impl measurement window** — savings claims unverified.

**Pricing is indicative — verify against current vendor pricing pages before budgeting.**
**Analysis only — verify against vendor documentation before applying.**
