# Skill: DNS Resolver Design (`dns_skill_resolver_design`)

Design DNS resolver topologies for hybrid and multi-cloud environments. Covers Azure DNS Private Resolver, AWS Route 53 Resolver (inbound / outbound + Profiles), GCP Cloud DNS forwarding zones + inbound policy + DNS peering, and on-premises integration. Owns the *resolver-is-the-bridge* model (cloud-default DNS can't resolve on-prem or cross-cloud names without explicit forwarding), the *direction-first decision* (inbound vs outbound endpoint per traffic direction), the *HA-across-zones* rule (single-AZ endpoint = SPOF), the *every-spoke-linked-to-the-ruleset* mandate (otherwise spokes get NXDOMAIN), the *privatelink.* forwarding for on-prem clients* mandate (otherwise on-prem clients resolve PaaS to public IPs), and the *circular-forwarding-trap* awareness. Per-cloud CLI for endpoints, rulesets, vnet-links, subnet sizing (Azure /28 delegated), Route 53 Profiles vs RAM-shared rules, GCP DNS peering, and the multi-cloud resolver design diagram live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *resolver-bridges-the-gap* model, the *inbound-for-on-prem-to-cloud / outbound-for-cloud-to-on-prem* direction rule, the *HA-across-AZs* mandate, the *link-rulesets-to-every-spoke* mandate, the *privatelink-forwarding-for-on-prem* mandate, and the *trace-the-chain-end-to-end* circular-forwarding check. Per-cloud CLI, subnet sizing, Route 53 Profiles guidance, GCP DNS peering CLI, and the multi-cloud topology diagram live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "DNS-Resolver-Design" })` for canonical Azure DNS Private Resolver CLI + subnet rules, AWS Route 53 Resolver inbound/outbound CLI + Profiles guidance, GCP Cloud DNS forwarding + inbound policy + DNS peering CLI, and the multi-cloud resolver design diagram + common mistakes.
2. For zone design (public/private/split-horizon/delegation), redirect to `zone-design`.
3. For DNS as a security control (firewall, sinkhole, logging) within a zero-trust posture, redirect to `cn_skill({ specialist: "cn_nsec", skill: "zero-trust-architecture" })`.

If a vendor / pattern isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_dns" })`.

---

## When to use resolver-design

| Scenario | Behaviour |
|---|---|
| "On-prem clients can't resolve our Azure private endpoint names" | Outbound from on-prem → Azure inbound resolver + forwarders for `privatelink.*` |
| "Azure VMs can't resolve corp.contoso.com" | Outbound endpoint + forwarding ruleset + link to ALL spoke VNets |
| "AWS workload needs to resolve Azure private name" | Cross-cloud forwarding via VPN/ER + resolver endpoints both sides |
| "Centralise DNS for many AWS accounts/VPCs" | Route 53 Profiles (preferred over per-rule RAM share) |
| "GCP VPC → on-prem DNS" | Cloud DNS forwarding zone with `--forwarding-targets` |
| "On-prem → GCP DNS" | DNS inbound policy + on-prem forwarder pointing at inbound IPs |
| "Cross-VPC DNS without VPC peering" | GCP DNS peering zone |
| Designing the zone itself (public vs private, split-horizon, delegation) | Redirect: `cn_skill({ specialist: "cn_dns", skill: "zone-design" })` |
| DNS as security (firewall / sinkhole / NXDOMAIN logging) | Cite resolver-firewall capabilities; redirect zero-trust framing to `cn_skill({ specialist: "cn_nsec", skill: "zero-trust-architecture" })` |
| Troubleshooting NXDOMAIN / SERVFAIL | Apply this skill + `cn_skill({ specialist: "cn_ntsh", skill: "dns-troubleshoot" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical resolver reference — Why resolvers matter, Azure DNS Private Resolver (architecture, deployment CLI, subnet rules, on-prem forwarder PowerShell), AWS Route 53 Resolver (inbound + outbound CLI, security groups, Profiles), GCP Cloud DNS forwarding + inbound policy + DNS peering CLI, multi-cloud resolver topology diagram, common mistakes | [[DNS-Resolver-Design]] | `cn_vault_page({ page: "DNS-Resolver-Design" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Cloud(s)** in scope + connectivity (VPN / ER / Interconnect / multi-cloud transit).
2. **Direction(s) of resolution** — on-prem → cloud, cloud → on-prem, cloud → cloud.
3. **Zones in scope** — `corp.contoso.com` (AD), `privatelink.*` (Azure PaaS), `internal.contoso.com`, app-specific.
4. **Existing on-prem DNS** — AD-integrated DNS, BIND, Infoblox.
5. **Hub-and-spoke topology** — number of spokes; centralised vs decentralised DNS.
6. **HA requirement** — at least 2 AZs per resolver endpoint.
7. **Compliance** — DNS query logging requirement (SIEM ingestion).
8. **Subnet capacity** — Azure needs /28 dedicated + delegated for inbound + outbound.

---

## Workflow

1. **Collect inputs** above.
2. **Load `DNS-Resolver-Design`**.
3. **Pick directions** — design inbound and/or outbound per cloud per the table.
4. **Apply HA rule** — endpoints in ≥2 AZs / zones; on-prem forwarder pointed at ALL inbound IPs.
5. **Apply ruleset-link rule** — Azure: link the forwarding ruleset to every spoke VNet, not just hub. AWS: associate rules with each VPC or use Profiles. GCP: forwarding zone visibility scoped to each VPC needing it.
6. **Apply privatelink-forwarding rule** — on-prem DNS must conditionally forward `privatelink.<service>.core.windows.net` (and equivalents) to the Azure inbound endpoint, or on-prem clients resolve to public IPs and bypass the private endpoint.
7. **Apply firewall-rule check** — UDP+TCP 53 must be allowed on NSGs / SGs / firewall ACLs + on-prem firewalls in both directions.
8. **Trace the chain end-to-end** — confirm no circular forwarding (cloud→on-prem→cloud for same zone).
9. **For multi-cloud** — outbound on cloud A → inbound on cloud B over VPN/ER + matching forwarder on cloud A's resolver.
10. **For AWS centralisation** — prefer Route 53 Profiles over per-rule RAM share; document precedence between local VPC rules and Profile-provided rules.
11. **Wire query logging** — Azure resolver query logs / Route 53 Resolver Query Logging / Cloud DNS logging — destination SIEM.
12. **Surface anti-patterns** — single-AZ endpoints, on-prem forwarder pointing at 168.63.129.16, missing spoke-VNet ruleset link, missing privatelink forwarding, circular forwarding, missing UDP/TCP 53 rule, subnet not /28 delegated.
13. **Emit** in the output format below.

---

## Output format

Every resolver-design answer should emit:

1. **Inputs assumed** — cloud(s), directions, zones, hub-spoke, HA target.
2. **Resolver topology** — per cloud, inbound + outbound + ruleset + vnet-links.
3. **CLI plan** citing vault — endpoint create, ruleset create, rule create, vnet-link create.
4. **On-prem configuration** — conditional forwarders + zones list (must include `privatelink.*` for Azure PaaS).
5. **HA placement** — AZs / zones for each endpoint.
6. **Spoke linking** — explicit list of VNets/VPCs to link.
7. **Firewall-rule check** — UDP+TCP 53 on NSGs/SGs/on-prem.
8. **Forwarding-chain diagram** — trace end-to-end with no loops.
9. **Query-logging plan** — destination, retention.
10. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
11. **What this excludes** — zone design (`zone-design`), DNS troubleshooting (`ntsh/dns-troubleshoot`), DNS as security (zero-trust).
12. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Linking forwarding ruleset only to hub VNet.** Spokes get NXDOMAIN for on-prem names. Link to every VNet that needs resolution.
2. **Single-AZ resolver endpoints.** DNS fails when that AZ goes down. Always deploy ≥2 AZs.
3. **On-prem forwarders pointing at 168.63.129.16.** That IP is only reachable from within Azure VNets. Point at the **inbound endpoint IP**.
4. **Missing UDP and TCP 53 firewall rules.** Large responses fall back to TCP; UDP-only allow breaks resolution.
5. **Circular forwarding.** Cloud → on-prem → cloud → on-prem for same zone. Trace end-to-end before deploying.
6. **Missing `privatelink.*` forwarding for on-prem clients.** On-prem resolves storage.blob.core.windows.net to public IP and bypasses private endpoint.
7. **Resolver subnets shared with other resources** (Azure) or not /28+ delegated. Deployment fails or constrains capacity.
8. **Per-rule RAM sharing across many AWS accounts.** Use Profiles instead; RAM-shared rules don't scale operationally.
9. **No DNS query logging.** Loses early-warning signal for C2 / exfil / lateral movement; loses audit trail.
10. **Forgetting that auto-registration in Azure Private DNS is per-zone single-VNet.** Only one VNet can auto-register; others link for resolution only.
11. **Mixing forwarding zone visibility in GCP.** Public + private zones with the same name without explicit precedence design = unpredictable resolution.
12. **No conditional forwarder cleanup after migration.** Old forwarders for retired zones return STALE answers and cause silent failures.

**Analysis only — verify against vendor documentation before applying.**
