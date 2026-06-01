---
type: topic
name: Firewall Configuration Generation
specialists: [cn_fw, cn_iac]
tags: [firewall, config-generation, iac, vendor-templates]
status: stable
updated: 2026-06-01
---
# Firewall Configuration Generation

## Purpose

Generate vendor-specific firewall configuration snippets from a policy intent description. Given a high-level requirement (e.g., "allow web servers in DMZ to reach DB servers on port 3306"), produce ready-to-review configuration for any of the 14 supported platforms.

---

## Input Requirements

Before generating configuration, gather:

| Parameter | Description | Example |
|-----------|-------------|---------|
| **Source zone** | Origin zone of the traffic | DMZ |
| **Source address** | IP/CIDR, FQDN, or address object | 10.1.2.0/24 or `DMZ_WebServers` |
| **Destination zone** | Target zone of the traffic | Database |
| **Destination address** | IP/CIDR, FQDN, or address object | 10.1.3.0/24 or `DB_Servers` |
| **Service/Port** | Protocol and port(s) | TCP/3306 |
| **Action** | allow / deny / drop / reject | allow |
| **Logging** | Enable session logging | yes |
| **Description** | Human-readable rule description | Allow DMZ web servers to MySQL |

---

## Vendor-Specific Configuration Templates

All examples implement the same policy intent:
> **Allow web servers in DMZ (10.1.2.0/24) to reach database servers (10.1.3.0/24) on TCP port 3306, with logging enabled.**

---

- **[[Vendors/Azure-Firewall#Config generation|Azure Firewall]]**
- **[[Vendors/AWS-Network-Firewall#Config generation|AWS Network Firewall]]**
- **[[Vendors/GCP-Cloud-Firewall#Config generation|GCP Cloud Firewall]]**
- **[[Vendors/PAN-OS#Config generation|PAN-OS (Palo Alto Networks)]]**
- **[[Vendors/FortiGate#Config generation|FortiGate (Fortinet)]]**
- **[[Vendors/Check-Point#Config generation|Check Point]]**
- **[[Vendors/Cisco-ASA-FTD#Config generation|Cisco ASA / Firepower (FTD)]]**
- **[[Vendors/Juniper-SRX#Config generation|Juniper SRX]]**
- **[[Vendors/Zscaler#Config generation|Zscaler (ZIA / ZPA)]]**
- **[[Vendors/Sophos-XG#Config generation|Sophos XG / XGS]]**
- **[[Vendors/OPNsense#Config generation|OPNsense]]**
- **[[Vendors/pfSense#Config generation|pfSense]]**
- **[[Vendors/VyOS#Config generation|VyOS]]**
- **[[Vendors/iptables-nftables#Config generation|iptables / nftables]]**
## Best Practices for Generated Config

1. **Always include comments/descriptions** — every rule must have a human-readable description.
2. **Use named objects** — avoid hard-coded IPs in rules; define address and service objects.
3. **Log all rules** — enable session logging for allow rules and packet logging for deny rules.
4. **Include rollback commands** — provide the delete/remove commands alongside the add commands.
5. **Validate before applying** — recommend dry-run or test-policy-match tools per vendor.
6. **Commit atomically** — on platforms that support it (Junos, VyOS, PAN-OS), use commit/confirm with auto-rollback timers.

---
**Analysis only — verify against vendor documentation before applying.**
