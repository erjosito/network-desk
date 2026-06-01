# Skill: VPN Gateway Design (`hyb_skill_vpn_design`)

Design site-to-site and point-to-site VPN gateways across Azure, AWS, and GCP — gateway SKU selection, S2S vs P2S split, BGP vs static, active-active vs active-standby, IPsec/IKE custom policies, and protocol selection (IKEv2 vs OpenVPN vs SSTP). Per-cloud service detail (Azure VPN Gateway SKUs and consolidation timeline, AWS Site-to-Site tunnel options, GCP HA VPN architecture) lives in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the S2S/P2S decision, the IKEv2-vs-OpenVPN selection, the BGP-vs-static stance (always BGP when CE supports it), the active-active-vs-standby framing, and the "AES-256-GCM + SHA-384 + ECP384" cryptographic baseline. Per-cloud SKU tables, CLI examples (`az network vpn-connection ipsec-policy add`, `aws ec2 create-vpn-connection`, GCP `gcloud compute vpn-tunnels create`), the SKU-consolidation timeline, and tunnel options live in the vault.

Mandatory steps every time you use this skill:

1. Call the cloud-specific vault page(s) for the deployment in scope:
   - Azure → `cn_vault_page({ page: "VPN-Gateway" })`
   - AWS → `cn_vault_page({ page: "Site-to-Site-VPN" })`
   - GCP → `cn_vault_page({ page: "HA-VPN" })`
2. Cite the vault page when stating SKU specs / throughput numbers / tunnel options / CLI syntax.
3. For VPN cost / throughput-per-dollar comparison, redirect: `cn_skill({ specialist: "cn_price", skill: "vpn-pricing" })`.
4. For BGP topology over the VPN, pair with `cn_skill({ specialist: "cn_hyb", skill: "bgp-design" })`.

If a vendor/scenario isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_hyb" })`.

---

## When to use vpn-design

| Scenario | Behaviour |
|---|---|
| "Pick a VPN gateway SKU for production" | Azure: default to VpnGwXAZ (zone-resilient); cite SKU consolidation timeline from vault |
| "S2S or P2S?" | S2S for branch/DC connectivity; P2S for individual remote users |
| "IKEv2 vs OpenVPN?" | IKEv2 for S2S + perf-sensitive P2S; OpenVPN for firewall-friendly P2S (TCP 443) |
| "Active-active or active-standby?" | A-A for production needing < 30 s failover and higher aggregate throughput |
| "Custom IPsec/IKE policy" | AES-256-GCM Phase 2 + SHA-384 + ECP384 baseline; cite per-cloud CLI |
| Throughput sizing | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "bandwidth-calc" })` for 95p sizing, then map to SKU |
| BGP topology over the VPN | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "bgp-design" })` |
| Primary/backup with ExpressRoute | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "failover-design" })` |
| Cost / TCO of VPN | Redirect: `cn_skill({ specialist: "cn_price", skill: "vpn-pricing" })` |
| When to choose ExpressRoute instead | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "expressroute-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Azure VPN Gateway — SKUs, P2S protocols, custom IPsec policy CLI, A-A vs A-S, SKU consolidation timeline | [[VPN-Gateway]] | `cn_vault_page({ page: "VPN-Gateway" })` |
| AWS Site-to-Site VPN — CGW + VGW/TGW, two-tunnel design, tunnel options, accelerated VPN | [[Site-to-Site-VPN]] | `cn_vault_page({ page: "Site-to-Site-VPN" })` |
| GCP HA VPN — two-interface design, four-tunnel HA, Cloud Router pairing | [[HA-VPN]] | `cn_vault_page({ page: "HA-VPN" })` |
| BGP design (pair when VPN runs BGP) | [[BGP-Design]] | `cn_vault_page({ page: "BGP-Design" })` |

Load the row(s) matching the cloud(s) in scope. For multi-cloud answers, load all three.

---

## Required inputs — collect before answering

1. **Cloud(s)** — Azure / AWS / GCP / multi.
2. **Use case** — S2S branch/DC, P2S remote users, or both.
3. **Throughput target** — sustained (95p) + peak; drives SKU.
4. **HA target** — RTO seconds; drives A-A vs A-S.
5. **Authentication for P2S** — certificate / Entra ID / RADIUS / SAML / mutual TLS.
6. **Firewall traversal constraint** — does client-side firewall block UDP 500/4500/1194? If yes → SSTP (Win-only) or OpenVPN over TCP 443.
7. **CE vendor + BGP capability** — drives BGP vs. static decision.
8. **Crypto / compliance requirement** — FIPS, NIST, sovereign deployment? Drives cipher selection beyond baseline.

---

## Workflow

1. **Collect inputs** above.
2. **Load the cloud-specific vault page(s)**.
3. **Choose S2S, P2S, or both**, scoping per use case.
4. **Pick the gateway SKU** for sustained-throughput + 25% growth, then round up. For Azure, default to **VpnGwXAZ** and verify against the consolidation timeline link in the vault. For AWS, the VPN connection itself is fixed; size with accelerated VPN if needed. For GCP, HA VPN is the only supported posture for 99.99% SLA.
5. **Pick active-active for production** with BGP; A-S only when CE doesn't support BGP or when RTO 60-90 s is acceptable.
6. **Pick the protocol** — IKEv2 for S2S and most P2S; OpenVPN where firewall traversal matters; SSTP only on legacy Windows-only requirements.
7. **Set the IPsec/IKE policy** — AES-256-GCM Phase 2 + SHA-384 + ECP384, SA lifetime 28 800 s / 3 600 s, PFS on. Cite vault CLI snippet.
8. **Plan BGP** — always BGP if the CE supports it; pair-load `BGP-Design`.
9. **Decide P2S authentication** — certificate (operational simple), Entra ID/SAML (centralised IdP), RADIUS (existing infra), AD (AWS Client VPN).
10. **Surface caveats** — Azure A-A needs two public IPs and APIPA non-default addresses; AWS tunnels are always two endpoints; GCP HA VPN requires *two* on-prem gateways for the 99.99% SLA.
11. **Emit** in the format below.

---

## Output format

Every vpn-design answer should emit:

1. **Inputs assumed** — one line each.
2. **S2S / P2S split** — what each is used for.
3. **Gateway SKU** per cloud + rationale + throughput headroom + SKU-consolidation note (Azure).
4. **HA posture** — A-A or A-S + RTO.
5. **Protocol** — IKEv2 / OpenVPN / SSTP per use case.
6. **Custom IPsec/IKE policy** — Phase 1 + Phase 2 parameters; CLI snippet pointer to vault.
7. **BGP plan** — ASN, two BGP sessions per tunnel (AWS), APIPA addresses (Azure), Cloud Router pairing (GCP) — pointer to `bgp-design` for full topology.
8. **P2S authentication** if applicable.
9. **Per-cloud caveats** relevant to this design.
10. **Indicative cost pointer** — `cn_skill({ specialist: "cn_price", skill: "vpn-pricing" })`.
11. **What this excludes** — topology / circuit choice / detailed BGP policy / monitoring.
12. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Quoting Azure VPN SKU throughput / tunnel counts from memory.** Microsoft consolidates SKUs; always cite the vault page link to the consolidation timeline and verify current values.
2. **Recommending non-AZ Azure SKUs for greenfield.** New designs should default to VpnGwXAZ (zone-resilient); non-AZ is legacy/migration-only.
3. **Static routing on production S2S.** Manual updates + no failover. Always use BGP when the CE supports it.
4. **Active-standby with 60-90 s failover for "real-time" workloads.** A-A + BGP halves to ~10-15 s on Azure; AWS two-tunnel is always active. Set expectations early.
5. **GCP HA VPN with a single on-prem gateway.** The 99.99% SLA requires *two* on-prem peers. One peer = best 99.9% (single-peer SLA).
6. **AES-128-CBC + SHA-1 + DH2 default.** Insecure and likely non-compliant. The baseline is AES-256-GCM + SHA-384 + ECP384.
7. **APIPA defaults on Azure A-A.** Conflicts cause silent BGP failure. Pick non-default 169.254.x.x addresses on each instance.
8. **OpenVPN for high-throughput S2S.** User-space, lower performance than IKEv2. Use OpenVPN for P2S where firewall traversal matters, not for S2S.
9. **SSTP on non-Windows clients.** SSTP is Windows-only. Cross-platform P2S → OpenVPN.
10. **VPN as the only path for production.** Internet-routed, MTTR depends on ISP. Pair with a backup path (second VPN to a different region, or an ExpressRoute primary with VPN as backup).
11. **Forgetting AWS tunnel #2.** Each VPN connection has two tunnels; only one is "active" at a time but you must advertise the same prefixes on both with AS-PATH prepend on the backup.
12. **Building P2S certificate auth at scale.** Cert lifecycle becomes the operational burden. Above ~100 users, prefer Entra ID/SAML.

**Analysis only — verify against vendor documentation before applying.**
