---
type: vendor
name: Cisco ASA / Firepower (FTD)
vendor_kind: ngfw
roles: [firewall]
tags: [firewall, vendor, cisco, cisco-asa, cisco-ftd, firepower, ngfw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# Cisco ASA / Firepower (FTD)

## Overview

Cisco's two-product firewall line:

- **ASA (Adaptive Security Appliance)** — CLI-driven, ACL + protocol-inspection-based, deprecated for new NGFW features but still widely deployed in legacy estates.
- **FTD (Firepower Threat Defense)** — NGFW combining the ASA's L3/L4 fundamentals with the **Snort**-based NGIPS engine, managed via **FMC (Firepower Management Center)** on-prem or cloud-based **CDO (Cisco Defense Orchestrator)**.

Physical hardware: ASA 5500-X (legacy) and **Firepower 1000/2100/3100/4100/9300** series. Virtual: **ASAv** and **FTDv** for cloud / private cloud. Cisco is actively migrating customers off ASA toward FTD; new features land on FTD only.

## Config generation

```
! Address objects
object network DMZ_WebServers
 subnet 10.1.2.0 255.255.255.0
object network DB_Servers
 subnet 10.1.3.0 255.255.255.0

! Service object
object service MySQL
 service tcp destination eq 3306

! Access list
access-list DMZ_to_DB_ACL extended permit tcp object DMZ_WebServers object DB_Servers object MySQL log

! Apply to interface
access-group DMZ_to_DB_ACL in interface dmz
```

## Policy design

- ASA: security levels per interface (0=untrust, 100=trust); nameif assigns zone names.
- FTD: security zones defined in FMC; policies reference zone pairs.
- ACLs bound to interfaces via `access-group`.

## Hardening

- Set `no asdm history enable` if ASDM is not used.
- Enable `threat-detection statistics access-list` for ACL hit monitoring.
- Set `service-policy global_policy global` with inspections for critical protocols.
- Enable **LINA** and **Snort** logging on FTD.
- Disable **unused interfaces** — `shutdown` state.
- Configure `ssh stricthostkeycheck` and limit SSH access via `ssh <ip> <mask> <iface>`.
- Ref: [CIS Cisco Firewall Benchmark](https://www.cisecurity.org/benchmark/cisco).

## Logging

```bash
# Syslog message IDs for denied traffic
# ASA-4-106023: Deny <protocol> src <iface>:<ip>/<port> dst <iface>:<ip>/<port>
# ASA-2-106001: Inbound TCP connection denied

# Show denied connections
ASA# show logging | include 106023
ASA# show threat-detection statistics top access-list
```

## Rule audit

```bash
# ASA: Show access-lists with hit counts
ASA# show access-list
# Output includes hitcnt=<N> per ACE

# Clear hit counts to start fresh observation
ASA# clear access-list <name> counters

# FTD via FMC REST API
GET /api/fmc_config/v1/domain/{domainUUID}/policy/accesspolicies/{policyId}/accessrules

# Packet tracer to simulate flow
ASA# packet-tracer input <iface> tcp <src> <sport> <dst> <dport>
```

## Policy testing

```bash
packet-tracer input INSIDE tcp 10.1.1.5 12345 203.0.113.10 443 detailed
# Returns: every phase (ACL, NAT, inspect, route) with allow/drop verdict
```

FTD adds **rule hit count** in FMC and a **rule comparison tool** between policy versions.

## Troubleshooting

```bash
# Packet tracer (simulates full packet path)
ASA# packet-tracer input dmz tcp 10.1.2.5 12345 10.1.3.10 3306

# Show connection table
ASA# show conn address 10.1.2.5

# Capture on interface
ASA# capture CAP1 interface dmz match tcp host 10.1.2.5 host 10.1.3.10 eq 3306
ASA# show capture CAP1

# Show NAT translations
ASA# show xlate | include 10.1.2.5

# ASP drop reasons
ASA# show asp drop
```

## Common gotchas

- ASA and FTD share the same Firepower hardware but **CANNOT** run at the same time on Firepower platforms — switching modes requires re-imaging and loses config.
- ASA "global access-list" with `any` keywords can bypass interface-level filtering — always scope ACLs to interfaces or use Modular Policy Framework (MPF).
- FTD policy push via FMC is asynchronous; failed deployments show as warnings — monitor the deployment history and re-push.
- **Snort 2 vs Snort 3** — FTD 6.7+ supports both; rule syntax differs and not all features are available in Snort 2; pick at FMC level and commit globally.
- HA failover on ASA requires matching ASA versions AND identical interface assignments — `failover lan unit primary` and `failover key` mismatches silently break failover.
- NAT order of operations is non-obvious — **Auto NAT** (object NAT) evaluates before **Manual NAT** (twice NAT) regardless of CLI order; `show nat` is essential for debugging.

## See also

- [[Topics/Firewall/Firewall-Config-Generation|Firewall Config Generation]]
- [[Topics/Firewall/Firewall-Hardening|Firewall Hardening]]
- [[Topics/Firewall/Firewall-Log-Analysis|Firewall Log Analysis]]
- [[Topics/Firewall/Firewall-Policy-Design|Firewall Policy Design]]
- [[Topics/Firewall/Firewall-Policy-Testing|Firewall Policy Testing]]
- [[Topics/Firewall/Firewall-Rule-Audit|Firewall Rule Audit]]
- [[Topics/Firewall/Firewall-Troubleshooting|Firewall Troubleshooting]]
- [[Topics/Firewall/Firewall-Vendor-Migration|Firewall vendor migration]] (multi-vendor)

---
Analysis only — verify against vendor documentation before applying.
