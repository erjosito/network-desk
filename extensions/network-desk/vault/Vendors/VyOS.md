---
type: vendor
name: VyOS
vendor_kind: oss-fw
roles: [firewall, router]
tags: [firewall, vendor, vyos, oss-fw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# VyOS

## Overview

Open-source router/firewall — a 2013 fork of the discontinued Vyatta Core. CLI modeled on **Juniper Junos** (`configure` → `set` → `commit`) — appeals strongly to operators with Junos backgrounds. Two release tracks:

- **LTS** — commercial subscription required for official builds; full source is free under MIT-like licensing.
- **Rolling release** — free nightly builds, no SLA.

Strong fit for **virtualised routing** (BGP, OSPF, MPLS-over-VXLAN) in cloud and lab environments where a full Cisco/Juniper router would be cost-prohibitive. Built on **Debian** + **FRR** for routing protocols + **[[iptables-nftables|iptables / nftables]]** for firewalling. Common deployments: cloud-hub routers, multi-cloud route reflectors, lab CSR replacements, SD-WAN edge proof-of-concepts.

## Config generation

VyOS firewall syntax differs between 1.3 LTS (legacy `set firewall name` / `set zone-policy zone`) and newer 1.4/1.5 nftables-backed trains. For 1.4/1.5, prefer the `set firewall ipv4 name ...` rule-set form and current zone firewall syntax; verify the exact commands in the official zone-based firewall documentation before applying: https://docs.vyos.io/en/latest/configuration/firewall/zone.html

```bash
# VyOS 1.4/1.5-style IPv4 firewall rule-set template — verify current syntax for your release.
set firewall ipv4 name DMZ-to-DB default-action drop

# Allow MySQL rule
set firewall ipv4 name DMZ-to-DB rule 10 action accept
set firewall ipv4 name DMZ-to-DB rule 10 description "Allow DMZ web servers to MySQL"
set firewall ipv4 name DMZ-to-DB rule 10 source address 10.1.2.0/24
set firewall ipv4 name DMZ-to-DB rule 10 destination address 10.1.3.0/24
set firewall ipv4 name DMZ-to-DB rule 10 destination port 3306
set firewall ipv4 name DMZ-to-DB rule 10 protocol tcp
set firewall ipv4 name DMZ-to-DB rule 10 log enable

# Attach the rule-set to the DMZ → DATABASE zone transition using the current zone syntax for your release.
# Example form to verify in docs before use:
set firewall zone DATABASE from DMZ firewall name DMZ-to-DB

# Apply
commit
save
```

> For VyOS 1.3 LTS, the older `set firewall name ...` and `set zone-policy zone ...` examples may still apply. Always match examples to the running VyOS release.

## HA

```bash
# Configure VRRP on primary
set high-availability vrrp group LAN-GW interface eth1
set high-availability vrrp group LAN-GW vrid 10
set high-availability vrrp group LAN-GW virtual-address 10.1.1.1/24
set high-availability vrrp group LAN-GW priority 200
set high-availability vrrp group LAN-GW preempt true
set high-availability vrrp group LAN-GW preempt-delay 300

# Conntrack sync for session state
set service conntrack-sync accept-protocol tcp,udp,icmp
set service conntrack-sync interface eth2    # dedicated sync interface
set service conntrack-sync mcast-group 225.0.0.50
set service conntrack-sync disable-external-cache

commit
save
```

## Policy design

- Zone-policy model: `set zone-policy zone <name> interface <iface>`.
- Firewall rulesets assigned to zone transitions: `set zone-policy zone <name> from <zone> firewall name <ruleset>`.
- Default action per zone: `set zone-policy zone <name> default-action drop`.
- L3/L4 only — no native application awareness.

## Hardening

- **Restrict console access**: configure `set system login user <admin>` with strong password and SSH key authentication.
- **Disable unused services**: `delete service telnet`, `delete service dns forwarding` (if not needed), `delete service https` (if managing via SSH only).
- **SSH hardening**: `set service ssh port <non-default>`, `set service ssh disable-password-authentication`.
- **Default DROP policy**: `set firewall name <name> default-action drop` for all rulesets.
- **Rate limiting**: use `set firewall name <name> rule <n> recent count <N> time <seconds>` for SYN flood protection.
- **Connection tracking**: `set system conntrack timeout tcp established 7200` — tune timeouts.
- **Syslog**: `set system syslog host <server> facility all level info` — forward to SIEM.
- **NTP**: `set system ntp server <server>` — use authenticated NTP.

## Logging

```bash
# Syslog configuration for firewall logs
set system syslog host <siem-ip> facility kern level info
set system syslog host <siem-ip> protocol udp

# Firewall log prefix (in rules)
set firewall name WAN-IN rule 99 log enable
set firewall name WAN-IN rule 99 log-prefix "[WAN-IN-DENY] "

# View firewall log
$ show log | grep "\[WAN-IN-DENY\]"

# Monitor live
$ monitor firewall name WAN-IN
```

## Rule audit

```bash
# Show firewall rulesets
$ show firewall

# Show firewall statistics (hit counts)
$ show firewall name <ruleset-name> statistics

# Show specific rule details
$ show firewall name <ruleset-name> rule <n>

# Export configuration
$ show configuration commands | grep firewall
```

## Troubleshooting

```bash
# Show firewall rules and counters
$ show firewall name DMZ-to-DB

# Monitor traffic on interface
$ monitor traffic interface eth1 filter "host 10.1.2.5 and host 10.1.3.10"

# Show connection tracking
$ show conntrack table ipv4 | grep "10.1.2.5"

# Show session table filtered
$ show conntrack table ipv4 | match "10.1.2.5.*10.1.3.10"

# Show firewall statistics for specific ruleset
$ show firewall name DMZ-to-DB statistics

# Verify routing
$ show ip route 10.1.3.0/24
```

## Common gotchas

- **LTS** releases require a paid subscription to download official ISOs; "free" use forces you to build from source or use the rolling release (no SLA).
- Firewall config syntax changed significantly between 1.3.x and 1.4.x — `set firewall name <chain>` vs `set firewall ipv4 input filter ...` migrations are non-trivial; plan upgrades in lab first.
- VyOS doesn't ship a HA orchestrator — **VRRP** for IP failover + manual config sync (or rsync via cron); active/active is DIY.
- Junos-style commit-confirm (`commit-confirm 5`) requires the operator to issue a second `confirm` within 5 minutes or the change rolls back — easy to lose changes if forgotten over a lunch break.
- `set system console device ttyS0` is mandatory on most cloud images — missing it loses serial console access after reboot, blocking emergency recovery.
- BGP/OSPF configs use **FRR** under the hood — `show ip bgp` shows FRR output, but `vtysh` is the canonical debugger; not all FRR features are exposed in VyOS CLI.

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
