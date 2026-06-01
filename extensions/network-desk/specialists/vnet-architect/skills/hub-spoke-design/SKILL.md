# Skill: Hub-Spoke Topology Design (`vnet_skill_hub_spoke_design`)

Design hub-spoke topologies across Azure (VNet peering), AWS (Transit Gateway), and GCP (Shared VPC or VPC Peering). Owns the topology decision (hub-spoke / mesh / managed transit / isolated), the shared-services-belong-in-the-hub rule, the spoke-to-spoke pattern selection, and the transit-routing pitfalls (Azure / AWS / GCP peering is non-transitive). The exact CLI for VNet peering / TGW attachments / Shared VPC, the per-cloud shared-services subnet sizing table, and the spoke-to-spoke comparison matrix live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the "when (not) to use hub-spoke" framing, the centralized-vs-direct spoke-to-spoke decision, the four anti-patterns (hub without firewall / workloads in hub / missing UDRs / single point of failure), and the topology-selection matrix. The Azure peering flags (`--allow-forwarded-traffic`, `--use-remote-gateways`, `--allow-gateway-transit`), the AWS TGW attach + route-table CLI, the GCP Shared VPC enable / VPC peering import-export flags, and the shared-services subnet sizing table all live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Hub-and-Spoke" })` for canonical CLI per cloud, shared-services placement table, spoke-to-spoke comparison matrix, and the topology-selection decision matrix.
2. Cite the vault page when stating peering flag semantics, AWS TGW route-table mechanics, or GCP custom-route import/export.

If a cloud/scenario isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_vnet" })`.

---

## When to use hub-spoke-design

| Scenario | Behaviour |
|---|---|
| "Design a hub-spoke for our 5 VNets" | Topology selection + shared-services subnet plan + peering flag plan |
| "Should this be hub-spoke or mesh?" | Apply decision matrix (VNet count / latency / centralized security need) |
| "How do spoke A and spoke B talk?" | Pattern selection — via hub firewall (default) vs direct peering (low-latency trusted pairs) |
| AWS hub-spoke design | Transit Gateway pattern + per-environment route tables |
| GCP hub-spoke design | Shared VPC (recommended for orgs) vs VPC peering with custom route import/export |
| "We have 50+ VNets" | Redirect to managed transit (vWAN / Network Connectivity Center) — also `cn_skill({ specialist: "cn_vwan", skill: "vwan-design" })` |
| Spoke address-space planning | Redirect: `cn_skill({ specialist: "cn_vnet", skill: "address-planner" })` |
| VNet peering between spokes (advice on flags) | Redirect: `cn_skill({ specialist: "cn_vnet", skill: "peering-advisor" })` |
| Firewall in the hub — policy design | Redirect: `cn_skill({ specialist: "cn_fw", skill: "policy-design" })` |
| Routing intent / inspection through firewall in vWAN | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "routing-intent" })` |
| Diagram of the topology | Redirect: `cn_skill({ specialist: "cn_vnet", skill: "network-diagram" })` |
| Multi-cloud transit / GCP NCC / AWS Cloud WAN | Redirect: `cn_skill({ specialist: "cn_mcn", skill: "transit-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical hub-spoke pattern — when to use, per-cloud implementations, shared-services placement table, spoke-to-spoke matrix, topology-selection matrix, anti-patterns | [[Hub-and-Spoke]] | `cn_vault_page({ page: "Hub-and-Spoke" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Cloud(s)** in scope — Azure / AWS / GCP / multi.
2. **Number of VNets/VPCs** — drives topology (hub-spoke if 3-50; managed transit at 50+).
3. **Centralized security required?** — yes drives hub-spoke; no opens mesh / isolated.
4. **Shared services in scope** — firewall / VPN-ER gateway / bastion / DNS resolver / monitoring.
5. **Spoke-to-spoke latency budget** — drives via-firewall vs direct peering.
6. **Operational team size** — drives managed-transit (low ops) vs hub-spoke (medium) vs mesh (high N×N).
7. **On-prem connectivity** — drives gateway-in-hub vs per-network.
8. **Environment isolation needs** — drives TGW route-table split (AWS) / multiple UDRs (Azure) / Shared VPC service-project segregation (GCP).

---

## Workflow

1. **Collect inputs** above.
2. **Load `Hub-and-Spoke`**.
3. **Apply the topology-selection matrix** — hub-spoke if 3-50 VNets, centralized security needed, shared services present; mesh if 2-10 tightly-coupled; managed transit if 50+ or global; isolated if 1-3 independent.
4. **Per cloud, pick the construct** — Azure: VNet peering with hub-spoke flags; AWS: Transit Gateway with per-env route tables; GCP: Shared VPC (preferred) or VPC peering with custom route import/export.
5. **Plan shared-services subnets** — firewall (Azure /26 min), VPN/ER gateway (Azure GatewaySubnet /27 min), Bastion (Azure /26), DNS Resolver (Azure /28), shared services (/24).
6. **Plan spoke-to-spoke** — default via hub firewall (UDR pointing to firewall private IP); only direct peering for trusted low-latency pairs that bypass inspection.
7. **For Azure** — set `--allow-forwarded-traffic true` on both sides; `--use-remote-gateways true` on spoke side; `--allow-gateway-transit true` on hub side. Add UDR for spoke-to-spoke via firewall.
8. **For AWS** — split prod/dev TGW route tables to enforce isolation; for inspection, route TGW traffic through an inspection VPC.
9. **For GCP** — prefer Shared VPC for organisations (single network, no peering); for independent VPCs use peering with `--export-custom-routes` and `--import-custom-routes`.
10. **Surface anti-patterns** — hub without firewall / inspection = expensive routing-only; workloads in hub = blast-radius problem; missing UDRs = silent direct-egress; single-point-of-failure on firewall/gateway = use zone-redundant SKUs and A-A gateways.
11. **Decide HA posture** — zone-redundant firewall + Active-Active VPN gateway (Azure); TGW attached to subnets in multiple AZs (AWS); regional Cloud Router HA (GCP).
12. **Emit** in the format below.

---

## Output format

Every hub-spoke answer should emit:

1. **Inputs assumed** — one line each.
2. **Topology choice** — hub-spoke / mesh / managed transit / isolated + matrix-row rationale.
3. **Hub layout** — per-subnet plan with CIDRs (firewall, gateway, bastion, DNS, shared services).
4. **Spoke list** — per spoke with CIDR + peering flags.
5. **Spoke-to-spoke plan** — via-firewall vs direct + UDR plan (Azure) / TGW route-table plan (AWS).
6. **Per-cloud CLI pointers** — cite vault snippets for VNet peering / TGW attach / Shared VPC.
7. **HA posture** — zone-redundant SKUs, A-A gateways, multi-AZ TGW attachments.
8. **Anti-pattern check** — confirm the design avoids the 4 anti-patterns.
9. **Pointer to diagram** — `cn_skill({ specialist: "cn_vnet", skill: "network-diagram" })`.
10. **What this excludes** — spoke address-space planning (`cn_vnet/address-planner`), firewall rules (`cn_fw/policy-design`), routing-intent specifics (`cn_vwan/routing-intent`), monitoring (`cn_nmon`).
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Hub-spoke for fewer than 3 VNets.** Overhead exceeds benefit. Use peering or isolated.
2. **Forgetting `--allow-forwarded-traffic` on Azure peerings.** Spoke-to-spoke via firewall silently fails — packets are dropped by the peering.
3. **Forgetting `--use-remote-gateways true` on the spoke side.** Spoke can't use the hub's VPN/ER gateway and tries to provision its own.
4. **Missing UDR on spoke subnets.** Spoke A's traffic to spoke B goes via the cheapest path the OS knows (often direct internet egress, since peering alone is non-transitive). Always add UDR pointing to firewall private IP.
5. **AWS TGW without per-env route tables.** Default route table associates all attachments to one table → no isolation between prod and dev.
6. **GCP VPC peering without `--export-custom-routes` / `--import-custom-routes`.** Subnet routes flow automatically but the hub's static / dynamic routes don't reach the spoke.
7. **Putting workloads in the hub.** Hub blast radius explodes; security boundary blurs. Hub holds shared services only.
8. **Non-zone-redundant firewall in production hub.** A single Azure Firewall in one zone is a one-AZ outage from total inspection loss. Use zone-redundant SKU (3 zones).
9. **Recommending GCP VPC peering when Shared VPC fits.** Shared VPC is the recommended GCP hub-spoke for organisations and eliminates the peering complexity.
10. **Recommending mesh "because it's simple".** N×N peerings become unmanageable past ~5 VNets and there's no central security control.
11. **Treating AWS VPC peering as transitive.** It isn't. Spoke A ↔ Hub ↔ Spoke B requires TGW (or NVA in hub with custom route tables); plain VPC peering won't work.

**Analysis only — verify against vendor documentation before applying.**
