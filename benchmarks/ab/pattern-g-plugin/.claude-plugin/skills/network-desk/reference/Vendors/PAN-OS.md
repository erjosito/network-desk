---
type: vendor
name: PAN-OS (Palo Alto Networks)
vendor_kind: ngfw
roles: [firewall, sd-wan]
tags: [firewall, vendor, palo-alto, pan-os, ngfw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# PAN-OS (Palo Alto Networks)

## Overview

Palo Alto Networks' purpose-built NGFW OS, shipped on PA-series hardware (PA-220 small branch through PA-7000-series datacenter chassis) and **VM-Series** virtual appliances for cloud, KVM/ESXi/Hyper-V, and Kubernetes (CN-Series). Zone-based architecture (`from <zone> to <zone>`) with three identity layers — **App-ID** (application identification independent of port/protocol), **User-ID** (user-based policy via AD/LDAP/SAML/Cloud Identity Engine), and **Content-ID** (URL filtering, antivirus, file blocking, WildFire sandboxing). Centrally managed via **Panorama**; subscriptions (Threat Prevention, URL Filtering, WildFire, DNS Security, GlobalProtect, SD-WAN, IoT Security) are licensed separately and must be active for the corresponding security profiles to enforce. PAN-OS itself delivers SD-WAN as a licensed subscription on the same NGFW; Palo Alto Networks also sells **Prisma SD-WAN** (the ex-CloudGenix product) as a separate cloud-managed product line — that's not this page.

## Config generation

```
# Address objects
set address DMZ_WebServers ip-netmask 10.1.2.0/24
set address DB_Servers ip-netmask 10.1.3.0/24

# Service object
set service MySQL protocol tcp port 3306

# Security policy rule
set rulebase security rules "Allow-DMZ-to-DB-MySQL" from DMZ to Database source DMZ_WebServers destination DB_Servers application mysql service MySQL action allow log-end yes profile-setting group default-security-profiles
set rulebase security rules "Allow-DMZ-to-DB-MySQL" description "Allow DMZ web servers to MySQL"

# Commit
commit
```

## Policy design

- Native zone-based architecture: `set network zone <name>`.
- Policies: `set rulebase security rules <name> from <zone> to <zone>`.
- App-ID replaces port-based rules for supported applications.

## Hardening

- Enable **Security Profiles** on all allow rules (AV, Anti-Spyware, Vulnerability Protection, URL Filtering, WildFire).
- Configure **Zone Protection Profiles** for flood protection, packet-based attacks, and reconnaissance.
- Enable **User-ID** only on trusted zones — never on untrust.
- Restrict management access via **Permitted IP Addresses** on the management interface.
- Disable **unused GlobalProtect portals/gateways**.
- Enable **log forwarding profiles** on all rules — forward to Panorama/syslog/SIEM.
- Ref: [CIS Palo Alto Networks Firewall Benchmark](https://www.cisecurity.org/benchmark/palo_alto_networks).

## Logging

```bash
# CLI: Show traffic log (last 100 denied)
> show log traffic direction equal backward action equal deny last 100

# Panorama / Log query
( action eq deny ) and ( receive_time in last-24-hrs )
| sort by repeatcnt desc

# Threat log
> show log threat last 50
( severity geq high ) and ( receive_time in last-24-hrs )
```

## Rule audit

```bash
# Show running security policy
> show running security-policy

# Rule hit counts
> show rule-use rule-base security type used
> show rule-use rule-base security type unused

# Detailed rule usage
> show running rule-use rule-base security json

# Export via API
curl -k "https://<firewall>/api/?type=config&action=show&xpath=/config/devices/entry/vsys/entry/rulebase/security" \
  -H "X-PAN-KEY: <api-key>"
```

## Policy testing

```bash
# CLI — query "what policy would apply to this flow?"
test security-policy-match \
  from trust to untrust source 10.1.1.5 destination 203.0.113.10 \
  destination-port 443 protocol 6 application ssl

# Returns: matched rule name, action, profile group — without sending any packet
```

For commit-time validation use **Best Practice Assessment (BPA)** and **policy optimizer** (Panorama → Optimizer tab) which flags unused, redundant, and overly permissive rules.

## Troubleshooting

```bash
# Test security policy match
> test security-policy-match source 10.1.2.5 destination 10.1.3.10 protocol 6 destination-port 3306 from DMZ to Database

# Packet capture (on dataplane)
> debug dataplane packet-diag set filter match source 10.1.2.5 destination 10.1.3.10
> debug dataplane packet-diag set capture stage receive file rx.pcap
> debug dataplane packet-diag set capture stage transmit file tx.pcap
> debug dataplane packet-diag set capture on

# Session table
> show session all filter source 10.1.2.5 destination 10.1.3.10

# Global counters (check for drops)
> show counter global filter severity drop delta yes
```

## Common gotchas

- "Allow any application" rules silently bypass App-ID — pin applications explicitly and use the **Policy Optimizer** to graduate port-based rules to App-ID rules.
- Committing a config locks the device — concurrent admin commits queue and can fail; for multi-admin shops use **Panorama** + **commit groups** (or partial commits).
- VM-Series licensing is tied to the VM's UUID/CPU-ID — vMotion / resize can invalidate licenses; use the **Software NGFW** flex-licensing model for cloud-native flexibility.
- HA active/passive (HA1 control + HA2 data) requires sync interfaces with low latency (<10 ms RTT) — split-brain at higher RTT is a classic outage cause.
- **Security Profiles** (AV, Anti-Spyware, Vulnerability, URL, WildFire, File Blocking) are NOT applied by default — every allow rule needs an explicit profile group, or threats pass through unimpeded.
- Decryption (SSL Forward Proxy) requires a CA cert pushed to clients; missing this breaks browsing of HSTS-enabled sites and most modern SaaS.

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
