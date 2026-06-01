# Skill: Virtual WAN Topology Design (`vwan_skill_vwan_design`)

Design Azure Virtual WAN topologies — tier selection (Basic vs Standard), single-hub vs multi-hub, secured vs unsecured hub, hub-component scale-unit sizing (VPN / P2S / ExR / Azure Firewall), connection-type provisioning (VNet / S2S / P2S / ExR), and hub IP-address-space planning. Owns the topology decision tree + the "always Standard for production" rule. The exact tier-feature table, scale-unit numbers, hub-address-space rules, and CLI examples live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the tier choice (always Standard for prod), the single-hub-vs-multi-hub decision (regional affinity / aggregate bandwidth / sovereignty), the scale-unit sizing methodology (start at 25% headroom over 95p), and the IP-address-space-planning rule (/24 only for basic, /23 baseline, /22+ secured). The exact CLI (`az network vwan/vhub create`, `vhub connection create`), tier-feature comparison, hub-settings RIU table, and current Azure Firewall throughput limits live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Virtual-WAN" })` for canonical tier comparison, scale-unit table, IP-address-space rules, connection-type catalogue, and CLI snippets.
2. Cite the vault page when quoting tier features, scale-unit throughput numbers, or hub-settings RIU values.
3. For secured-hub design specifically (firewall policy in the hub), redirect: `cn_skill({ specialist: "cn_vwan", skill: "secured-vhub-design" })`.

If a scenario isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_vwan" })`.

---

## When to use vwan-design

| Scenario | Behaviour |
|---|---|
| "Should we use Basic or Standard?" | Always Standard for prod; Basic only POC single-site |
| "Single hub or multi-hub?" | Apply decision tree — regional affinity / aggregate BW / sovereignty / ExR PoP |
| "How many scale units for our VPN / P2S / ExR gateway?" | Size against 95p + 25% growth; cite vault scale-unit table |
| "What address space for the hub?" | /23 baseline, /22+ if Azure Firewall in hub; cite vault rule |
| "How does hub-to-hub transit work?" | Microsoft backbone, automatic, AS 65520 iBGP mesh between hubs |
| Connection-type catalogue (VNet / S2S / P2S / ExR) | Quote vault catalogue |
| Secured-hub firewall policy / inline inspection design | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "secured-vhub-design" })` |
| Routing intent / traffic steering through Azure Firewall | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "routing-intent" })` |
| Branch / VPN-site CPE design | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "branch-connectivity" })` |
| Effective-routes / connection-state debugging | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "troubleshoot" })` |
| Hybrid BGP topology / ExpressRoute peering | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "bgp-design" })` and `cn_skill({ specialist: "cn_hyb", skill: "expressroute-design" })` |
| Capacity sizing for the hub gateways | Redirect: `cn_skill({ specialist: "cn_ncap", skill: "gateway-sizing" })` |
| Cost / TCO of vWAN | Redirect: `cn_skill({ specialist: "cn_price", skill: "circuit-pricing" })` and `cn_skill({ specialist: "cn_price", skill: "egress-architecture" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical Virtual WAN — tier comparison, single/multi-hub criteria, secured hubs, scale-unit table, connection types, hub IP rules, CLI | [[Virtual-WAN]] | `cn_vault_page({ page: "Virtual-WAN" })` |
| Routing intent (paired when traffic steering through firewall is in scope) | [[VWAN-Routing-Intent]] | `cn_vault_page({ page: "VWAN-Routing-Intent" })` |
| Troubleshooting (paired for design validation guidance) | [[VWAN-Troubleshooting]] | `cn_vault_page({ page: "VWAN-Troubleshooting" })` |

Row #1 is mandatory.

---

## Required inputs — collect before answering

1. **Regional footprint** — single Azure region or multi-region.
2. **Branch / site count** — drives single vs multi-hub.
3. **Aggregate hybrid bandwidth** — sustained (95p) + peak across all branches.
4. **ExpressRoute presence** — # circuits + their peering locations.
5. **Remote-user posture** — P2S concurrent users + auth method (cert / Entra / RADIUS / SAML).
6. **Security posture** — secured hub (Azure Firewall / NVA) or plain hub?
7. **NVA preference** — Azure Firewall (default) vs supported NVA (e.g., Fortinet, Palo Alto, Cisco).
8. **Hub address-space availability** — non-overlapping /23 minimum (or /22+ if Azure Firewall in hub).
9. **Branch-to-branch traffic** — needed (Standard) or not (Basic acceptable only for trivial POC).
10. **Cost-sensitivity** — affects scale-unit headroom and Premium vs Standard Azure Firewall.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Virtual-WAN`**.
3. **Pick tier** — Standard for any production deployment; Basic only for single-site POC without transit / multi-hub / P2S / ExR / secured hub.
4. **Pick single vs multi-hub** — single if all branches in one region, aggregate BW < 10 Gbps, < 500 VPN sites, RTT < 50 ms to all branches; multi-hub otherwise.
5. **Size each hub component** independently — VPN gateway scale units (0.5 Gbps each, up to 20), P2S scale units (0.5 Gbps each, up to 100k connections), ExR gateway scale units (2 Gbps each, up to 10), Azure Firewall throughput against vault page (verify current values — Microsoft updates them).
6. **Apply 25% growth headroom** over the 95p sustained throughput.
7. **Plan hub address space** — /23 baseline, /22+ if Azure Firewall in hub; ensure no overlap with spokes or on-prem.
8. **Catalogue connections** — VNet, S2S, P2S, ExR; for S2S surface the up-to-4-links-per-site (dual ISP, active-active) option.
9. **For secured hub** — redirect to `secured-vhub-design` for firewall policy; this skill stays at the topology layer.
10. **For traffic steering through firewall** — redirect to `routing-intent`.
11. **Emit** in the format below.

---

## Output format

Every vwan-design answer should emit:

1. **Inputs assumed** — one line each.
2. **Tier** — Standard / Basic + rationale.
3. **Hub topology** — single or multi (with region list + reason).
4. **Per-hub component sizing** — VPN / P2S / ExR / Azure Firewall scale units + the 95p × 1.25 / unit-capacity formula.
5. **Hub IP-address-space allocation** — per hub.
6. **Connection plan** — how many of each type, where they terminate.
7. **Secured-hub posture pointer** — secured or not; redirect to `secured-vhub-design` for policy.
8. **Hub-to-hub transit note** — automatic via Microsoft backbone, AS 65520.
9. **CLI snippet pointer** — `az network vwan create` + `az network vhub create` + `az network vhub connection create` from vault.
10. **What this excludes** — firewall rules, routing intent specifics, branch CPE config, BGP attribute design, sizing detail (`cn_ncap`).
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Recommending Basic tier for anything past trivial POC.** No transit, no multi-hub, no secured hub, no P2S, no ExR. Use Standard.
2. **Sizing the VPN gateway against peak instead of 95p × 1.25.** Over-provisions and over-pays; under-provisions and drops at month-end peak.
3. **Quoting Azure Firewall throughput from memory.** Microsoft updates limits; always cite the vault link and recommend re-checking before deployment.
4. **Recommending /24 hub address space when Azure Firewall is in the hub.** Insufficient — the firewall subnet alone needs space; use /22+.
5. **Overlapping hub address space with spokes or on-prem.** Silent routing failures later. Maintain a global vWAN IPAM record.
6. **Forgetting `--branch-to-branch-traffic true` on `az network vwan create`.** Branches won't reach each other through the hub; surprise outage.
7. **Recommending 1 P2S scale unit for thousands of users.** 1 unit = 500 Mbps and a fraction of the 100k connections max. Size for concurrent connections and aggregate bandwidth.
8. **Treating multi-hub as a free latency win.** Multi-hub adds hub-to-hub backbone hops; for two close regions a single hub may be cheaper and lower latency. Always justify multi-hub.
9. **Not pairing with `secured-vhub-design` when the customer mentions inspection.** vwan-design owns topology; firewall policy / inspection design lives in the sibling skill.
10. **Skipping ExpressRoute peering-location coordination.** ExR circuits should terminate at PoPs co-located with the hub's region; otherwise added backbone hops + latency.

**Analysis only — verify against vendor documentation before applying.**
