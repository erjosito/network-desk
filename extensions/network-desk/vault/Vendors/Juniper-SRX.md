---
type: vendor
name: Juniper SRX
vendor_kind: ngfw
roles: [firewall, router]
tags: [firewall, vendor, juniper, juniper-srx, ngfw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# Juniper SRX

## Overview

Juniper Networks' NGFW running **Junos OS**, shipped on SRX-series hardware (SRX300 branch through SRX5800 datacenter) and **vSRX** virtual appliances. Zone-based policies (`from-zone trust to-zone untrust`) with a hierarchical Junos config (`set security policies ...`). UTM features (AV, web filtering, anti-spam, content filtering) require **Sky ATP** / **Juniper Cloud Workload Protection** subscriptions. Managed centrally via **Junos Space Security Director** or **Mist AI Cloud**. Commit-confirm (`commit confirmed 5`) enables safe rollback if a change loses connectivity within N minutes — a major operational differentiator for remote work. SRX is a **Junos services gateway** — Junos is a full routing OS (BGP/OSPF/MPLS/IS-IS) and many SRX deployments combine firewall with router-grade routing rather than purely firewalling.

## Config generation

```
# Address book entries
set security zones security-zone DMZ address-book address DMZ_WebServers 10.1.2.0/24
set security zones security-zone Database address-book address DB_Servers 10.1.3.0/24

# Application (or use junos-mysql if predefined)
set applications application MySQL protocol tcp destination-port 3306

# Security policy
set security policies from-zone DMZ to-zone Database policy Allow-DMZ-to-DB-MySQL match source-address DMZ_WebServers destination-address DB_Servers application MySQL
set security policies from-zone DMZ to-zone Database policy Allow-DMZ-to-DB-MySQL then permit
set security policies from-zone DMZ to-zone Database policy Allow-DMZ-to-DB-MySQL then log session-close

# Commit
commit
```

## Policy design

- Native zone model: `set security zones security-zone <name> interfaces <iface>`.
- Policies: `set security policies from-zone <src> to-zone <dst> policy <name>`.
- AppSecure for application identification.

## Hardening

- Enable **screen** profiles for flood protection, port scanning detection, and IP spoofing.
- Configure `set security zones security-zone <zone> screen <profile>`.
- Disable `set system services telnet` and `set system services finger`.
- Enable `set system login retry-options` for brute-force protection.
- Use `set security log mode stream` and forward to external SIEM.
- Ref: [CIS Juniper Benchmark](https://www.cisecurity.org/benchmark/juniper).

## Logging

```bash
# Show security log (on-box)
> show log messages | match RT_FLOW_SESSION_DENY
> show security log | match DENY

# Structured syslog (stream mode)
set security log mode stream
set security log stream <name> host <siem-ip>
set security log stream <name> format sd-syslog   # structured data
```

## Rule audit

```bash
# Show security policies with hit counts
> show security policies hit-count

# Detailed policy listing
> show security policies detail

# Export config
> show configuration security policies | display json

# Unused policies (zero hit count)
> show security policies hit-count | match " 0$"
```

## Troubleshooting

```bash
# Policy match test
> show security match-policies from-zone DMZ to-zone Database source-ip 10.1.2.5 destination-ip 10.1.3.10 protocol tcp destination-port 3306

# Flow session table
> show security flow session source-prefix 10.1.2.5 destination-prefix 10.1.3.10

# Packet capture (datapath debugging)
> monitor traffic interface ge-0/0/1 matching "host 10.1.2.5 and host 10.1.3.10"

# Flow trace (debug)
> set security flow traceoptions file flow-trace
> set security flow traceoptions flag basic-datapath
> set security flow traceoptions packet-filter filter1 source-prefix 10.1.2.5
# ... reproduce traffic ...
> show log flow-trace
```

## Common gotchas

- Junos "global" policy (`set security policies global ...`) is evaluated **after** zone-pair policies — easy to misconfigure precedence; use `show security match-policies` to test a hypothetical flow.
- Commit on SRX is two-phase (candidate → active) — uncommitted changes don't take effect; `commit check` validates without applying; **always** use `commit confirmed` for remote changes.
- **Chassis cluster** (HA pair) requires `cluster-id` matched on both nodes + a control link (`fxp1`/`em0`); `set chassis cluster cluster-id 0` *disables* clustering — easy to wipe a cluster by accident.
- Application identification (**AppID**) requires a separate subscription and signature update — without it, app-aware rules silently fall back to port matching.
- Logging via syslog needs `set security log mode stream` for high-volume scenarios — `mode event` writes to local disk and silently fills it on busy gateways.
- vSRX in cloud (AWS/Azure) doesn't support all hardware features (no chassis cluster on AWS until the 3-NIC layout; cloud HA uses ELB / Azure LB instead).

## See also

- [[Topics/Firewall/Firewall-Config-Generation|Firewall Config Generation]]
- [[Topics/Firewall/Firewall-Hardening|Firewall Hardening]]
- [[Topics/Firewall/Firewall-Log-Analysis|Firewall Log Analysis]]
- [[Topics/Firewall/Firewall-Policy-Design|Firewall Policy Design]]
- [[Topics/Firewall/Firewall-Rule-Audit|Firewall Rule Audit]]
- [[Topics/Firewall/Firewall-Troubleshooting|Firewall Troubleshooting]]
- [[Topics/Firewall/Firewall-Vendor-Migration|Firewall vendor migration]] (multi-vendor)

---
Analysis only — verify against vendor documentation before applying.
