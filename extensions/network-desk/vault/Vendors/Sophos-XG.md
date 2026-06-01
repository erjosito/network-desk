---
type: vendor
name: Sophos XG / XGS
vendor_kind: ngfw
roles: [firewall]
tags: [firewall, vendor, sophos, sophos-xg, sophos-xgs, ngfw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# Sophos XG / XGS

## Overview

Sophos Firewall (rebranded from **Sophos XG** in 2020 under the "Sophos Firewall OS / SFOS" naming, still commonly called XG in the field). Available as **XG/XGS** hardware appliances and Sophos Firewall virtual appliances for VMware/Hyper-V/KVM/AWS/Azure. Built on the **Xstream** architecture with TLS 1.3 deep packet inspection and integrated threat intelligence. Managed locally via web UI or centrally via **Sophos Central** (cloud SaaS console). Key differentiator: **Synchronized Security** — the firewall talks to Sophos endpoint (Intercept X) to isolate compromised hosts via a "heartbeat" status, automating containment without SIEM glue.

## Config generation

```
# Via device console
set firewall rule add
  name "Allow-DMZ-to-DB-MySQL"
  position top
  srczone DMZ
  dstzone Database
  src_net "10.1.2.0/255.255.255.0"
  dst_net "10.1.3.0/255.255.255.0"
  service "MySQL (TCP 3306)"
  action accept
  log enable
```

```json
// REST API equivalent
// POST /webconsole/APIController
{
  "reqxml": "<Request><Set operation='add'><FirewallRule><Name>Allow-DMZ-to-DB-MySQL</Name><SourceZones><Zone>DMZ</Zone></SourceZones><DestinationZones><Zone>Database</Zone></DestinationZones><SourceNetworks><Network>10.1.2.0/24</Network></SourceNetworks><DestinationNetworks><Network>10.1.3.0/24</Network></DestinationNetworks><Services><Service>MySQL</Service></Services><Action>Accept</Action><LogTraffic>Enable</LogTraffic></FirewallRule></Set></Request>"
}
```

## Policy design

- Zones are interface groupings (LAN, WAN, DMZ, VPN, Wi-Fi, custom).
- Firewall rules reference source/destination zones.
- Application control and IPS profiles attach to rules.

## Hardening

- Enable **Heartbeat** (Synchronized Security) to integrate with Sophos endpoint agents.
- Set **web admin port** to non-default; disable HTTP access.
- Enable **IPS** and **Application Control** on firewall rules.
- Configure **device access** to restrict management protocols per zone.
- Enable **ATP** (Advanced Threat Protection) for C&C callback detection.

## Rule audit

```bash
# CLI: Show firewall rules
console> show firewall-rule all

# REST API: List firewall rules
GET /webconsole/APIController?reqxml=
<Request>
  <Login><Username>admin</Username><Password>pass</Password></Login>
  <Get><FirewallRule></FirewallRule></Get>
</Request>

# Log Viewer in web GUI for hit counts per rule
```

## Troubleshooting

```bash
# Packet capture (device console)
console> tcpdump -i any host 10.1.2.5

# Connection tracking
console> conntrack -L | grep 10.1.2.5

# Log viewer: Monitor & Analyze > Log Viewer
# Filter: src=10.1.2.5 AND dst=10.1.3.10
```

## Common gotchas

- Firewall rules are sequence-numbered and processed top-down — moving rules via Sophos Central can renumber and silently change precedence; verify with the rule-hit counter.
- TLS inspection (HTTPS decryption) requires importing the Sophos CA on clients; legacy apps with cert-pinning will break and need exclusions.
- Sophos Central management requires the firewall to reach `*.sophos.com` outbound on 443 — restrictive egress policies can disconnect the device from its own management console.
- **Synchronized Security** "heartbeat" requires endpoint enrollment in the same Sophos Central tenant — the feature looks enabled but silently no-ops without enrolled endpoints.
- Web filtering policy is split into "web policies" (categories) and "user activities" — UI surfaces them separately, leading to overlap and shadow rules.
- HA active/passive cluster requires identical hardware models and SFOS versions — mixed-model HA is unsupported and won't form a cluster.

## See also

- [[Topics/Firewall/Firewall-Config-Generation|Firewall Config Generation]]
- [[Topics/Firewall/Firewall-Hardening|Firewall Hardening]]
- [[Topics/Firewall/Firewall-Policy-Design|Firewall Policy Design]]
- [[Topics/Firewall/Firewall-Rule-Audit|Firewall Rule Audit]]
- [[Topics/Firewall/Firewall-Troubleshooting|Firewall Troubleshooting]]
- [[Topics/Firewall/Firewall-Vendor-Migration|Firewall vendor migration]] (multi-vendor)

---
Analysis only — verify against vendor documentation before applying.
