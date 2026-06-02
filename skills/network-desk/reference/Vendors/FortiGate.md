---
type: vendor
name: FortiGate (Fortinet)
vendor_kind: ngfw
roles: [firewall, sd-wan]
tags: [firewall, vendor, fortinet, fortigate, fortios, ngfw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# FortiGate (Fortinet)

## Overview

Fortinet's NGFW running FortiOS, shipped on FortiGate hardware (40F branch through 7000 series enterprise) and **FortiGate-VM** virtual appliances for all major hypervisors and clouds. Physical models include a custom **Security Processing Unit (SPU)** ASIC for line-rate inspection. Central to the **Security Fabric** ecosystem: FortiAnalyzer (logs), FortiManager (config), FortiSandbox (sandboxing), FortiClient (ZTNA endpoint), FortiSwitch/FortiAP (LAN/WLAN). Licensing model: **FortiCare** hardware support + **FortiGuard** security subscriptions (AV, IPS, web filtering, app control, DLP, IoT) — many features require the corresponding subscription to enforce. FortiOS also delivers a leading **SD-WAN** implementation on the same image — overlay tunnels with central path selection via FortiManager / Security Fabric Orchestrator. Many FortiGate deployments are SD-WAN-justified rather than firewall-justified.

## Config generation

```
# Address objects
config firewall address
    edit "DMZ_WebServers"
        set subnet 10.1.2.0 255.255.255.0
    next
    edit "DB_Servers"
        set subnet 10.1.3.0 255.255.255.0
    next
end

# Service object
config firewall service custom
    edit "MySQL"
        set protocol TCP/UDP/SCTP
        set tcp-portrange 3306
    next
end

# Firewall policy
config firewall policy
    edit 0
        set name "Allow-DMZ-to-DB-MySQL"
        set srcintf "dmz"
        set dstintf "database"
        set srcaddr "DMZ_WebServers"
        set dstaddr "DB_Servers"
        set service "MySQL"
        set action accept
        set logtraffic all
        set comments "Allow DMZ web servers to MySQL"
    next
end
```

## Policy design

- Zones created via `config system zone`; interfaces assigned to zones.
- Policy: `config firewall policy` with `srcintf` / `dstintf` referencing zones.
- Application control profile attached to policies for L7 inspection.

## Hardening

- Enable **UTM profiles** (AV, IPS, Web Filter, App Control) on all allowed traffic policies.
- Set `set admin-sport` to a non-default HTTPS port for management.
- Disable `admin-telnet` and `admin-http`.
- Enable **two-factor authentication** for admin accounts (`config system admin` → `set two-factor`).
- Configure **trusted hosts** for admin accounts to restrict management source IPs.
- Enable `set strong-crypto enable` under `config system global`.
- Disable **auto-install** and **USB auto-install** for firmware/config.
- Ref: [CIS Fortinet FortiGate Benchmark](https://www.cisecurity.org/benchmark/fortinet).

## Logging

```bash
# CLI: Show traffic log
FGT# execute log filter category 0
FGT# execute log filter field action deny
FGT# execute log display

# FortiAnalyzer SQL query
SELECT src, dst, dstport, action, COUNT(*) as cnt
FROM $log
WHERE action='deny' AND logtime > NOW() - INTERVAL 24 HOUR
GROUP BY src, dst, dstport, action
ORDER BY cnt DESC
LIMIT 20
```

## Rule audit

```bash
# List firewall policies
# config firewall policy
FGT# show firewall policy

# Hit counts
FGT# diagnose firewall iprope list

# Per-policy hit counts (FortiOS 7.x)
FGT# get firewall policy <policy-id> | grep -i "bytes\|packets\|hit"

# Export via REST API
curl -k "https://<fortigate>/api/v2/cmdb/firewall/policy" \
  -H "Authorization: Bearer <token>"
```

## Policy testing

```bash
# CLI — predict matched policy for a 5-tuple
diagnose firewall policy lookup vd root \
  src-ip 10.1.1.5 dst-ip 203.0.113.10 dst-port 443 protocol 6 ingress-intf port1

# Live packet trace with policy verdict
diagnose debug enable
diagnose debug flow filter addr 10.1.1.5
diagnose debug flow trace start 10
```

FortiAnalyzer ships a **policy hit count report** and a **rule shadowing detector**.

## Troubleshooting

```bash
# Policy lookup
FGT# diagnose firewall iprope lookup <src-ip> <dst-ip> <proto> <dport>

# Sniffer (packet capture)
FGT# diagnose sniffer packet any "host 10.1.2.5 and host 10.1.3.10" 4 0 l

# Session table
FGT# diagnose sys session list | grep "10.1.2.5"

# Debug flow (shows policy evaluation in real-time)
FGT# diagnose debug flow filter addr 10.1.2.5
FGT# diagnose debug flow trace start 100
FGT# diagnose debug enable
# ... reproduce traffic ...
FGT# diagnose debug disable
```

## Common gotchas

- FortiGate uses two policy abstractions — **firewall policy** (legacy IPv4/IPv6 separated; unified in FortiOS 6.4+) and the **policy package** in FortiManager; mixing them across managed devices causes diff drift.
- Default route via SD-WAN member with a higher metric will silently swallow traffic if SD-WAN performance SLA fails — define explicit fallback routes.
- HA cluster (active/passive) requires identical hardware, firmware, and license — mismatched HA members get stuck `out-of-sync` and stop failing over silently.
- "Allow" policies without **deep SSL inspection** miss most threats — full inspection requires CA cert distribution and breaks pinned-cert apps (banking, Teams, some IoT).
- FortiOS upgrades occasionally renumber or rename CLI objects — always review release notes and back up config before major version jumps.
- Per-VDOM (Virtual Domain) resource limits can starve a tenant's session table — monitor with `diagnose sys session list` per VDOM.

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
