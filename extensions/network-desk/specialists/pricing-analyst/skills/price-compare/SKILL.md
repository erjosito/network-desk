# Skill: Cross-Cloud Price Comparison (`price_skill_price_compare`)

Build apples-to-apples cost comparisons of equivalent networking services across Azure, AWS, and GCP — VPN, dedicated circuits, L4/L7 LB, firewall, DNS, Private Link, NAT, public IP. Drives scenario-based total-cost reasoning (Small / Medium / Large) and surfaces hidden costs the user wouldn't think to ask about.

**The hidden costs are usually 30–50% of the bill.** A comparison that ignores NAT processing, TGW data, inter-AZ traffic, or idle public IPs is misleading.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the normalisation logic (matching equivalent SKUs across clouds), the scenario framing (Small / Medium / Large), the discipline of always surfacing hidden costs, and the "decision guide" output. All numeric tables, per-service price columns, scenario totals, and pricing-page URLs live in the vault and **must be loaded with `cn_vault_page` before answering**.

Mandatory steps every time you use this skill:

1. Identify the user's services and workload scale (one-off comparison vs. a full Small/Medium/Large scenario).
2. Call `cn_vault_page({ page: "Cross-Cloud-Price-Comparison" })` for the canonical tables.
3. Load any per-service vault page for details the cross-cloud page summarises.
4. Cite the vault row when quoting any rate; never quote from memory.

If the user asks about a service not in the cross-cloud page, fall back to `cn_search({ query: "<service> pricing", specialist: "cn_price" })`, identify the right page, then load it.

---

## When to use price comparison

| Scenario | Behaviour |
|---|---|
| "How much does service X cost on Azure vs. AWS vs. GCP?" | Per-service comparison (one row from the table) |
| "We're choosing a cloud for project X — give me a total-cost view" | Scenario comparison (Small / Medium / Large workload) |
| "Why is our network bill 50% higher than budgeted?" | Hidden-costs walk (NAT, TGW, inter-AZ, idle IPs) |
| User asks about a single service in isolation | Redirect to the per-service skill: `cn_skill({ specialist: "cn_price", skill: "vpn-pricing" })` / `circuit-pricing` / `firewall-pricing` etc. |
| User asks about cost optimisation (not comparison) | Redirect: `cn_skill({ specialist: "cn_price", skill: "cost-optimizer" })` |
| User asks about a specific egress-heavy workload | Pair with `cn_skill({ specialist: "cn_price", skill: "egress-architecture" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical cross-cloud comparison — per-service tables, Small/Medium/Large scenarios, hidden costs, calculator URLs | [[Cross-Cloud-Price-Comparison]] | `cn_vault_page({ page: "Cross-Cloud-Price-Comparison" })` |
| Multi-cloud cost comparison (if the answer also needs egress-between-clouds) | [[Multi-Cloud-Cost-Comparison]] | `cn_vault_page({ page: "Multi-Cloud-Cost-Comparison" })` |
| VPN-specific detail | [[VPN-Gateway-Pricing]] | `cn_vault_page({ page: "VPN-Gateway-Pricing" })` |
| Dedicated-circuit detail | [[Dedicated-Circuit-Pricing]] | `cn_vault_page({ page: "Dedicated-Circuit-Pricing" })` |
| Firewall pricing detail | [[Firewall-Pricing]] | `cn_vault_page({ page: "Firewall-Pricing" })` |
| Load-balancer pricing detail | [[Load-Balancer-Pricing]] | `cn_vault_page({ page: "Load-Balancer-Pricing" })` |
| Egress-cost architecture | [[Egress-Cost-Architecture]] | `cn_vault_page({ page: "Egress-Cost-Architecture" })` |
| Network cost optimisation patterns | [[Network-Cost-Optimization]] | `cn_vault_page({ page: "Network-Cost-Optimization" })` |

The cross-cloud page (row #1) is mandatory. Per-service pages are loaded only when the question needs more depth than the summary tables provide.

---

## Required inputs — collect before answering

1. **Services in scope** — VPN, dedicated circuit, L4 LB, L7 LB, WAF, firewall, DNS, Private Link, NAT, public IP, CDN — which?
2. **Workload scale or scenario** — Small (single site, basic LB) / Medium (ER+VPN, App GW, firewall) / Large (multi-region, CDN). Or the user's own scenario.
3. **Monthly egress estimate** — TB/month. The single biggest swing factor.
4. **Region(s)** — affects egress per-GB and partner pricing.
5. **Redundancy** — multi-AZ / multi-region / single — flips line items on or off.
6. **Time horizon** — monthly snapshot, 1-year, 3-year — affects whether reserved/commitment discounts apply.

---

## Workflow

1. **Collect inputs**. If "scenario" is vague, default to the matching Small/Medium/Large from the vault page and call that out explicitly.
2. **Load the cross-cloud vault page**.
3. **Build the comparison table** — Cloud columns × Service rows, citing the vault row for each cell.
4. **Compute scenario totals** — sum the chosen rows, call out which cloud is cheapest at this scenario and why.
5. **Surface hidden costs explicitly** — pick the 3–5 most relevant from the vault's "Hidden Costs to Watch" table for the user's services (e.g. for AWS-heavy answer always include NAT processing + TGW data + inter-AZ).
6. **Recommend the cheapest option** — but qualify with the scenario it's cheapest for; "cheapest" depends on bandwidth, redundancy, and service mix.
7. **Provide calculator URLs** — from the vault page, so the user can validate.
8. **Emit** in the format below.

---

## Output format

Every price-compare answer should emit:

1. **Scenario / scope restatement** — one line, so the user can correct wrong assumptions.
2. **Per-service comparison table** — Cloud columns × Service rows, with the vault row cited per cell.
3. **Scenario totals** — bold per cloud.
4. **Cheapest at this scale** — one sentence + qualifier (e.g. "AWS at $1,294/mo, primarily because the VPN gateway is 7× cheaper than Azure's; at >5 TB/month egress the gap narrows").
5. **Hidden costs called out** — bullet list of 3–5 hidden-cost items relevant to the scenario.
6. **What this excludes** — explicit list (compute, storage, commitment discounts, EA/EDP, premium SLAs, partner MRC).
7. **Calculator URLs** — Azure + AWS + GCP, from the vault page.
8. **Footer** — `Pricing is indicative — verify against current vendor pricing pages before budgeting.` and `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's hidden-cost list.

1. **Comparing one service in isolation.** The bill is the whole network stack; an answer that says "Azure LB is free" without mentioning App Gateway minimum CU charge or NAT data processing is technically true and operationally wrong.
2. **Ignoring inter-AZ traffic (AWS).** $0.01/GB each direction × multi-AZ pattern can dwarf the LB and PE line items.
3. **Missing NAT data processing.** NAT GW processing ($0.045/GB on AWS, comparable on Azure, per-GiB on GCP Cloud NAT) is the most-forgotten hidden cost in egress-heavy scenarios.
4. **Comparing list prices for an EA / EDP customer.** Quote list, but note that enterprise discounts can be 15–40% — and recommend the user request a quote.
5. **Defaulting to "AWS is always cheapest".** Azure wins on L4 LB. GCP wins on DNS + egress with discounted tiers. AWS wins on VPN/DX. The vault page's "Quick Decision Guide" is the authoritative tiebreaker.
6. **Quoting the Local SKU egress saving (Azure) without noting region constraint.** Local SKU is free egress only for traffic that stays in the same metro as the peering location.
7. **Building a "Small" or "Medium" scenario from memory.** The vault page has canonical line-items per scenario; use them, don't reinvent them.

**Pricing is indicative — verify against current vendor pricing pages before budgeting.**
**Analysis only — verify against vendor documentation before applying.**
