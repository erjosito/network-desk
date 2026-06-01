# Skill: Network Cost Optimization (`price_skill_cost_optimizer`)

Pragmatic checklist for reducing cloud networking spend across Azure, AWS, and GCP. Owns the prioritisation (which optimisations to attempt first, and which to ignore until the bill exceeds a threshold), the right-sizing methodology (utilisation observation → SKU step-down), and the "delete-the-orphan" hygiene loop. The CDN/compression/private-endpoint pattern catalogue, the per-cloud right-sizing CLI, the reserved-capacity discount tables, the NAT-gateway vs LB-SNAT decision table, and the orphan-resource CLI live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *order of attack* (egress before fixed cost; orphans before right-sizing; reserved capacity only after right-sizing), the quarterly-checklist cadence, the "is this cost line ≥ 5% of the bill?" gate, and the reversibility/break-even discipline. All per-cloud CLI, per-pattern savings tables, and the 12-line quarterly checklist live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Network-Cost-Optimization" })` for the canonical pattern catalogue, right-sizing CLI per cloud, reserved-capacity tables, orphan-resource CLI, and quarterly-checklist.
2. For egress-specific architectural redesigns, also call `cn_vault_page({ page: "Egress-Cost-Architecture" })` (or redirect to `cn_skill({ specialist: "cn_price", skill: "egress-architecture" })`).
3. Cite the vault page when quoting discount %s, SKU prices, or step-down savings.

If a vendor / scenario isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_price" })`.

---

## When to use cost-optimizer

| Scenario | Behaviour |
|---|---|
| "Our network bill is too high — where do we start?" | Apply ordered attack (egress first → orphans → right-size → reserved capacity → architecture) |
| Quarterly cost review | Walk the 12-point checklist from the vault |
| "Should we step down from VpnGw3AZ?" | Right-sizing methodology — pull `AverageBandwidth`, compare to next SKU down, decide |
| "We have orphan public IPs / idle gateways" | Hygiene loop from the vault's orphan-CLI |
| "Can we save with 1-yr or 3-yr reservation?" | Reserved-capacity discount tables; only AFTER right-sizing |
| Architectural redesign (hub-spoke vs flat, NAT-GW vs LB-SNAT) | Load Network-Cost-Optimization §4 |
| Pure egress redesign (replace internet egress with private paths, CDN, R2/B2) | Redirect: `cn_skill({ specialist: "cn_price", skill: "egress-architecture" })` |
| Calculating *current* egress cost from a topology | Redirect: `cn_skill({ specialist: "cn_price", skill: "egress-calc" })` |
| Firewall pricing comparison | Redirect: `cn_skill({ specialist: "cn_price", skill: "firewall-pricing" })` |
| ER / DX / Interconnect price comparison | Redirect: `cn_skill({ specialist: "cn_price", skill: "circuit-pricing" })` |
| VPN gateway pricing breakdown | Redirect: `cn_skill({ specialist: "cn_price", skill: "vpn-gw-pricing" })` |
| Load balancer pricing breakdown | Redirect: `cn_skill({ specialist: "cn_price", skill: "lb-pricing" })` |
| Compare a service price across clouds | Redirect: `cn_skill({ specialist: "cn_price", skill: "cross-cloud-comparison" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical optimisation playbook — CDN/compression/private-endpoint patterns, right-sizing CLI per cloud, reserved-capacity tables, NAT-GW vs LB-SNAT, hub-spoke vs flat cost comparison, orphan-resource CLI, quarterly checklist, cost-monitoring setup | [[Network-Cost-Optimization]] | `cn_vault_page({ page: "Network-Cost-Optimization" })` |
| Egress-specific architectural patterns (optional, load if egress dominates) | [[Egress-Cost-Architecture]] | `cn_vault_page({ page: "Egress-Cost-Architecture" })` |

Row #1 is mandatory.

---

## Required inputs — collect before answering

1. **Current bill** — top 5 networking line items + total (so you optimise the 80%, not the 20%).
2. **Cloud(s)** in scope.
3. **Resources in scope** — VPN GW SKU, ER circuit speed, firewall SKU, NAT GW present?, CDN present?, public IPs count.
4. **Utilisation data** — avg bandwidth on gateways, cache-hit ratio on CDNs, data processed on firewalls.
5. **Commitment horizon** — willing to commit 1 yr / 3 yr for reserved discounts?
6. **Operational maturity** — can engineering team redeploy gateways without downtime? (drives right-sizing willingness)
7. **Reversibility tolerance** — can the change be rolled back in <1 day if traffic shifts?

---

## Workflow

1. **Collect inputs** above. **Refuse** to suggest optimisations if no current bill data is available — guesses will mis-prioritise.
2. **Load `Network-Cost-Optimization`**.
3. **Rank line items by $ contribution** — only optimise lines ≥ 5% of bill (Pareto). Cite #6 from common-mistakes: don't golf the small numbers.
4. **Apply the ordered attack**:
   - **(a) Hygiene** — orphan public IPs, idle gateways, unused circuits, empty LBs. Run the orphan CLI from §5; delete with no architecture change.
   - **(b) Right-size** — for each gateway / LB / firewall / circuit, pull utilisation; if avg < 30% of SKU capacity, plan a step-down.
   - **(c) Egress reduction** — CDN, compression, private endpoints, intra-region pinning (§1 of vault). Hand-off egress-only redesigns to `egress-architecture`.
   - **(d) Architecture patterns** — NAT-GW vs LB-SNAT (§4), hub-spoke firewall traffic patterns, private-endpoint data-processing cost.
   - **(e) Reserved capacity** — ONLY after right-sizing; reserving an oversized SKU locks in waste.
5. **For each proposed change** — quantify before/after monthly cost + break-even time + reversibility plan.
6. **Sanity-check anti-patterns** — "are we reserving capacity we just right-sized away?", "does the new SKU support our required features?", "are we breaking an HA design?".
7. **Schedule a 30-day post-implementation measurement window** to validate the saving.
8. **Emit** in the output format below.

---

## Output format

Every cost-optimisation answer should emit:

1. **Inputs assumed** — top 5 line items + total.
2. **Optimisation order** — letter-step plan (a → e) showing where you'll start and why (Pareto on line items).
3. **Per-recommendation block** for each proposed change:
   - Current state (resource + utilisation).
   - Proposed change (SKU step / pattern adoption / deletion).
   - Estimated monthly saving (with source: vault table).
   - Implementation effort + reversibility note.
   - Break-even time if non-zero setup cost.
4. **Anti-pattern check** — confirm none of the 12 workflow mistakes below apply.
5. **Total projected saving** — additive across all recommendations.
6. **Measurement plan** — 30-day post-impl window.
7. **What this excludes** — anything < 5% of bill; rebuild-only options.
8. **Footer** — `Pricing is indicative — verify against current vendor pricing pages before budgeting.` then `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Optimising before you have a bill.** Guesses about line items mis-rank the Pareto. Refuse to act until the user produces top-5 line items.
2. **Reserving capacity before right-sizing.** Locks in waste for 1-3 years. Always step down to the right SKU *first*, then reserve.
3. **Recommending CDN without a cache-control strategy.** 10% hit rate is rounding-error savings. Pair every CDN suggestion with a cache-policy + ETag plan.
4. **Right-sizing a VPN gateway to where avg ≈ SKU capacity.** Burst traffic will throttle. Aim for avg ≤ 40-50% of SKU capacity.
5. **Stepping down without checking the new SKU's feature set.** E.g., dropping from VpnGw3AZ to VpnGw1 loses zone redundancy.
6. **Optimising < 5%-of-bill line items.** Every hour spent on a $20/month saving is an hour not spent on a $2000/month one.
7. **Skipping orphan hygiene because "it's only $3.60/IP".** Often there are dozens; cumulative is real. Always do hygiene before architecture.
8. **NAT-GW recommendations without considering Gateway/Interface endpoints for AWS service traffic.** NAT to S3 is a billing leak.
9. **Recommending direct spoke-to-spoke peering "to save firewall data-processing"** without confirming the traffic doesn't require inspection by security policy.
10. **Ignoring the data-processing cost on private endpoints.** They're cheap vs internet egress but they're not free.
11. **No reversibility plan.** Cost optimisations are bets on future traffic shape. If usage shifts, you need to know how to roll back.
12. **Skipping the 30-day measurement window.** Most "saving" claims are within billing noise unless verified.

**Pricing is indicative — verify against current vendor pricing pages before budgeting.**
**Analysis only — verify against vendor documentation before applying.**
