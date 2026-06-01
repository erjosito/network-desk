# Skill: Cloud Network Service Mapping (`mcn_skill_service_mapping`)

Cross-cloud equivalency for networking services — Azure ↔ AWS ↔ GCP. Used to translate a design from one cloud to another, plan a migration, or assess interoperability in a multi-cloud architecture. Owns the "what is the equivalent of X?" workflow and the "what is fundamentally different (not just renamed)?" callouts. The detailed per-service comparison tables live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the workflow for translating designs across clouds, the discipline of distinguishing "renamed but equivalent" from "fundamentally different behaviour" (e.g. GCP global VPC vs. Azure / AWS regional; GCP distributed firewall vs. centralised Azure FW), and the cross-cloud-design anti-patterns. The detailed per-service comparison tables (VNet/VPC, NSG/SG, LB, ER/DX/Interconnect, Private Endpoint/PrivateLink/PSC, DNS, Firewall) live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Cloud-Network-Service-Mapping" })` for the canonical comparison tables across all 7 service families.
2. Load relevant service pages when a specific service is mentioned (e.g. `ExpressRoute`, `Direct-Connect`, `Cloud-Interconnect`).
3. Cite the vault page when stating a feature mapping or behavioural difference; never claim parity from memory.

If a service or scenario is not in the vault, fall back to `cn_search({ query: "<keywords>", specialist: "cn_mcn" })`.

---

## When to use service-mapping

| Scenario | Behaviour |
|---|---|
| "What's the equivalent of Azure X in AWS / GCP?" | Look up the relevant table in the vault page |
| "We're migrating from Azure to AWS — what changes for networking?" | Run the migration translation workflow |
| "Why doesn't my AWS deny rule work like an Azure NSG?" | Behavioural-difference callout (AWS SG is allow-only; use NACL or GCP-style deny) |
| "Can I peer cross-cloud?" | No — pivot to VPN / Megaport / Equinix / cross-cloud transit (redirect) |
| "Are these features really equivalent?" | Behavioural-difference workflow — surface gaps the user hasn't realised |
| Multi-cloud addressing plan | Redirect: `cn_skill({ specialist: "cn_mcn", skill: "addressing-plan" })` |
| Multi-cloud latency / region selection | Redirect: `cn_skill({ specialist: "cn_mcn", skill: "latency-optimization" })` |
| Cross-cloud connectivity (SD-WAN / Megaport / Equinix / cloud-to-cloud VPN) | Redirect: `cn_skill({ specialist: "cn_cnet", skill: "interconnect-design" })` |
| Cross-cloud egress / cost comparison | Redirect: `cn_skill({ specialist: "cn_price", skill: "price-compare" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical cross-cloud service mapping — VNet/VPC, NSG/SG, LB, dedicated circuits, Private Endpoint / PrivateLink / PSC, DNS, Firewall | [[Cloud-Network-Service-Mapping]] | `cn_vault_page({ page: "Cloud-Network-Service-Mapping" })` |
| ExpressRoute (Azure) | [[ExpressRoute]] | `cn_vault_page({ page: "ExpressRoute" })` |
| Direct Connect (AWS) | [[Direct-Connect]] | `cn_vault_page({ page: "Direct-Connect" })` |
| Cloud Interconnect (GCP) | [[Cloud-Interconnect]] | `cn_vault_page({ page: "Cloud-Interconnect" })` |
| Private Endpoint (Azure) | [[Private-Endpoint]] | `cn_vault_page({ page: "Private-Endpoint" })` |
| PrivateLink (AWS) | [[PrivateLink]] | `cn_vault_page({ page: "PrivateLink" })` |
| Private Service Connect (GCP) | [[Private-Service-Connect]] | `cn_vault_page({ page: "Private-Service-Connect" })` |
| Multi-cloud addressing (always paired for migration scenarios) | [[Multi-Cloud-Addressing-Plan]] | `cn_vault_page({ page: "Multi-Cloud-Addressing-Plan" })` |

Row #1 is mandatory. The rest are mandatory when the specific service / scenario is in scope.

---

## Required inputs — collect before answering

1. **Source cloud + destination cloud** — translation direction.
2. **Source service** — what is the user trying to map (VNet / NSG / LB / ER / PE / DNS / firewall / etc.).
3. **Use case** — "what's the equivalent name?" vs. "are they actually equivalent?" vs. "we're migrating, what breaks?".
4. **Production constraints** — overlapping CIDRs, existing peering, BGP, encryption requirements.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Cloud-Network-Service-Mapping`**.
3. **Locate the relevant comparison table** — there are 7 (VNet, NSG/SG, LB, dedicated circuits, Private Endpoint / PrivateLink / PSC, DNS, Firewall). Quote the row, not the whole table.
4. **Surface the "Key Differences" callout** for that table — these are where designs break. Examples to always flag:
   - GCP VPC is **global**; Azure/AWS are **regional**. Subnets follow the opposite (GCP regional, AWS zonal, Azure regional).
   - AWS SG has **no deny rules** (allow-only). Use NACL for deny. Azure NSG and GCP firewall have deny.
   - GCP firewall is **distributed** (rules enforced at VM); Azure/AWS firewalls are **centralised** (route traffic through).
   - GCP **truly-global L7 LB** (single anycast VIP); Azure/AWS need Front Door / CloudFront to approach this.
   - Azure ExpressRoute **Global Reach** (cross-region without back-hauling) — unique among the three.
5. **Translate the design** — map the source-cloud topology to the destination-cloud equivalents service-by-service.
6. **Identify gaps** — features that don't translate (e.g. AWS NACL stateless behaviour, GCP hierarchical FW, Azure private-DNS auto-registration).
7. **Recommend the next sibling skill** — addressing-plan (CIDR design), latency-optimization (region pairs), interconnect-design (cross-cloud connectivity).
8. **Emit** in the format below.

---

## Output format

Every service-mapping answer should emit:

1. **Inputs assumed** — one line each.
2. **Translation table** — source service → destination service, citing the vault row.
3. **Behavioural differences to plan around** — bulleted, each linked to the vault's "Key Differences" callout.
4. **Migration risks** — features that don't translate, common gotchas (deny rules, peering scope, DNS auto-registration, transitive routing).
5. **Next-step handoffs** — addressing / latency / interconnect / pricing.
6. **What this excludes** — actual IP plan, region pair selection, cross-cloud transport design.
7. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are cross-cloud-design anti-patterns specific to this skill — not a substitute for the vault page's "Key Differences" callouts.

1. **Treating "renamed" as "equivalent".** Azure Firewall ≠ GCP Cloud Firewall (centralised vs. distributed). NLB ≠ Azure Standard LB Global tier (regional vs. global). Always surface behavioural deltas.
2. **Forgetting AWS SG has no deny rules.** Engineers coming from Azure expect deny semantics; the answer must include the NACL workaround.
3. **Forgetting GCP VPC is global.** Designs that assume per-region VPCs will be wrong — GCP has one VPC with regional subnets across all regions.
4. **Forgetting peering is non-transitive in all three.** Even when a user asks "how do I peer A → B → C", the answer is never "peer A to B and B to C". Pivot to managed transit (vWAN / TGW / NCC).
5. **Quoting "cross-cloud peering" as if it existed.** It doesn't. Cross-cloud is VPN / Megaport / Equinix / cloud-to-cloud LB / public PaaS — never direct VPC peering.
6. **Conflating Azure ExpressRoute Global Reach with AWS / GCP equivalents.** There is no native equivalent on AWS or GCP — flag this as unique Azure capability.
7. **Quoting numeric limits from memory.** Subnet / peering / endpoint limits drift; always cite the vault page or push to the provider's current limits page.
8. **Skipping the DNS impact of a migration.** Auto-registration (Azure), Route 53 resolver endpoints (AWS), DNS forwarding zones (GCP) all behave differently. Always surface in a translation answer.
9. **Quoting Private Endpoint cross-region behaviour without checking the table.** Azure can reach PE over global VNet peering; GCP PSC has a "global access" flag; AWS interface endpoints are regional with opt-in cross-region for endpoint services. Specifics belong in the vault, not in the head.

**Analysis only — verify against vendor documentation before applying.**
