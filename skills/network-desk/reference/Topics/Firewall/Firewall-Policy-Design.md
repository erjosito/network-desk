---
type: topic
name: Firewall Policy Design
specialists: [cn_fw, cn_nsec]
tags: [firewall, policy, zone, rule-design]
status: stable
updated: 2026-06-01
---
# Firewall Policy Design

## Purpose

Design zone-based firewall policy architectures from requirements. Produce structured policy sets with explicit allow rules, default deny, application-aware inspection, NAT design, and logging strategy — tailored to the target vendor platform.

---

## Core Design Principles

1. **Default Deny** — Every zone transition that is not explicitly permitted is denied. The last rule in every policy set is an explicit deny-all with logging enabled.
2. **Least Privilege** — Rules specify the narrowest source, destination, and service possible. No `any/any` unless there is a documented, risk-accepted justification.
3. **Zone-Based Architecture** — Traffic policy is defined by zone transitions (from-zone → to-zone), not by interface. Zones abstract the underlying topology.
4. **Application Awareness** — Where the platform supports it (PAN-OS App-ID, FortiGate App Control, [[Check-Point|Check Point]] App Control, SRX AppSecure), prefer application-level policies over port-based rules.
5. **Logging by Default** — All allow rules log at session-end (or equivalent). Deny rules log at session-start. Management zone traffic may log at a reduced level to avoid noise.

---

## Zone Taxonomy

| Zone | Purpose | Typical Assets | Trust Level |
|------|---------|----------------|-------------|
| **Trust** (Inside/LAN) | Internal corporate network | Workstations, internal servers, printers | High |
| **Untrust** (Outside/WAN) | Internet, external networks | External endpoints, SaaS, CDNs | None |
| **DMZ** | Publicly accessible services | Web servers, reverse proxies, mail relays | Low |
| **Management** | Device management plane | Firewall GUI/SSH, SNMP, syslog collectors | Highest (restricted) |
| **Guest** | Untrusted internal users | BYOD, visitor Wi-Fi | None (treated as untrust) |
| **Database** | Data tier | Database servers, data warehouses | High (isolated) |
| **Application** | Application tier | App servers, middleware, API gateways | Medium-High |

---

## Zone-Transition Policy Matrix Template

| From \ To | Untrust | DMZ | Trust | Database | Application | Management |
|-----------|---------|-----|-------|----------|-------------|------------|
| **Untrust** | — | Allow (HTTPS, SMTP) | Deny | Deny | Deny | Deny |
| **DMZ** | Allow (outbound updates) | — | Deny | Allow (DB port) | Allow (API port) | Deny |
| **Trust** | Allow (web, DNS, VPN) | Allow (management) | — | Allow (DB port) | Allow (app ports) | Allow (SSH, HTTPS) |
| **Database** | Deny | Deny | Allow (responses) | — | Deny | Deny |
| **Application** | Allow (API calls) | Deny | Allow (responses) | Allow (DB queries) | — | Deny |
| **Management** | Deny | Allow (monitoring) | Allow (monitoring) | Allow (monitoring) | Allow (monitoring) | — |

Each cell represents a policy — expand into specific rules with source/destination objects, services, and application IDs.

---

## L3/L4 vs L7 Policy Guidance

| Layer | Use When | Vendor Features |
|-------|----------|-----------------|
| **L3/L4** (IP, port) | Simple allow/deny by network and port; legacy apps; high-throughput paths where DPI is not needed | All platforms support L3/L4 |
| **L7** (Application) | Distinguishing apps on the same port (e.g., YouTube vs Google Drive on 443); granular SaaS control; threat inspection | PAN-OS App-ID, FortiGate App Control, [[Check-Point|Check Point]] App Control, SRX AppSecure, Zscaler app-aware policies, Sophos application rules |
| **Hybrid** | L7 where supported, L3/L4 as fallback for platforms without application awareness | OPNsense (Zenarmor plugin), pfSense (Snort/Suricata for IDS but not inline app policy), VyOS (L3/L4 only), iptables/nftables (L3/L4 only, use L7 proxies for app control) |

---

## Per-Vendor Zone Mapping

Vendor-specific policy design details have been extracted to per-vendor pages:

- **[[Vendors/Azure-Firewall#Policy design|Azure Firewall]]**
- **[[Vendors/AWS-Network-Firewall#Policy design|AWS Network Firewall]]**
- **[[Vendors/GCP-Cloud-Firewall#Policy design|GCP Cloud Firewall]]**
- **[[Vendors/PAN-OS#Policy design|PAN-OS (Palo Alto Networks)]]**
- **[[Vendors/FortiGate#Policy design|FortiGate (Fortinet)]]**
- **[[Vendors/Check-Point#Policy design|Check Point]]**
- **[[Vendors/Cisco-ASA-FTD#Policy design|Cisco ASA / Firepower (FTD)]]**
- **[[Vendors/Juniper-SRX#Policy design|Juniper SRX]]**
- **[[Vendors/Zscaler#Policy design|Zscaler (ZIA / ZPA)]]**
- **[[Vendors/Sophos-XG#Policy design|Sophos XG / XGS]]**
- **[[Vendors/OPNsense#Policy design|OPNsense]]**
- **[[Vendors/pfSense#Policy design|pfSense]]**
- **[[Vendors/VyOS#Policy design|VyOS]]**
- **[[Vendors/iptables-nftables#Policy design|iptables / nftables]]**

## Logging and Alerting Strategy

| Zone Transition | Log Level | Alert |
|-----------------|-----------|-------|
| Untrust → Any | All denied, all allowed (session-end) | Alert on any allowed (new rule match) |
| Any → Management | All (every packet) | Alert on any non-whitelisted access |
| DMZ → Database | All allowed and denied | Alert on denied (potential compromise) |
| Trust → Untrust | Session-end logging | Alert on unusual volume or destinations |
| Intra-zone (same zone) | Denied only | Alert on repeated denies (lateral movement) |

---

## Design Deliverables

1. **Zone diagram** — visual representation of zones and allowed transitions.
2. **Zone-transition matrix** — table of from/to zone with allowed services.
3. **Object definitions** — address objects/groups, service objects/groups, application groups.
4. **Rule set** — ordered list of rules per zone transition.
5. **NAT rules** — source NAT, destination NAT, and NAT exemptions.
6. **Logging policy** — per-rule logging configuration and log forwarding destinations.
7. **Vendor-specific config** — ready-to-review configuration in the target vendor's syntax.

---
**Analysis only — verify against vendor documentation before applying.**
