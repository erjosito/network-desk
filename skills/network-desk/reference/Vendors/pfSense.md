---
type: vendor
name: pfSense
vendor_kind: oss-fw
roles: [firewall, router]
tags: [firewall, vendor, pfsense, oss-fw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# pfSense

## Overview

Open-source firewall built on **FreeBSD**, originally a 2004 fork of m0n0wall. Maintained by **Netgate** (US). Two editions:

- **CE (Community Edition)** — free, community-supported.
- **Plus** (formerly pfSense Plus) — included with Netgate hardware appliances and via paid TAC subscription; adds features like ZFS boot, advanced WireGuard, and Coreboot support.

Web UI is PHP/jQuery-based; configuration in a single `config.xml`. Plugin ecosystem (`pkg`) covers IDS (**Snort / Suricata**), VPN, traffic shaping, monitoring. Best fit: same niches as OPNsense — small business, branch, homelab, lab. Choose pfSense over OPNsense for: Netgate hardware support, larger commercial install base, or familiarity. Choose OPNsense over pfSense for: newer UI, faster release cadence, fully open source-licensed codebase. Like OPNsense, commonly deployed as combined **edge router + firewall + VPN** on a single box (FRR for dynamic routing; Snort/Suricata; OpenVPN/WireGuard).

## Config generation

```bash
# Quick rule via easyrule
easyrule pass dmz tcp 10.1.2.0/24 10.1.3.0/24 3306

# config.xml rule structure (for reference)
# Add to <filter> section:
```

```xml
<rule>
  <type>pass</type>
  <interface>opt1</interface> <!-- DMZ interface -->
  <ipprotocol>inet</ipprotocol>
  <protocol>tcp</protocol>
  <source>
    <address>10.1.2.0/24</address>
  </source>
  <destination>
    <address>10.1.3.0/24</address>
    <port>3306</port>
  </destination>
  <descr>Allow DMZ web servers to MySQL</descr>
  <log/>
</rule>
```

```bash
# After config.xml edit, reload filter rules
pfctl -f /tmp/rules.debug   # or via GUI: apply changes
/etc/rc.filter_configure
```

## HA

```bash
# Primary node: System > High Availability
# State Synchronization Settings:
#   Synchronize States: checked
#   Synchronize Interface: SYNC (dedicated HA interface)
#   pfsync Synchronize Peer IP: 10.0.99.2

# XMLRPC Sync:
#   Synchronize Config to IP: 10.0.99.2
#   Remote System Username: admin
#   Remote System Password: <password>
#   Select: Toggle All (sync firewall rules, NAT, aliases, etc.)

# Create CARP VIPs on both WAN and LAN:
#   Firewall > Virtual IPs > Add
#   Type: CARP, Interface: WAN, Address: <public-VIP>
#   VHID: 1, Advertising Frequency: Base=1, Skew=0 (primary)
```

## Policy design

- Similar to OPNsense — zones map to interfaces (LAN, WAN, OPT1, OPT2, etc.).
- Rules are per-interface, processed top-down, first-match wins.
- Floating rules for cross-interface policies.
- Application-layer filtering via Snort/Suricata packages (IDS/IPS mode, not inline app policy).

## Hardening

- **Disable the default anti-lockout rule** (System > Advanced > Admin Access > uncheck anti-lockout) after creating an explicit management rule.
- **Harden web GUI**: bind to LAN/management interface only, use HTTPS with a trusted certificate, change default port.
- **SSH hardening**: disable password authentication, use SSH keys, restrict to management subnet via firewall rules.
- Disable **unused services** (UPnP, mDNS, IGMP Proxy if not needed).
- Enable **bogon and RFC1918 blocking** on WAN (Interfaces > WAN > Block private/bogon networks).
- Configure **pfBlockerNG** for IP reputation and DNS blocklists.
- Disable **DNS Resolver** on WAN if not providing external DNS.

## Logging

```bash
# filterlog format (same as OPNsense — pf-based)
# View live firewall log
clog /var/log/filter.log | grep ",block,"

# GUI: Status > System Logs > Firewall
# Filter by action, interface, source/dest

# Syslog forwarding: Status > System Logs > Settings > Remote Logging Options
# Enable remote syslog, set remote log server IP, select facilities
```

## Rule audit

```bash
# Show loaded rules with hit counts
pfctl -vsr

# Show state table
pfctl -ss

# Export config via GUI: Diagnostics > Backup & Restore
# Or via xmlrpc / config.xml directly

# Per-rule counters visible in GUI: Firewall > Rules > hit count column
# easyrule utility for quick rule inspection context
```

## Troubleshooting

```bash
# Packet capture: Diagnostics > Packet Capture
# Or CLI:
tcpdump -i em0 host 10.1.2.5 and host 10.1.3.10 -nn

# Show loaded rules
pfctl -sr

# Show states
pfctl -ss | grep "10.1.2.5"

# Show pf counters
pfctl -si

# Show NAT rules
pfctl -sn

# Check filter log for drops
clog /var/log/filter.log | grep "10.1.2.5"

# Verify gateway status
netstat -rn
```

## Common gotchas

- CE vs Plus diverges over time — features and patches land in Plus first; back up `config.xml` before flipping editions.
- The "Apply changes" banner persists across pages — clicking through quickly can apply a partial config; always review the diff before applying.
- HA via CARP requires identical hardware (CPU steps, NIC chipsets), matching versions, and a dedicated `pfsync` interface — mismatches cause split-brain failovers.
- **Snort** and **Suricata** packages share the same web UI conventions but use DIFFERENT rule engines — switching between them keeps stale state in `/var/db/snort` (or `/var/db/suricata`).
- WireGuard config was rewritten in CE 2.6+ — older configs may need manual re-import after upgrade.
- DNS Resolver (Unbound) and DNS Forwarder (dnsmasq) both want port 53 — only one can listen on a given interface; default config enables Resolver, but enabling Forwarder without disabling Resolver silently breaks DNS.

## See also

- [[Topics/Firewall/Firewall-Config-Generation|Firewall Config Generation]]
- [[Topics/Firewall/Firewall-HA-Design|Firewall HA Design]]
- [[Topics/Firewall/Firewall-Hardening|Firewall Hardening]]
- [[Topics/Firewall/Firewall-Log-Analysis|Firewall Log Analysis]]
- [[Topics/Firewall/Firewall-Policy-Design|Firewall Policy Design]]
- [[Topics/Firewall/Firewall-Rule-Audit|Firewall Rule Audit]]
- [[Topics/Firewall/Firewall-Troubleshooting|Firewall Troubleshooting]]
- [[Topics/Firewall/Firewall-Vendor-Migration|Firewall vendor migration]] (multi-vendor)

---
Analysis only — verify against vendor documentation before applying.
