# Skill: VNet / VPC Peering Advisor (`vnet_skill_peering_advisor`)

Cross-cloud peering design — Azure VNet Peering, AWS VPC Peering, GCP VPC Network Peering. Owns the configure-correctly workflow, the per-cloud caveats (Azure gateway transit, AWS non-transitivity, GCP custom-route import/export), and the "Peering vs VPN vs Private Link / PSC" decision. The exact CLI commands, limit tables, and pitfall fixes live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the cross-cloud peering decision (peering vs. VPN vs. PrivateLink/PSC), the per-cloud gotchas (Azure `allow-forwarded-traffic` + `use-remote-gateways`, AWS non-transitivity, GCP `--export-custom-routes`/`--import-custom-routes`), the overlapping-CIDR workaround sequence, and the scale-out gate (when to abandon peering for managed transit — vWAN / TGW / NCC). The exact CLI commands and current limit tables live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "VNet-VPC-Peering" })` for canonical CLI per cloud, settings tables, current peering limits, and the decision guide.
2. Cite the vault page when stating peering limits, CLI flag semantics, or current pricing references.

If the user asks about managed-transit alternatives at scale (vWAN, TGW, NCC), redirect to the relevant sibling specialist.

---

## When to use peering-advisor

| Scenario | Behaviour |
|---|---|
| "How do I peer two VNets / VPCs?" | Run the per-cloud configure workflow |
| "Spoke-to-spoke traffic via hub isn't working" | Non-transitivity gotcha — apply UDR / TGW / NCC fix |
| "Should I use peering, VPN, or Private Link?" | Decision guide (vault page §Decision Guide) |
| "We have CIDR overlap" — can we still peer? | NAT / re-IP / Private Link workaround sequence |
| "We're hitting peering limits" | Pivot to managed transit (redirect) |
| Azure gateway transit (spoke → hub VPN/ER) | Gateway-transit checklist (4 items on the vault page) |
| Hub-and-spoke design / global landing zone | Redirect: `cn_skill({ specialist: "cn_vnet", skill: "address-planner" })` (CIDR plan) + this skill (peering setup) |
| Managed Azure transit at scale | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "vwan-design" })` |
| Managed AWS transit at scale | Redirect: `cn_skill({ specialist: "cn_cnet", skill: "tgw-design" })` |
| Managed GCP transit at scale | Redirect: `cn_skill({ specialist: "cn_cnet", skill: "ncc-design" })` |
| Private Link / PrivateLink / PSC as peering alternative | Redirect: `cn_skill({ specialist: "cn_pl", skill: "service-exposure" })` |
| Address-space / CIDR planning | Redirect: `cn_skill({ specialist: "cn_vnet", skill: "address-planner" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical peering — per-cloud CLI, settings tables, common pitfalls, decision guide | [[VNet-VPC-Peering]] | `cn_vault_page({ page: "VNet-VPC-Peering" })` |
| Hub-and-spoke pattern (peering is the implementation; pattern explains *why*) | [[Hub-and-Spoke]] | `cn_vault_page({ page: "Hub-and-Spoke" })` |
| Transit hub (when peering hits scale limits) | [[Transit-Hub]] | `cn_vault_page({ page: "Transit-Hub" })` |
| Cross-cloud service mapping (when user is translating across clouds) | [[Cloud-Network-Service-Mapping]] | `cn_vault_page({ page: "Cloud-Network-Service-Mapping" })` |

Row #1 is mandatory.

---

## Required inputs — collect before answering

1. **Cloud(s)** — Azure / AWS / GCP / mixed.
2. **CIDRs** — both VNets/VPCs; confirm no overlap.
3. **Topology** — hub-and-spoke / mesh / single-pair.
4. **Direction** — bidirectional (the default) or unidirectional access.
5. **Gateway transit required?** (Azure) — does the spoke need to reach on-prem via the hub gateway?
6. **Custom routes to exchange?** (GCP) — BGP/static routes from Cloud Router that must propagate to the peer.
7. **Scale** — number of VNets/VPCs in the topology now and in 12 months.
8. **Encryption requirement** — peering uses platform backbone (not user-encrypted); if user needs IPsec, route to VPN.

---

## Workflow

1. **Collect inputs** above. Especially confirm CIDR non-overlap before anything else.
2. **Load `VNet-VPC-Peering`**.
3. **Confirm peering is the right tool** using the vault's decision guide:
   - Need full network-to-network connectivity? → peering.
   - Encrypted tunnel needed? → VPN.
   - Single service access only / CIDR overlap acceptable? → Private Link / PrivateLink / PSC.
   - 50+ networks? → managed transit (vWAN / TGW / NCC) — redirect.
4. **Configure both sides** — peering is two resources in Azure and GCP (per-side); AWS uses a single connection + accept. Cite the vault page CLI.
5. **Apply per-cloud gotchas**:
   - **Azure** — set `allow-forwarded-traffic = true` on both sides if an NVA is in the path; set `allow-gateway-transit = true` on hub and `use-remote-gateways = true` on spoke for shared VPN/ER gateway.
   - **AWS** — peering is non-transitive: if you need hub-and-spoke transit, abandon peering and use TGW.
   - **GCP** — subnet routes are automatic, but custom/BGP routes need `--export-custom-routes` + `--import-custom-routes` on both sides.
6. **Plan UDRs / route tables** for non-transitive topologies — spoke-to-spoke via hub requires explicit UDR on each spoke pointing to the hub NVA.
7. **Check current limits** (vault page table) — Azure 500/VNet (hard), AWS 125/VPC (up to 500), GCP 25/VPC (quota-extensible). If close to the limit → pivot to managed transit.
8. **Address CIDR overlap** with NAT / re-IP / Private Link substitution.
9. **Emit** in the format below.

---

## Output format

Every peering-advisor answer should emit:

1. **Inputs assumed** — one line each.
2. **Decision** — peering vs. VPN vs. Private Link, with one-line rationale (cite vault page).
3. **Configuration plan** — per-side CLI commands (pointer to vault page rather than duplicating), with the per-cloud gotchas explicitly called out.
4. **Routing plan** — UDRs / route tables for non-transitive scenarios, gateway-transit flags for Azure.
5. **Scale check** — current count vs. limit; flag if pivot to managed transit is needed.
6. **CIDR check** — confirmation no overlap, or explicit workaround sequence (NAT / re-IP / PL).
7. **What this excludes** — managed-transit setup (vWAN / TGW / NCC), VPN tunnel configuration, Private Link service exposure detail.
8. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's "Common Pitfalls" section.

1. **Recommending peering without checking CIDR overlap.** Peering will silently fail or produce ineffective routes. CIDR check is step zero, not step three.
2. **Promising transit through a peering.** None of the three clouds support transitive peering. If the user asks "A → B → C", the answer is UDR-to-NVA or managed transit, never "just peer them all".
3. **Forgetting `allow-forwarded-traffic` on Azure NVA topologies.** Without this flag, packets forwarded by an NVA across the peering are dropped.
4. **Forgetting `use-remote-gateways` / `allow-gateway-transit` for Azure spoke → on-prem.** Both flags must be set (one per side); spoke cannot also have its own gateway.
5. **Assuming GCP custom routes propagate by default.** Subnet routes do; BGP-learned routes do not. Always set `--export-custom-routes` + `--import-custom-routes` when Cloud Router is involved.
6. **Recommending peering at 50+ networks.** Pivot to managed transit (vWAN / TGW / NCC) — peering scales poorly to large meshes (limits + operational burden).
7. **Confusing peering with VPN for encryption.** Peering uses the platform backbone (Microsoft / AWS / Google) — encrypted in transit by the provider, but not user-controlled IPsec. If the user requires explicit IPsec, use VPN.
8. **Treating Private Link / PSC as "peering lite".** PL/PSC is service-level, not network-level — different mental model, different DNS story, different pricing. Don't propose it as a drop-in for peering without surfacing the service-vs-network distinction.
9. **Hand-rolling cross-cloud peering.** Cross-cloud peering does not exist (Azure↔AWS↔GCP). Pivot to VPN / Megaport / Equinix / cloud-to-cloud transit.

**Analysis only — verify against vendor documentation before applying.**
