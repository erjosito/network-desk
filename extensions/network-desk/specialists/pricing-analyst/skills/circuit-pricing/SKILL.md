# Skill: Dedicated Circuit Pricing (`price_skill_circuit_pricing`)

Price out Azure ExpressRoute, AWS Direct Connect, and GCP Cloud Interconnect. Owns the workflow for collecting the right inputs (region, bandwidth, redundancy, data plan), running the break-even vs. VPN, and producing a 3-year TCO. The exact $/month port fees, data-plan rates, partner pricing, and add-on charges live in the vault.

**Pricing tables drift quarterly.** Never quote numbers from memory — always load the vault page.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the input-gathering checklist, the TCO methodology, the break-even framing, and the "always say what the price excludes" discipline. The numeric tables, SKU lists, partner-pricing tiers, and per-region egress rates live in the vault and **must be loaded with `cn_vault_page` before quoting any figure**.

Mandatory steps every time you use this skill:

1. Collect required inputs (cloud(s), region, bandwidth, data plan, redundancy, peering location, partner vs. direct).
2. Call `cn_vault_page({ page: "Dedicated-Circuit-Pricing" })` for the canonical table.
3. Cite specific table rows; do not paraphrase rates from memory.
4. Surface the calculator URL (in the loaded vault page) so the user can validate.

If the user asks about a circuit type not in the vault page, fall back to `cn_search({ query: "<keywords>", specialist: "cn_price" })`, identify the right page, then load it.

---

## When to use circuit pricing

| Scenario | Behaviour |
|---|---|
| "What does a 1 Gbps ExpressRoute / Direct Connect / Interconnect cost?" | Run circuit-pricing workflow |
| "VPN or ExpressRoute / Direct Connect?" | Run break-even (need monthly egress estimate + bandwidth requirement) |
| "Cost of going from 1 Gbps to 10 Gbps?" | Run delta + check if speed upgrade requires SKU change (e.g. ExpressRoute Direct) |
| "Total 3-year cost of a redundant dedicated circuit deployment" | Run full TCO template |
| User asks about VPN-only pricing | Redirect: `cn_skill({ specialist: "cn_price", skill: "vpn-pricing" })` |
| User asks for cross-cloud price comparison | Redirect: `cn_skill({ specialist: "cn_price", skill: "price-compare" })` |
| User asks how the circuit is **designed** (not priced) | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "expressroute-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical port fees, data plans, add-ons, break-even tables (Azure/AWS/GCP) | [[Dedicated-Circuit-Pricing]] | `cn_vault_page({ page: "Dedicated-Circuit-Pricing" })` |
| VPN pricing — needed for any break-even analysis | [[VPN-Gateway-Pricing]] | `cn_vault_page({ page: "VPN-Gateway-Pricing" })` |
| Egress cost architecture (the "other" big number on a dedicated circuit bill) | [[Egress-Cost-Architecture]] | `cn_vault_page({ page: "Egress-Cost-Architecture" })` |
| Cross-cloud price comparison (if the question is multi-cloud) | [[Cross-Cloud-Price-Comparison]] | `cn_vault_page({ page: "Cross-Cloud-Price-Comparison" })` |
| ExpressRoute design context (gateway SKUs influence cost) | [[ExpressRoute]] | `cn_vault_page({ page: "ExpressRoute" })` |
| Direct Connect design context | [[Direct-Connect]] | `cn_vault_page({ page: "Direct-Connect" })` |
| Cloud Interconnect design context | [[Cloud-Interconnect]] | `cn_vault_page({ page: "Cloud-Interconnect" })` |

Call only the row(s) relevant. Rows #1 and #2 are mandatory for break-even questions.

---

## Required inputs — collect before quoting

If any of these are missing, ask before answering:

1. **Cloud(s)** — Azure / AWS / GCP / multi.
2. **Bandwidth** — Mbps or Gbps; if the user says "fast", push back for a number.
3. **Estimated monthly egress** (TB/month) — drives the metered-vs-unlimited decision and the break-even.
4. **Region / peering location** — affects partner availability and egress per-GB rate.
5. **Redundancy** — single circuit, dual circuit (different edge locations), single + VPN backup.
6. **Direct vs. partner** — ExpressRoute Direct (10/100 Gbps), AWS Dedicated vs. Hosted (50 Mbps – 100 Gbps), GCP Dedicated vs. Partner Interconnect.
7. **Gateway SKU on cloud side** — ExpressRoute Gateway tier (ErGw1Az / ErGw3Az / FastPath), Direct Connect Gateway + Transit Gateway attachment, GCP Cloud Router. These add real money and are commonly forgotten.
8. **Term** — monthly / 1-year / 3-year (for TCO).
9. **Currency / region of billing** — almost always USD unless the user is in Europe.

---

## Workflow

1. **Collect inputs** above. Ask for anything missing.
2. **Load the vault pricing page(s)** from the table above.
3. **Quote the line items** for the user's cloud(s), citing the vault page section:
   - Port / circuit fee (per month)
   - Data plan / per-GB egress (or unlimited surcharge)
   - Gateway / TGW attachment / Cloud Router
   - Add-ons (Global Reach, Premium add-on, FastPath, etc.)
   - Partner cross-connect / colocation MRC (call out as "outside cloud bill, ask your partner")
4. **Compute the monthly total** showing the line-by-line breakdown.
5. **Run break-even vs. VPN** if relevant — load `VPN-Gateway-Pricing` and compare at the user's expected egress volume.
6. **3-year TCO** using the template in the vault page if the user is doing budget planning.
7. **Call out what the answer excludes** — colocation, ISP backhaul, cross-connect, redundancy second circuit, NSP MRC, egress beyond the estimate.
8. **Emit the answer** in the format below.

---

## Output format

Every circuit-pricing answer should emit:

1. **Inputs assumed** — list, one line each, so the user can spot wrong assumptions.
2. **Monthly cost breakdown** — line-by-line, each row citing the vault page section it came from.
3. **Monthly total** — bold.
4. **3-year TCO** — if requested or the question is clearly budget-driven.
5. **Break-even vs. VPN** — if the user hasn't explicitly chosen one, or if the answer is borderline.
6. **What this excludes** — explicit list (always include).
7. **Validation link** — the calculator URL from the vault page.
8. **Footer** — `Pricing is indicative — verify against current vendor pricing pages before budgeting.` followed by `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's pitfall list.

1. **Quoting figures from memory.** Pricing tables drift; always load the vault page and cite the row. If memory and vault disagree, vault wins.
2. **Forgetting the gateway / TGW attachment / Cloud Router.** On a 1 Gbps Direct Connect, the TGW attachment alone is ~$36/month + $0.02/GB — often the same order of magnitude as the port fee.
3. **Pricing the circuit without the egress.** A 1 Gbps line at $1,100/month plus 5 TB egress at $0.025/GB is $1,225/month — egress is not optional in the answer.
4. **Skipping the partner cross-connect / NSP MRC.** Cloud bills do not include the carrier circuit. Always add a line saying "partner / NSP fees apply outside the cloud bill; ask your NSP".
5. **Defaulting to "dual circuit" without checking.** Many designs are single-circuit + VPN backup, not 2× the port fee. Ask redundancy explicitly.
6. **Comparing Azure ExpressRoute Local SKU to AWS Direct Connect without noting region constraint.** Local SKU is free egress only within the same region as the peering location; that's not how Direct Connect / Interconnect work.
7. **Not running the break-even.** "ExpressRoute / DX / Interconnect costs $X" is half the answer — if the user has < 2 TB/month at < 200 Mbps, VPN is almost always cheaper; say so.

**Pricing is indicative — verify against current vendor pricing pages before budgeting.**
**Analysis only — verify against vendor documentation before applying.**
