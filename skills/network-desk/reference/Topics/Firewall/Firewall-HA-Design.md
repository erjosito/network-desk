---
type: topic
name: Firewall High-Availability Design
specialists: [cn_fw]
tags: [firewall, high-availability, active-passive, active-active, heartbeat]
status: stable
updated: 2026-06-01
---
# Firewall High-Availability Design

## Purpose

Design and recommend high-availability (HA) architectures for firewall deployments across all 14 supported platforms. Cover HA modes, session synchronization, configuration synchronization, heartbeat design, and cloud-specific HA patterns.

---

## HA Modes by Vendor

| Vendor | Active/Passive | Active/Active | Clustering | Notes |
|--------|:-:|:-:|:-:|-------|
| **[[Azure-Firewall|Azure Firewall]]** | — | ✓ (built-in) | — | Managed service; HA built into the platform via availability zones |
| **[[AWS-Network-Firewall|AWS Network Firewall]]** | — | ✓ (built-in) | — | Managed service; multi-AZ endpoint deployment |
| **[[GCP-Cloud-Firewall|GCP Cloud Firewall]]** | — | ✓ (built-in) | — | Managed service; globally distributed |
| **Palo Alto PAN-OS** | ✓ | ✓ | ✓ (PA-7000) | Active/passive or active/active with floating IP and session sync |
| **FortiGate** | ✓ | ✓ | ✓ (FGCP/FGSP) | FGCP (config+session sync) or FGSP (session-only sync for active/active) |
| **[[Check-Point|Check Point]]** | ✓ | ✓ (ClusterXL) | ✓ (VSX) | ClusterXL with Load Sharing or HA; Maestro for hyperscale |
| **Cisco ASA/FTD** | ✓ | ✓ | ✓ (FTD multi-instance) | ASA failover (active/standby or active/active for multi-context); FTD HA via FMC |
| **[[Juniper-SRX|Juniper SRX]]** | ✓ | ✓ | ✓ (chassis cluster) | Chassis cluster with redundancy groups; `reth` interfaces |
| **Zscaler** | — | ✓ (built-in) | — | Cloud-native; resilience via Zscaler cloud fabric |
| **[[Sophos-XG|Sophos XG]]/XGS** | ✓ | — | ✓ (HA cluster) | Active/passive with dedicated HA link |
| **OPNsense** | ✓ (CARP) | — | — | CARP for VIP failover, pfsync for state sync |
| **pfSense** | ✓ (CARP) | — | — | CARP for VIP failover, pfsync for state sync, xmlrpc for config sync |
| **VyOS** | ✓ (VRRP) | — | — | VRRP for gateway failover; conntrack-sync for state sync |
| **iptables/nftables** | ✓ (keepalived/VRRP) | — | — | keepalived for VRRP + conntrackd for state sync |

---

## Session and Config Synchronization

### Session Sync
Session synchronization replicates the connection/state table between HA peers so that active sessions survive a failover without requiring re-establishment.

| Vendor | Session Sync Mechanism | Key Config |
|--------|----------------------|------------|
| PAN-OS | HA2 link (dedicated interface) | `set deviceconfig high-availability interface ha2` |
| FortiGate (FGCP) | Session sync over HA heartbeat link | `config system ha` → `set session-pickup enable` |
| FortiGate (FGSP) | TCP session sync over dedicated link | `config system standalone-cluster` |
| [[Check-Point|Check Point]] | State sync (CCP protocol) over sync interface | ClusterXL sync interface in cluster object |
| ASA | LAN-based failover link (stateful) | `failover link <name> <iface>` + `failover interface ip` |
| SRX | Chassis cluster fabric (fab0/fab1) and control link (em0) | `set chassis cluster` |
| OPNsense | pfsync over dedicated interface | System > HA > State Synchronization > Synchronize Interface |
| pfSense | pfsync over dedicated interface | System > HA > State Synchronization Settings |
| VyOS | conntrack-sync | `set service conntrack-sync interface <iface>` |
| iptables | conntrackd (userspace daemon) | `/etc/conntrackd/conntrackd.conf` — multicast or unicast sync |

### Config Sync
Configuration synchronization ensures both peers have identical policy and settings.

| Vendor | Config Sync Method |
|--------|-------------------|
| PAN-OS | HA1 link — automatic config sync; primary pushes config to secondary |
| FortiGate | HA heartbeat — config sync is automatic in FGCP mode |
| [[Check-Point|Check Point]] | SmartConsole installs policy to all cluster members simultaneously |
| ASA | Standby replicates running-config from active unit |
| SRX | Chassis cluster — RE0 (primary) syncs config to RE1 |
| OPNsense | XMLRPC sync from master to backup (System > HA > Settings) |
| pfSense | XMLRPC sync from primary to secondary (System > HA > Settings) |
| VyOS | Manual — no native config sync; use automation (Ansible/scripts) |
| iptables | Manual — use `iptables-save`/`iptables-restore` with rsync or config management |

---

## Heartbeat Network Design

### Dedicated HA Interface Recommendations
- **Minimum**: one dedicated heartbeat link (direct cable or dedicated VLAN).
- **Recommended**: two heartbeat links for redundancy (management + dedicated HA VLAN).
- **Never** route heartbeat traffic through production data interfaces.
- Use a dedicated, non-routable subnet (e.g., 169.254.x.x link-local or a /30 private subnet).

### Heartbeat Timers
| Setting | Typical Value | Purpose |
|---------|---------------|---------|
| Hello interval | 1 second | Frequency of heartbeat probes |
| Dead/hold time | 3–6 seconds | Time before declaring peer dead |
| Preemption delay | 300 seconds | Wait time before primary reclaims after recovery |

> **Split-brain prevention**: Always use at least two independent heartbeat paths. Configure a management interface as a secondary heartbeat. Some vendors support a "monitor" interface that must be up for the node to remain active — use to detect upstream/downstream link failures.

---

## Cloud-Specific HA Patterns

Vendor-specific ha details have been extracted to per-vendor pages:

- **[[Vendors/Azure-Firewall#HA|Azure Firewall]]**
- **[[Vendors/AWS-Network-Firewall#HA|AWS Network Firewall]]**
- **[[Vendors/GCP-Cloud-Firewall#HA|GCP Cloud Firewall]]**

### Floating IP / EIP Failover (Any Cloud)
- Assign an **Elastic IP** (AWS) or **Secondary IP** (Azure, GCP) to the active NVA.
- On failover, a script or API call moves the floating IP to the standby NVA.
- Slower than LB-based failover (API call latency: 10–30 seconds vs probe-based: 5–15 seconds).

---

## Open-Source HA Patterns

Vendor-specific ha details have been extracted to per-vendor pages:

- **[[Vendors/OPNsense#HA|OPNsense]]**
- **[[Vendors/pfSense#HA|pfSense]]**
- **[[Vendors/VyOS#HA|VyOS]]**
- **[[Vendors/iptables-nftables#HA|iptables / nftables]]**

## Design Checklist

1. [ ] HA mode selected (active/passive, active/active, clustering) with justification.
2. [ ] Dedicated heartbeat/HA interfaces provisioned (minimum two paths).
3. [ ] Session synchronization configured and verified (stateful failover).
4. [ ] Configuration synchronization enabled (or automated via config management).
5. [ ] Health probes configured (cloud deployments) or heartbeat timers tuned.
6. [ ] Split-brain prevention addressed (dual heartbeat, monitoring interfaces).
7. [ ] Preemption policy decided (preempt on recovery or manual failback).
8. [ ] Failover tested end-to-end with traffic flowing during failover event.
9. [ ] Rollback/recovery procedure documented for HA configuration changes.

---
**Analysis only — verify against vendor documentation before applying.**
