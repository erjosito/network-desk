# Skill: Branch Connectivity (`vwan_branch_connectivity`)

Design how branches, remote users, and on-premises datacenters connect into an Azure Virtual WAN hub — S2S VPN, P2S VPN, and ExpressRoute gateways inside the hub. Owns the gateway-selection workflow, scale-unit sizing, BGP / IPsec defaults, and the SD-WAN-orchestrator auto-connect pattern. The exact CLI commands, default IPsec/IKE parameter tables, scale-unit throughput values, and per-protocol limits live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the gateway-selection decision tree, scale-unit sizing methodology, BGP-with-vWAN ASN conventions (hub VPN GW uses AS 65515; hub router uses AS 65520), and the "what's missing from a typical branch design" review. Exact CLI, scale-unit throughput tables, default IPsec/IKE parameters, and protocol-limit comparisons live in the vault.

Mandatory steps every time you use this skill:

1. Identify which gateway types the user needs (S2S / P2S / ER, or any combination).
2. Call `cn_vault_page({ page: "VWAN-Branch-Connectivity" })` for canonical CLI, scale-unit table, and protocol defaults.
3. Load `Secured-Virtual-Hub` if the user's hub is firewall-secured (changes the routing-intent / inspection story).
4. Cite the vault page when stating scale-unit throughput, IPsec defaults, or limits.

If the user asks about an SD-WAN integration pattern or partner orchestrator not in the vault page, fall back to `cn_search({ query: "<keywords>", specialist: "cn_vwan" })`.

---

## When to use branch connectivity

| Scenario | Behaviour |
|---|---|
| "Connect branch X to our vWAN hub" | Run S2S design (single site) |
| "Bring on N branches via SD-WAN orchestrator" | Auto-connect pattern (Cisco vManage / VMware Orchestrator / Fortinet FortiManager) |
| "Remote users need to reach vWAN" | P2S sub-workflow |
| "Bring on-prem DC into vWAN" | ExpressRoute sub-workflow |
| "Sizing — what scale unit do I need?" | Sizing workflow (peak throughput + headroom + scale-unit math) |
| Routing-intent semantics (forced tunnel / private inspection) | Pair with `cn_skill({ specialist: "cn_vwan", skill: "routing-intent" })` |
| Hub is firewall-secured | Pair with `cn_skill({ specialist: "cn_vwan", skill: "secured-vhub-design" })` |
| Branch troubleshooting | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "troubleshoot" })` |
| ExpressRoute / DX / Interconnect design that does NOT terminate in vWAN | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "expressroute-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical vWAN branch connectivity — S2S/P2S/ER gateways, CLI, scale units, BGP, IPsec defaults, branch-to-branch routing | [[VWAN-Branch-Connectivity]] | `cn_vault_page({ page: "VWAN-Branch-Connectivity" })` |
| Secured vHub (when the hub has Azure Firewall or NVA — changes how branch traffic is inspected) | [[Secured-Virtual-Hub]] | `cn_vault_page({ page: "Secured-Virtual-Hub" })` |
| Routing intent — needed whenever branches must traverse firewall | [[VWAN-Routing-Intent]] | `cn_vault_page({ page: "VWAN-Routing-Intent" })` |
| ExpressRoute service detail (peering types, FastPath, etc.) | [[ExpressRoute]] | `cn_vault_page({ page: "ExpressRoute" })` |
| Site-to-Site VPN service detail (AWS context, useful when comparing) | [[Site-to-Site-VPN]] | `cn_vault_page({ page: "Site-to-Site-VPN" })` |
| Troubleshooting (used when the answer needs validation steps) | [[VWAN-Troubleshooting]] | `cn_vault_page({ page: "VWAN-Troubleshooting" })` |

Row #1 is mandatory. Rows #2 and #3 are mandatory when the hub is secured.

---

## Required inputs — collect before answering

1. **Hub region** + **vWAN tier** (Basic doesn't support ER or secured vHub).
2. **Gateway types** needed — S2S, P2S, ER, or combination.
3. **Branch count** + **per-branch bandwidth** + **peak aggregate** — drives scale-unit sizing.
4. **BGP support on CE** — vWAN strongly prefers BGP for dynamic routing; static-only branches lose auto-failover.
5. **Authentication for P2S** — Azure AD (requires OpenVPN) / certificate / RADIUS.
6. **SD-WAN orchestrator** — if any (Cisco / VMware / Fortinet) — enables auto-connect.
7. **Hub firewall** — Azure FW / partner NVA / none — changes the routing-intent story.
8. **ExpressRoute scenario** — circuit in same sub vs. cross-sub (auth key), Global Reach planned?

---

## Workflow

1. **Collect inputs** above.
2. **Load `VWAN-Branch-Connectivity`** (and `Secured-Virtual-Hub` + `VWAN-Routing-Intent` if applicable).
3. **Pick the gateway types** to deploy and **size** each:
   - S2S: scale units = ⌈peak aggregate Mbps / 500⌉, with 20–30% headroom.
   - P2S: scale units = ⌈peak users / 500/scale_unit_capacity⌉ (cite vault page for exact per-unit numbers).
   - ER: min 2 scale units recommended; aggregate ≤ 20 Gbps.
4. **Design BGP** — branch ASN, hub VPN GW ASN (65515), advertise/accept rules. Cite vault page.
5. **Choose protocol/auth for P2S** — Azure AD + OpenVPN is the recommended default.
6. **Plan auto-connect** if SD-WAN orchestrator is in play — the orchestrator handles VPN-site creation; you only define the hub side.
7. **Plan branch-to-branch routing** — Standard tier auto-enabled; if FW-secured hub, ensure routing-intent private rule is on.
8. **Plan failover** within the branch (single ISP vs. multi-link per VPN site; up to 4 links).
9. **Emit** in the format below.

---

## Output format

Every branch-connectivity answer should emit:

1. **Inputs assumed** — one line each.
2. **Gateway plan** — which gateways are in the hub + scale unit per gateway + rationale (cite vault page row).
3. **Per-branch design** — IP allocation, links per site, BGP ASN, custom IPsec policy if needed.
4. **Routing plan** — branch-to-branch behaviour, routing-intent involvement, ER Global Reach if applicable.
5. **Provisioning commands** — pointer to vault page section (do not duplicate inline).
6. **Sizing math** — explicit (peak Mbps + headroom / 500 = scale units), so the user can re-verify.
7. **What this excludes** — branch CPE configuration (vendor-specific), partner SD-WAN orchestrator setup, P2S client distribution.
8. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's pitfall list.

1. **Sizing on tunnel bandwidth, not aggregate.** A scale unit = 500 Mbps **aggregate** across all branches on the gateway. Size for peak total, not per-tunnel.
2. **Forgetting BGP recommendation.** Static-route branches can't take advantage of vWAN's auto-failover or route-intent. Push BGP unless the CE genuinely can't speak it.
3. **Mixing the gateway ASN with the hub-router ASN.** Hub VPN GW = 65515 (for BGP with branches); hub router = 65520. Confusing them generates wrong BGP peers and broken sessions.
4. **Recommending SSTP for new deployments.** Windows-only legacy. Use OpenVPN for new P2S work.
5. **Forgetting Azure AD = OpenVPN only.** If the user wants AAD auth, the protocol is forced to OpenVPN (TCP/UDP 443). Don't promise AAD + IKEv2.
6. **Not surfacing scale-unit-throughput trade-off.** Each scale unit adds cost; users routinely over-size out of fear. Cite the vault page's table and offer a sized recommendation.
7. **Skipping routing-intent / firewall design for secured hubs.** If the hub has a firewall, branches route through it — but only if routing intent is configured. A "branch is up" answer that omits routing intent will not actually inspect east-west.
8. **ER cross-sub without auth key.** Cross-sub ExpressRoute attachment needs an authorization key from the circuit owner's tenant. Surface this dependency early.

**Analysis only — verify against vendor documentation before applying.**
