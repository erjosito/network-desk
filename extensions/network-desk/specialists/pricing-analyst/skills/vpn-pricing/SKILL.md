# Skill: VPN Gateway Pricing (`price_skill_vpn_pricing`)

Price out Azure VPN Gateway, AWS Site-to-Site VPN, and GCP Cloud VPN. Owns the input checklist, the SKU-to-throughput mapping, the cross-cloud comparison framing, the P2S (client VPN) variant, and the break-even logic vs. dedicated circuits.

**Azure VPN Gateway is ~7× more expensive than AWS Site-to-Site VPN.** A surprised user is almost always going to need that fact + the break-even table to justify the choice (or to push back).

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the input gathering, the SKU-selection logic (which SKU does the user actually need given their throughput / tunnel count / SLA), the P2S vs. S2S split, the break-even framing, and the "what the bill doesn't include" discipline. The exact $/hr SKU rates, tunnel limits, egress rates, and accelerated-VPN add-ons live in the vault.

Mandatory steps every time you use this skill:

1. Collect required inputs (cloud(s), throughput, tunnel count, P2S vs. S2S, AZ-redundant, region, monthly egress).
2. Call `cn_vault_page({ page: "VPN-Gateway-Pricing" })` for the canonical table.
3. Cite specific table rows; do not paraphrase SKU rates from memory.

If the user asks about a VPN topology not in the vault page (e.g. specific carrier-grade SD-WAN VPN, encrypted ExpressRoute), fall back to `cn_search({ query: "<keywords>", specialist: "cn_price" })` or pair with `cn_skill({ specialist: "cn_hyb", skill: "vpn-design" })`.

---

## When to use VPN pricing

| Scenario | Behaviour |
|---|---|
| "How much does a VPN cost on Azure / AWS / GCP?" | Run the SKU-selection workflow |
| "Which VPN SKU do I need for X tunnels at Y Mbps?" | SKU selection (pick the cheapest SKU that meets throughput + tunnel + SLA requirements) |
| "Is VPN cheaper than ExpressRoute / Direct Connect / Interconnect?" | Pair with `cn_skill({ specialist: "cn_price", skill: "circuit-pricing" })` and run break-even |
| "What does P2S / Client VPN cost per user?" | P2S sub-workflow (different pricing model on every cloud) |
| User asks about VPN **design** (not price) | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "vpn-design" })` |
| User asks about cross-cloud pricing comparison | Redirect: `cn_skill({ specialist: "cn_price", skill: "price-compare" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical VPN pricing — SKU table, tunnel limits, P2S, accelerated VPN, break-even rule of thumb | [[VPN-Gateway-Pricing]] | `cn_vault_page({ page: "VPN-Gateway-Pricing" })` |
| Dedicated-circuit pricing — needed for any break-even | [[Dedicated-Circuit-Pricing]] | `cn_vault_page({ page: "Dedicated-Circuit-Pricing" })` |
| Egress-cost architecture (egress dominates VPN bills) | [[Egress-Cost-Architecture]] | `cn_vault_page({ page: "Egress-Cost-Architecture" })` |
| VPN design context — Azure SKU semantics (Basic / VpnGw1 / *AZ tier) | [[VPN-Gateway]] | `cn_vault_page({ page: "VPN-Gateway" })` |
| AWS S2S VPN design context | [[Site-to-Site-VPN]] | `cn_vault_page({ page: "Site-to-Site-VPN" })` |
| Cross-cloud comparison summary | [[Cross-Cloud-Price-Comparison]] | `cn_vault_page({ page: "Cross-Cloud-Price-Comparison" })` |

Row #1 is mandatory. Row #2 is mandatory whenever the user mentions "vs. ExpressRoute / DX / Interconnect" or has > 1 TB/month egress.

---

## Required inputs — collect before quoting

1. **Cloud(s)** — Azure / AWS / GCP / multi.
2. **Throughput required** — drives SKU selection (e.g. Azure: 650 Mbps → VpnGw1AZ; 1.25 Gbps → VpnGw3AZ).
3. **Tunnel count** — Azure SKUs include 10 / 30 / 100 tunnels; AWS is per-connection (each connection = 2 tunnels); GCP HA VPN is 2 tunnels minimum.
4. **AZ-redundant?** — Azure has *AZ tiered SKUs at ~1.5× the price; AWS is AZ-redundant by default (2 tunnels in different AZs); GCP HA VPN requires 2 tunnels minimum.
5. **P2S / Client VPN?** — different pricing model; ask whether this is S2S, P2S, or both.
6. **Monthly egress estimate** — TB/month. Drives the break-even and dominates the bill at scale.
7. **Region** — affects egress per-GB.
8. **Term** — monthly / 1-year / 3-year (rarely affects VPN pricing — VPN gateways are hourly).

---

## Workflow

1. **Collect inputs** above.
2. **Load `VPN-Gateway-Pricing`** vault page.
3. **Pick the SKU** — for Azure, the cheapest SKU that meets throughput + tunnel + AZ requirements; for AWS, count connections (S2S) or endpoint-subnet-hours (Client VPN); for GCP, count HA VPN tunnels (minimum 2).
4. **Quote the line items** — gateway $/month, egress $/month (using the user's TB/month estimate), P2S per-connection if applicable, accelerated-VPN add-on if applicable. Cite the vault row per line.
5. **Run break-even** if egress > 200 GB/month or throughput > 200 Mbps — load `Dedicated-Circuit-Pricing` and compute crossover.
6. **Note SKU-change costs** — Azure VPN gateway SKU change requires re-provisioning the gateway and incurs ~30–60 min downtime; call this out if recommending an upsize.
7. **Emit** in the format below.

---

## Output format

Every VPN-pricing answer should emit:

1. **Inputs assumed** — one line each.
2. **Recommended SKU** — name + reason (throughput / tunnel / SLA).
3. **Monthly cost breakdown** — line-by-line (gateway + egress + P2S + add-ons), citing vault rows.
4. **Monthly total** — bold.
5. **Break-even vs. dedicated circuit** — if egress > 200 GB/month or bandwidth > 200 Mbps. State the volume at which a dedicated circuit becomes cheaper.
6. **What this excludes** — compute (VM hosting customer gateway on-prem), partner-side circuit, hardware refresh, change-window downtime if upsizing.
7. **Validation link** — calculator URL from the vault page.
8. **Footer** — `Pricing is indicative — verify against current vendor pricing pages before budgeting.` and `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's pitfall list.

1. **Quoting Azure VPN price = AWS VPN price.** Azure VpnGw1AZ is ~$263/month; AWS S2S VPN is ~$36.50/month. The gap is real and the user will be surprised — say so up front.
2. **Forgetting AWS S2S = 2 tunnels per connection.** Each AWS connection includes redundancy. Don't double-count tunnels in cost.
3. **Forgetting GCP HA VPN = 2 tunnels minimum.** $109.50/month minimum (2 × $54.75), not $54.75.
4. **Skipping the egress line.** Azure: $0.087/GB after 5 GB free × 100 GB = $8.27/month — small but compounding; 1 TB = $87. Always add it.
5. **Quoting Azure Basic SKU as the default.** It's a non-AZ, low-throughput, low-tunnel SKU usable for dev/test only. Don't recommend without checking the user knows the constraints.
6. **Pricing S2S when the user actually needs P2S (or vice versa).** Different SKUs, different pricing models, different limits. Clarify before quoting.
7. **Forgetting the SKU-change downtime.** If the answer recommends VpnGw1 → VpnGw3 upsize, call out the re-provisioning downtime (~30–60 min) so the user can plan a change window.
8. **Ignoring TGW VPN attachment on AWS.** If the VPN terminates on a Transit Gateway, the TGW attachment ($0.05/hr ~$36.50/month) + TGW data ($0.02/GB) are real line items.

**Pricing is indicative — verify against current vendor pricing pages before budgeting.**
**Analysis only — verify against vendor documentation before applying.**
