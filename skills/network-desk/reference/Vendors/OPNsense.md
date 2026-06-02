---
type: vendor
name: OPNsense
vendor_kind: oss-fw
roles: [firewall, router]
tags: [firewall, vendor, opnsense, oss-fw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# OPNsense

## Overview

Open-source firewall — a 2014 fork of pfSense — running on **HardenedBSD** (a security-hardened FreeBSD derivative). Free; commercial support via the Dutch vendor **Deciso**. Web UI based on Phalcon PHP framework — faster and more modern than pfSense's MVC UI. Plugin ecosystem covers IDS (**Suricata**), VPN (**OpenVPN / WireGuard / IPsec**), captive portal, traffic shaping, and routing protocols (**FRR** for OSPF/BGP). Releases follow a 6-month cadence (`MAJOR.1` = January, `MAJOR.7` = July; e.g. 24.1, 24.7). Best fit: small business edge, lab / homelab, branch office. Not suited for high-throughput datacenter (no ASIC acceleration; CPU-bound on inspection). Commonly deployed as a combined **edge router + firewall + VPN concentrator + IDS** on a single box (FRR provides BGP/OSPF; OpenVPN/WireGuard/IPsec; Suricata).

## Config generation

```bash
# Create alias for source
curl -X POST -u "<key>:<secret>" \
  "https://<opnsense>/api/firewall/alias/addItem" \
  -d '{"alias":{"name":"DMZ_WebServers","type":"network","content":"10.1.2.0/24","description":"DMZ web server subnet"}}'

# Create alias for destination
curl -X POST -u "<key>:<secret>" \
  "https://<opnsense>/api/firewall/alias/addItem" \
  -d '{"alias":{"name":"DB_Servers","type":"network","content":"10.1.3.0/24","description":"Database server subnet"}}'

# Create firewall filter rule
curl -X POST -u "<key>:<secret>" \
  "https://<opnsense>/api/firewall/filter/addRule" \
  -d '{"rule":{"enabled":"1","action":"pass","interface":"dmz","direction":"in","ipprotocol":"inet","protocol":"TCP","source_net":"DMZ_WebServers","destination_net":"DB_Servers","destination_port":"3306","description":"Allow DMZ web servers to MySQL","log":"1"}}'

# Apply changes
curl -X POST -u "<key>:<secret>" \
  "https://<opnsense>/api/firewall/filter/apply"
```

## HA

```bash
# Master node: System > High Availability > Settings
# - Synchronize Interface: em2 (dedicated HA link)
# - pfsync Synchronize Peer IP: 10.0.99.2
# - XMLRPC Sync: enable, target 10.0.99.2
# - Synchronize: Rules, Aliases, NAT, Virtual IPs, Users, DHCP

# Create CARP VIPs: Interfaces > Virtual IPs > Add
# Type: CARP, Interface: LAN, Address: 10.1.1.1/24
# VHID: 1, Advbase: 1, Advskew: 0 (master=0, backup=100)
```

## Policy design

- No native zone object — zones are represented by interface groupings and aliases.
- Rules are per-interface (floating rules for cross-interface policy).
- Zone-policy model achieved via: interface rules + floating rules for inter-zone control.
- Zenarmor plugin adds application-layer visibility and policy.

## Hardening

- **Disable the default anti-lockout rule** after configuring a proper management access rule (System > Settings > Administration > uncheck anti-lockout).
- **Harden the web GUI**: change default port, bind to management interface only, enforce HTTPS with a valid certificate.
- **SSH hardening**: disable password auth (`PasswordAuthentication no`), use key-based auth only, restrict to management interface via System > Settings > Administration.
- Enable **syslog forwarding** over TLS to external SIEM (System > Settings > Logging > Remote).
- Enable **bogon/RFC1918 blocking** on WAN interface (Interfaces > WAN > Block private/bogon networks).
- Disable **unused plugins and services** (VPN servers, DNS resolvers if not needed).
- Configure **rate limiting** via `max-src-conn` and `max-src-conn-rate` on rules.

## Logging

```bash
# filterlog format (parsed from /var/log/filter.log)
# Fields: rule-number,sub-rule,anchor,tracker,interface,reason,action,direction,...
# action field: pass or block

# View live log
clog /var/log/filter.log | grep ",block,"

# Syslog forwarding (System > Settings > Logging > Remote)
# Target: syslog server, UDP/TCP/TLS, facility local0-local7

# REST API: Fetch log entries
curl -u "<key>:<secret>" \
  "https://<opnsense>/api/diagnostics/firewall/log"
```

## Rule audit

```bash
# REST API: List filter rules
curl -u "<key>:<secret>" \
  "https://<opnsense>/api/firewall/filter/searchRule"

# Show loaded ruleset via pfctl
pfctl -sr          # show rules
pfctl -vsr         # verbose with hit counts (evaluations, packets, bytes)
pfctl -ss          # show state table

# Export config.xml for offline analysis
curl -u "<key>:<secret>" \
  "https://<opnsense>/api/core/backup/download/this"
```

## Policy testing

```bash
# nftables — dry-run policy evaluation
nft --check -f new-ruleset.nft

# iptables — log-only test (precede ACCEPT/DROP with LOG to a separate chain)
iptables -N TEST_LOG
iptables -A TEST_LOG -j LOG --log-prefix "TEST-RULE: "
iptables -I FORWARD 1 -s 10.1.1.5 -d 203.0.113.10 -p tcp --dport 443 -j TEST_LOG

# Verify hits in dmesg / journalctl, then promote
```

## Troubleshooting

```bash
# Packet capture via GUI: Interfaces > Diagnostics > Packet Capture
# Or via CLI:
tcpdump -i em1 host 10.1.2.5 and host 10.1.3.10 -nn

# Show pf state table for specific connection
pfctl -ss | grep "10.1.2.5"

# Show loaded rules (verify rule exists and order)
pfctl -sr | head -50
pfctl -vsr   # verbose — includes labels, hit counts

# Check if packet matches a rule
pfctl -sr -v | grep -A2 "10.1.3.0/24"

# Show pf info (counters, drops)
pfctl -si

# Show interface statistics
pfctl -sI -i em1

# Check NAT rules
pfctl -sn
```

## Common gotchas

- HardenedBSD upgrade path occasionally requires manual intervention — back up the config before any major-version upgrade.
- The Phalcon UI caches aggressively; "Apply" buttons can silently no-op after rapid edits — force-reload after major changes.
- WireGuard tunnel UI exposes interface vs peer settings inconsistently across versions; CLI (`wg-quick`) sometimes contradicts the UI — verify with `wg show`.
- Suricata IDS uses CPU heavily on small hardware — enabling on all interfaces with the full ET Open ruleset can saturate a 4-core box; tune ruleset before enabling on WAN.
- Firewall rules are evaluated per-interface in WAN → LAN → OPT order — **floating rules** apply across all interfaces and override interface-specific rules; easy source of "why is this packet allowed?" confusion.
- HA via CARP requires a dedicated sync interface AND identical interface names across nodes — renaming an interface on one node breaks pf state sync.

## See also

- [[Topics/Firewall/Firewall-Config-Generation|Firewall Config Generation]]
- [[Topics/Firewall/Firewall-HA-Design|Firewall HA Design]]
- [[Topics/Firewall/Firewall-Hardening|Firewall Hardening]]
- [[Topics/Firewall/Firewall-Log-Analysis|Firewall Log Analysis]]
- [[Topics/Firewall/Firewall-Policy-Design|Firewall Policy Design]]
- [[Topics/Firewall/Firewall-Policy-Testing|Firewall Policy Testing]]
- [[Topics/Firewall/Firewall-Rule-Audit|Firewall Rule Audit]]
- [[Topics/Firewall/Firewall-Troubleshooting|Firewall Troubleshooting]]
- [[Topics/Firewall/Firewall-Vendor-Migration|Firewall vendor migration]] (multi-vendor)

---
Analysis only — verify against vendor documentation before applying.
