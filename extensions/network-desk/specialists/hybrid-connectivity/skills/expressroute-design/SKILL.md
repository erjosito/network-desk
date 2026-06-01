# Skill: ExpressRoute / Direct Connect / Cloud Interconnect Design (`hyb_expressroute-design`)

Design dedicated private connectivity between on-premises networks and the cloud — Azure ExpressRoute, AWS Direct Connect, GCP Cloud Interconnect. Owns the cross-cloud equivalence map, the input checklist (bandwidth, peering location, redundancy, SKU/peering selection), and the architectural workflow. The per-service CLI commands, SKU tables, peering subnets, and VIF / VLAN-attachment configuration live in the vault service pages.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the design workflow, the redundancy patterns, the BGP attribute / weight conventions that span all three clouds, the sizing methodology, and the "what's missing from a typical answer" discipline. The exact provisioning commands, SKU enumerations, peering subnet formats, FastPath constraints, hosted-connection speed lists, and MED-based routing rules live in the vault and **must be loaded with `cn_vault_page` before issuing per-cloud detail**.

Mandatory steps every time you use this skill:

1. Collect inputs (cloud(s), bandwidth, peering location, redundancy target, SKU/peering type preference, gateway sizing).
2. Call `cn_vault_page` for the relevant per-cloud service page(s) from the table below.
3. Cite the vault page when stating SKU rates, FastPath support, peering subnet sizes, or VIF/VLAN-attachment limits.

If the user asks about a peering or feature not in the table, fall back to `cn_search({ query: "<keywords>", specialist: "cn_hyb" })`, identify the right page, then load it.

---

## When to use ExpressRoute design

| Scenario | Behaviour |
|---|---|
| "Design an ExpressRoute / Direct Connect / Interconnect for our HQ" | Run full design workflow |
| "Which SKU / connection type / peering should we pick?" | SKU / peering selection (load per-cloud page) |
| "How do we make this redundant?" | Pair with `cn_skill({ specialist: "cn_hyb", skill: "failover-design" })` |
| "How do we route between VNets / VPCs after the circuit is up?" | Pair with `cn_skill({ specialist: "cn_hyb", skill: "routing-design" })` |
| BGP attribute design specifically | Pair with `cn_skill({ specialist: "cn_hyb", skill: "bgp-design" })` |
| "How much does it cost?" | Redirect: `cn_skill({ specialist: "cn_price", skill: "circuit-pricing" })` |
| User asks about VPN instead | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "vpn-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Azure ExpressRoute — circuit / SKU / peering / FastPath / Direct / provisioning | [[ExpressRoute]] | `cn_vault_page({ page: "ExpressRoute" })` |
| AWS Direct Connect — connection types / VIFs / LAGs / DXGW | [[Direct-Connect]] | `cn_vault_page({ page: "Direct-Connect" })` |
| GCP Cloud Interconnect — Dedicated / Partner / VLAN attachments / MED | [[Cloud-Interconnect]] | `cn_vault_page({ page: "Cloud-Interconnect" })` |
| BGP design (route filters, attributes, multi-circuit patterns) | [[BGP-Design]] | `cn_vault_page({ page: "BGP-Design" })` |
| Bandwidth planning (sizing methodology, 95th-percentile, headroom) | [[Hybrid-Bandwidth-Planning]] | `cn_vault_page({ page: "Hybrid-Bandwidth-Planning" })` |
| Failover patterns | [[Hybrid-Failover-Design]] | `cn_vault_page({ page: "Hybrid-Failover-Design" })` |
| Troubleshooting hooks (used when the answer needs verification steps) | [[Hybrid-Connectivity-Troubleshooting]] | `cn_vault_page({ page: "Hybrid-Connectivity-Troubleshooting" })` |

Call **only the row(s) relevant to the user's cloud(s)**. Always load the cloud-specific service page; load BGP-Design when answering anything about peering, route filters, or multi-circuit attribute design.

---

## Required inputs — collect before answering

1. **Cloud(s)** — Azure / AWS / GCP / multi (different cross-connects per cloud).
2. **Required throughput** — Mbps or Gbps; drives circuit / SKU choice and gateway sizing.
3. **Peering location preference / NSP** — meet-me facility; influences partner availability and latency.
4. **Redundancy** — single circuit / dual circuits (same provider, diverse PoPs) / dual circuits (diverse providers) / circuit + VPN backup.
5. **Geographic scope** — Standard vs. Premium (Azure ER); single-region vs. global (DXGW / GCP global routing).
6. **Peering type required** — Private peering only / Public/Microsoft peering / Transit (TGW attachment).
7. **Gateway sizing on cloud side** — ER Gateway tier (ErGw1Az / ErGw3Az / FastPath), Direct Connect Gateway + TGW, GCP Cloud Router.
8. **Encryption requirement** — MACsec on ExpressRoute Direct / IPsec over ExpressRoute / IPsec over Direct Connect.

---

## Workflow

1. **Collect inputs** above. If "what bandwidth?" is unknown, pair with `Hybrid-Bandwidth-Planning` to size it.
2. **Load the cloud-specific service page** (`ExpressRoute` / `Direct-Connect` / `Cloud-Interconnect`) and `BGP-Design`.
3. **Pick the connection model**:
   - Azure: Provider-provisioned vs. ExpressRoute Direct; Standard vs. Premium; Metered vs. Unlimited vs. Local.
   - AWS: Dedicated vs. Hosted connection; Private VIF vs. Public VIF vs. Transit VIF; via VGW vs. DXGW vs. DXGW+TGW.
   - GCP: Dedicated Interconnect vs. Partner Interconnect; per-attachment bandwidth; Cloud Router placement (regional vs. global routing mode).
4. **Pick the peering / VIF / VLAN attachment**:
   - Azure: Private peering subnets (two /30 or /126), VLAN ID, peer ASN.
   - AWS: VIF type, VLAN, peer ASN, addressing (`169.254.x.x/30`), DXGW associations.
   - GCP: VLAN attachment, Cloud Router BGP peer, MED expectations.
5. **Size the gateway** on the cloud side (ErGw1Az vs. ErGw3Az vs. FastPath; TGW attachment + DXGW; Cloud Router HA).
6. **Define BGP** — peer ASN, route advertisements, route filters, attribute strategy (load `BGP-Design` and cite its sections).
7. **Add redundancy** — load `Hybrid-Failover-Design` and apply the matching pattern (dual circuits / circuit + VPN backup / active-active gateways).
8. **Note out-of-band items** — partner / NSP cross-connect, colocation cabling, MRC, lead time (~2–6 weeks typical).
9. **Emit** in the format below.

---

## Output format

Every ExpressRoute / DX / Interconnect design answer should emit:

1. **Inputs assumed** — one line each.
2. **Architecture summary** — connection model + peering / VIF / VLAN attachment + cloud-side gateway + redundancy pattern.
3. **Per-cloud SKU + peering choice** — cite the vault page section.
4. **BGP plan** — peer ASN, prefixes to advertise/accept, route filters, attribute strategy. Cite `BGP-Design` sections.
5. **Redundancy** — primary/secondary, weight/LP values, expected convergence time (cite `Hybrid-Failover-Design` for the value).
6. **Provisioning commands** — point at the vault page section (e.g. "see [[Direct-Connect]] § Configuration Commands") rather than duplicating commands here.
7. **Out-of-band items** — partner / NSP / colocation / MRC / lead time, with a clear "ask your NSP" callout.
8. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's "Common pitfalls" section. Always also surface the loaded service page's pitfall list.

1. **Conflating "circuit up" with "connectivity working".** A provisioned circuit with no peering or no BGP session is the most common "why isn't it working" ticket. Always require BGP peering and route advertisement in the design.
2. **Skipping the gateway sizing.** ErGw1Az caps at 2 Gbps; ErGw3Az is required for higher throughput / FastPath. AWS DXGW is free but TGW attachment + data processing is not. GCP Cloud Router is regional vs. global — wrong mode breaks multi-region. Cite the vault page for the right SKU.
3. **Assuming FastPath supports everything.** FastPath has documented constraints around VNet peering, UDRs, and gateway SKU — load the vault page's FastPath subsection and cite the constraint matrix; do not assume it works without verification.
4. **Forgetting that ExpressRoute Standard is regional (geopolitical).** Cross-region requires Premium add-on (+50–100% port fee). Always check the user's VNets vs. the peering-location geo.
5. **Recommending a single circuit for production.** Even with SLAs, a single circuit + no VPN backup is an availability anti-pattern. Default to dual-circuit or circuit + VPN backup; if the user explicitly wants single, document the risk.
6. **Missing public-IP requirements for Microsoft Peering (Azure) or Public VIF (AWS).** Both require customer-owned (or provider-owned) RIR-registered public prefixes. Surface this early — it's a multi-week procurement item.
7. **Quoting hosted-connection / partner speeds from memory.** AWS hosted-connection speed list changes (partners now offer higher tiers in some regions). Always load `Direct-Connect` and cite the speed list.
8. **Ignoring NSP / cross-connect / colocation as out-of-band.** A cloud-side architecture diagram is half the story — the partner side has its own MRC, cross-connect fees, and lead time. Always include an "out-of-band items" section.

**Analysis only — verify against vendor documentation before applying.**
