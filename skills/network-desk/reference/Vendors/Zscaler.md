---
type: vendor
name: Zscaler (ZIA / ZPA)
vendor_kind: sse
roles: [sse]
tags: [firewall, vendor, zscaler, sse, zia, zpa]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# Zscaler (ZIA / ZPA)

## Overview

Zscaler is a cloud-native Security Service Edge (**SSE**) platform — not a traditional firewall. Three core products:

- **ZIA (Internet Access)** — brokers internet-bound traffic from users / branches / clouds through Zscaler's global cloud, replacing legacy gateway + proxy stacks.
- **ZPA (Private Access)** — identity-aware application access (ZTNA), replacing VPN for private apps.
- **ZDX (Digital Experience)** — end-to-end app performance and user-experience telemetry.

Licensing is per-user (Business / Transformation / Unlimited bundles). Deployment uses GRE/IPsec tunnels for sites, the **Zscaler Client Connector** (Z-Tunnel) for endpoints, and **Cloud Connector** for cloud workloads. Best fit for SASE / ZTNA transformations and remote-workforce-heavy organisations; not designed for east-west datacenter / VPC inspection — pair with a traditional cloud firewall for that.

## Config generation

ZIA firewall policy object names, fields, and API resource paths change over time. Prefer the ZIA Admin Portal or the current Zscaler API documentation instead of copying brittle endpoint examples; verify current `firewallFilteringRules` object names and required fields in the official firewall policy docs before generating automation.

**Policy intent mapping:**
- Rule name/description: `Allow-DMZ-to-DB-MySQL` / `Allow DMZ web servers to MySQL`
- Action/state: allow, enabled
- Source: DMZ web server IP group or location group
- Destination: `10.1.3.0/24` or approved destination object
- Application/service: MySQL / TCP destination port 3306
- Logging: full session logging if supported by the current tenant and license

> Note: Zscaler ZIA is primarily for internet-bound traffic. For internal east-west traffic like DMZ-to-DB, consider ZPA, Zscaler Cloud Connector, or a local firewall. Verify current API paths and fields in the official ZIA firewall policy documentation: https://help.zscaler.com/zia/firewall-policies

## Policy design

- Zones defined as locations / sub-locations (ZIA) or app segments (ZPA).
- Firewall filtering rules apply to internet-bound traffic (ZIA).
- ZPA policies define access per application — no traditional zone model.

## Hardening

- Enable **SSL Inspection** for all allowed web traffic categories.
- Configure **DLP policies** for sensitive data egress prevention.
- Enable **Cloud Sandbox** (Advanced Cloud Sandbox) for zero-day detection.
- Restrict admin access with **IP-based SAML assertions**.
- Review **default allow rules** — Zscaler ships with permissive defaults.

## Rule audit

```bash
# ZIA API: List firewall filtering rules
GET /api/v1/webApplicationRules

# ZIA API: List firewall rules
GET /api/v1/firewallRules

# Hit counts available in ZIA Admin Portal > Analytics > Firewall Insights
# NSS feed to SIEM for detailed per-rule analysis
```

## Troubleshooting

```bash
# ZIA: Check if traffic is being forwarded to Zscaler
# In ZIA Admin Portal: Logs > Web Logs / Firewall Logs
# Filter by source IP: 10.1.2.5

# ZPA: Check connector status
# ZPA Admin Portal: Dashboard > Connector Status

# App Connector diagnostic commands (on connector host)
zpa-connector-health-check

# NSS feed for raw log analysis via SIEM
```

## Common gotchas

- ZIA inspects internet egress only — east-west datacenter / VPC traffic still needs a traditional firewall.
- **SSL Inspection** (highly recommended for meaningful security) requires the Zscaler intermediate CA on endpoints; missing this breaks HTTPS for users and silently downgrades inspection.
- GRE / IPsec tunnels to ZIA require a public-IP whitelist — branches behind dynamic IPs need IKEv2 with the Cloud Connector or Client Connector instead.
- **ZPA App Connector** is the chokepoint for private apps; under-sized connectors cause SSL handshake timeouts visible only in connector logs (not in the user-facing 403).
- Geographic policy enforcement is by user-location, not by IP geolocation — VPN users appear "in the location where Zscaler resolves them", which differs from on-prem firewall behavior.
- "Default allow" policies in ZIA firewall ship enabled — review the default Firewall Filtering Policy carefully before adding custom rules; rule precedence can hide your intent.

## See also

- [[Topics/Firewall/Firewall-Config-Generation|Firewall Config Generation]]
- [[Topics/Firewall/Firewall-Hardening|Firewall Hardening]]
- [[Topics/Firewall/Firewall-Policy-Design|Firewall Policy Design]]
- [[Topics/Firewall/Firewall-Rule-Audit|Firewall Rule Audit]]
- [[Topics/Firewall/Firewall-Troubleshooting|Firewall Troubleshooting]]
- [[Topics/Firewall/Firewall-Vendor-Migration|Firewall vendor migration]] (multi-vendor)

---
Analysis only — verify against vendor documentation before applying.
