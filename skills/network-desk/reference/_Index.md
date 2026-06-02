---
type: index
name: Network Desk Knowledge Vault
updated: 2026-06-01
tags: [index]
---

# Network Desk Knowledge Vault

The curated cloud-networking knowledge corpus that backs the [network-desk](../../README.md) Copilot CLI extension. Scope: cloud networking on Azure, AWS, GCP, plus the 14 firewall vendors network-desk supports.

> See [[AGENTS]] for the vault schema, frontmatter contract, page templates, and authoring rules.

## Browse

- [[Services|🧰 Services]] — one page per cloud service, grouped by cloud (`Services/Azure/`, `Services/AWS/`, `Services/GCP/`).
- [[Topics|🧵 Topics]] — cross-cutting themes grouped into 21 domain subfolders (`CDN/`, `DNS/`, `Firewall/`, `Hybrid/`, `IPv6/`, `Load-Balancing/`, `Monitoring/`, `Pricing/`, `Security/`, `Troubleshooting/`, `VNet/`, `VWAN/`, …). See [[Topics/Troubleshooting/_Index|Troubleshooting decision tree]] for symptom-driven entry.
- [[Patterns|🏛️ Patterns]] — reusable reference architectures (hub-and-spoke, vWAN secured hub, three-tier web, multi-region active-active, …).
- [[Vendors|🏭 Vendors]] — 14 firewall vendor pages (Azure Firewall, AWS Network Firewall, GCP Cloud Firewall, PAN-OS, FortiGate, Check Point, Cisco ASA/FTD, Juniper SRX, Zscaler, Sophos XG, OPNsense, pfSense, VyOS, iptables/nftables). Vendor-specific syntax lives here; cross-vendor concepts stay in `Topics/Firewall/` and wikilink in.
- [[Labs|🧪 Labs]] — dated experiments with reproducible outcomes.

## Migration status

- **Phase 1 — Mechanical migration** ✅ — `tools/migrate-skills-to-vault.mjs` copied each SKILL.md to `_migrated/<specialist>/<skill>.md` with provenance frontmatter (124 files).
- **Phase 2a — Semantic refactor (reclassification)** ✅ — `tools/promote-from-migrated.mjs` + 4 batch manifests in `tools/manifests/` promoted all 124 pages to their final homes (6 Services, 113 Topics, 5 Patterns). Each promoted page has type-specific frontmatter, a `specialists:` array, and a body H1 matching its `name:`.
- **Phase 2b — Topics subdivision** ✅ — `tools/reorganize-topics.mjs` grouped the 113 Topics into 21 domain subfolders for easier Obsidian navigation (`CDN/`, `DNS/`, `Firewall/`, etc.). Batch manifests updated by `tools/update-manifest-paths.mjs` so the recovery flow targets the new paths. `Topics/Troubleshooting/_Index.md` added as a thin symptom-driven decision tree (the 8 pages in that folder are vendor-agnostic techniques only; domain runbooks live in their domain folder).
- **Phase 2c — Firewall vendor extraction** ✅ — `tools/extract-firewall-vendors.mjs` split the 14 firewall vendors out of `Topics/Firewall/*.md` into `Vendors/<Vendor>.md` pages. Each Vendor page follows a uniform H2 outline (Overview / Config generation / HA / Policy design / Hardening / Logging / Rule audit / Policy testing / Troubleshooting / Common gotchas / See also); empty sections are omitted. The 8 source Topics now hold only cross-vendor principles plus a bullet list of `[[Vendors/<Vendor>#<Section>]]` wikilinks. Non-vendor headings inside vendor zones (`Floating IP / EIP Failover (Any Cloud)`, `Vendor validation matrix`) were correctly left in place.
- **Phase 2d — Content rewrites** ✅ — Vendor roles axis (`roles: [firewall|router|sd-wan|sse, ...]`), `<!-- AUTO-STUB -->`-preserving extractor refactor, hand-authored Overview + Common gotchas for all 14 Vendor pages, 3 dedup pairs surgically resolved (SSL-TLS-Offload, WAF-Rules-Configuration/Policy-Design pair, Flow-Log-Analysis), wikilink suggester (`tools/suggest-wikilinks.mjs`), legacy `<prefix>_skill_<id>` → wikilink modernization (69 mechanical rewrites + 2 globs hand-resolved across 14 files; 0 legacy skill-id refs left in vault).
- **Phase 2e — Multi-cloud Services extraction** ✅ — Split the 3 multi-cloud Azure Service pages into Azure-only pages with `> Cloud equivalents:` cross-link headers, and extracted the AWS / GCP content to canonical pages under `Services/AWS/` and `Services/GCP/` (Direct-Connect, VPC-Endpoint, PrivateLink for AWS; Cloud-Interconnect, Private-Service-Connect, Service-Attachment for GCP). Added 17 lean stub pages for most-referenced AWS / GCP services that previously had no wikilink anchor (Transit-Gateway, Site-to-Site-VPN, Cloud-WAN, Route-53, CloudFront, ALB, NLB, NAT-Gateway, AWS-WAF; HA-VPN, NCC, Cloud-Router, Cloud-NAT, Cloud-DNS, Cloud-Load-Balancing, Cloud-CDN, Cloud-Armor). Wikilink coverage pass then re-ran `suggest-wikilinks` (now with --apply mode) across all source pages to convert literal AWS / GCP service mentions in prose into wikilinks.
- **Phase 3 — Wire up `cn_search`** ⏳ — replace `cn_skill` with BM25 retrieval over this vault.

## Personas that consume this vault

The 20 network-desk specialists (defined in [`extensions/network-desk/specialists/`](../specialists/)) reference this vault by tag and persona-scope frontmatter. See [[AGENTS#Retrieval contract (how cn_search reads the vault)]] for how `cn_search` filters by `specialists:` frontmatter.

| Specialist | `specialist` id |
|---|---|
| VNet/Subnet Architect | `cn_vnet` |
| Firewall Engineer | `cn_fw` |
| Load Balancer | `cn_lb` |
| DNS Specialist | `cn_dns` |
| Private Link Engineer | `cn_pl` |
| Hybrid Connectivity | `cn_hyb` |
| Network Security | `cn_nsec` |
| Network Troubleshooter | `cn_ntsh` |
| Virtual WAN / SD-WAN | `cn_vwan` |
| Network Monitor | `cn_nmon` |
| Multi-Cloud Networking | `cn_mcn` |
| Pricing Analyst | `cn_price` |
| IaC Generator | `cn_iac` |
| Container Networking | `cn_cnet` |
| CDN & Edge | `cn_cdn` |
| Network Automation & GitOps | `cn_nauto` |
| SASE / SSE | `cn_sase` |
| Capacity Planning | `cn_ncap` |
| IPv6 Migration | `cn_ipv6` |
| Report Builder | `cn_doc` |
