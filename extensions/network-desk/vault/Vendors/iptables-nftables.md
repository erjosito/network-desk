---
type: vendor
name: iptables / nftables
vendor_kind: host-fw
roles: [firewall]
tags: [firewall, vendor, iptables, nftables, linux, host-fw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# iptables / nftables

## Overview

Linux kernel-level packet filtering frameworks:

- **iptables** — legacy v4/v6 frameworks (Netfilter), widely deployed on RHEL 7-, Debian 10-, Ubuntu 18.04-; deprecated upstream since kernel 4.x in favor of nftables.
- **nftables** — unified replacement (single tool for IPv4/v6/ARP/Bridge in one syntax), shipped by default on RHEL 8+, Debian 11+, Ubuntu 20.04+.

Configuration via `iptables-save` / `nft list ruleset`. Used directly on hardened bastion hosts, edge servers, and as the underlying engine for higher-level tools — **firewalld**, **ufw**, Docker/Kubernetes networking, OPNsense/pfSense (`pf` instead), and most Linux-based firewalls and NFV appliances. Not a product — choose this when you need host-level filtering or are tuning the underlying engine of another firewall.

## Config generation

```bash
# iptables
# Create custom chain for zone transition
iptables -N DMZ_TO_DB
iptables -A FORWARD -i eth1 -o eth2 -j DMZ_TO_DB   # eth1=DMZ, eth2=DB

# Allow MySQL with logging
iptables -A DMZ_TO_DB -s 10.1.2.0/24 -d 10.1.3.0/24 -p tcp --dport 3306 \
  -m state --state NEW,ESTABLISHED -j LOG --log-prefix "[DMZ-to-DB-MySQL] "
iptables -A DMZ_TO_DB -s 10.1.2.0/24 -d 10.1.3.0/24 -p tcp --dport 3306 \
  -m state --state NEW,ESTABLISHED -j ACCEPT

# Default deny for chain
iptables -A DMZ_TO_DB -j DROP

# Save
iptables-save > /etc/iptables/rules.v4
```

```bash
# nftables equivalent
nft add table inet filter
nft add chain inet filter dmz_to_db '{ type filter hook forward priority 0; }'

nft add rule inet filter forward iifname "eth1" oifname "eth2" jump dmz_to_db

nft add rule inet filter dmz_to_db ip saddr 10.1.2.0/24 ip daddr 10.1.3.0/24 \
  tcp dport 3306 ct state new,established log prefix \"[DMZ-to-DB-MySQL] \" accept

nft add rule inet filter dmz_to_db drop

# Save
nft list ruleset > /etc/nftables.conf
```

## HA

```bash
# keepalived.conf on primary
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 200
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass <secret>
    }
    virtual_ipaddress {
        10.1.1.1/24
    }
}

# conntrackd.conf — sync state over dedicated interface
Sync {
    Mode FTFW {
        DisableExternalCache On
    }
    Multicast {
        IPv4_address 225.0.0.50
        Group 3780
        IPv4_interface 10.0.99.1   # dedicated sync IP
        Interface eth2             # dedicated sync interface
    }
}
```

## Policy design

- Zones map to interfaces or interface groups.
- Chain design:
  - `INPUT` — traffic to the firewall itself (management zone).
  - `FORWARD` — traffic passing through the firewall (inter-zone).
  - `OUTPUT` — traffic from the firewall itself.
- Custom chains for per-zone-pair policies: e.g., `TRUST_TO_DMZ`, `DMZ_TO_DB`.
- nftables equivalent: named chains within the `inet filter` table.

```bash
# iptables zone-chain example
iptables -N TRUST_TO_DMZ
iptables -A FORWARD -i eth1 -o eth2 -j TRUST_TO_DMZ
iptables -A TRUST_TO_DMZ -p tcp --dport 443 -j ACCEPT
iptables -A TRUST_TO_DMZ -j DROP

# nftables equivalent
nft add chain inet filter trust_to_dmz
nft add rule inet filter forward iifname "eth1" oifname "eth2" jump trust_to_dmz
nft add rule inet filter trust_to_dmz tcp dport 443 accept
nft add rule inet filter trust_to_dmz drop
```

## Hardening

- **Default DROP policy** on all chains:
  ```bash
  iptables -P INPUT DROP
  iptables -P FORWARD DROP
  iptables -P OUTPUT DROP   # or ACCEPT if egress filtering is handled differently
  ```
- **Rate limiting** for SSH and management:
  ```bash
  iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
    -m recent --set --name SSH
  iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
    -m recent --update --seconds 60 --hitcount 4 --name SSH -j DROP
  ```
- **Connection tracking** — allow established/related early in chains:
  ```bash
  iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  ```
- **Drop invalid packets**:
  ```bash
  iptables -A INPUT -m conntrack --ctstate INVALID -j DROP
  ```
- **Anti-spoofing via RPF**: enable `rp_filter` in sysctl:
  ```bash
  sysctl -w net.ipv4.conf.all.rp_filter=1
  ```
- **Persist rules**: use `iptables-persistent` or `nft list ruleset > /etc/nftables.conf` with systemd unit.

## Logging

```bash
# LOG target with prefix
iptables -A INPUT -j LOG --log-prefix "[FW-INPUT-DROP] " --log-level 4
iptables -A FORWARD -j LOG --log-prefix "[FW-FORWARD-DROP] " --log-level 4

# View logs (depends on syslog config)
grep "\[FW-INPUT-DROP\]" /var/log/kern.log
journalctl -k | grep "FW-INPUT-DROP"

# nftables logging
nft add rule inet filter input log prefix \"[FW-INPUT-DROP] \" drop

# Parse iptables log fields:
# IN=eth0 OUT= SRC=1.2.3.4 DST=10.0.0.1 LEN=60 PROTO=TCP SPT=12345 DPT=22

# Rate-limit logging to avoid log flooding
iptables -A INPUT -m limit --limit 5/min -j LOG --log-prefix "[FW-RATE] "
```

## Rule audit

```bash
# iptables: List all rules with hit counts
iptables -L -v -n --line-numbers
iptables -L FORWARD -v -n --line-numbers

# NAT rules
iptables -t nat -L -v -n --line-numbers

# Zero counters to start observation
iptables -Z

# nftables: List all rules with counters
nft list ruleset
nft list chain inet filter forward

# Export for offline analysis
iptables-save > fw-export.txt
nft list ruleset > nft-export.txt
```

## Troubleshooting

```bash
# Verbose rule listing with hit counts
iptables -L FORWARD -v -n --line-numbers
iptables -L INPUT -v -n --line-numbers

# Check specific rule match
iptables -C FORWARD -s 10.1.2.5 -d 10.1.3.10 -p tcp --dport 3306 -j ACCEPT

# TRACE target for packet path debugging
iptables -t raw -A PREROUTING -s 10.1.2.5 -d 10.1.3.10 -p tcp --dport 3306 -j TRACE
# View trace output:
journalctl -k | grep TRACE
# or
dmesg | grep TRACE

# Connection tracking state
conntrack -L -s 10.1.2.5 -d 10.1.3.10
conntrack -E   # live event monitor

# NAT translations
conntrack -L -n   # show NAT entries
iptables -t nat -L -v -n --line-numbers

# nftables equivalents
nft list chain inet filter forward
nft monitor trace    # after adding: nft add rule ... meta nftrace set 1
```

## Common gotchas

- iptables and nftables can be enabled at the same time but operate on different kernel hooks — conflicting rules cause unpredictable behavior; pick one and uninstall the other.
- `iptables-restore` is atomic; `iptables -A` is per-line and slow on large rulesets — always use `restore` for >100 rules.
- Default `FORWARD` chain policy is ACCEPT on some distros and DROP on others — verify with `iptables -L -v -n` before relying on it for security.
- **conntrack** (stateful tracking) has a fixed table size — flooded gateways silently drop new connections when the table fills; tune `net.netfilter.nf_conntrack_max`.
- Rule order matters — first match wins on each chain; `iptables -I` prepends, `iptables -A` appends; mixing them in scripts confuses ops.
- Persistent rules require distro-specific tooling — `iptables-persistent` on Debian/Ubuntu, `service iptables save` on RHEL 7, `nftables.service` on RHEL 8+ — rules in memory disappear on reboot otherwise.

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
