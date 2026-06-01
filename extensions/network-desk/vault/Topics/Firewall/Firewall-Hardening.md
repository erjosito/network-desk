---
type: topic
name: Firewall Hardening Checklist
specialists: [cn_fw, cn_nsec]
tags: [firewall, hardening, security, baseline]
status: stable
updated: 2026-06-01
---
# Firewall Hardening Checklist

## Purpose

Assess firewall configurations against security hardening best practices. Produce a checklist of findings with CIS Benchmark references where available, covering both management plane and data plane hardening across all 14 supported platforms.

---

## Universal Hardening Items

These apply to **every** firewall platform regardless of vendor:

### Management Plane

| # | Check | Description | CIS Reference |
|---|-------|-------------|---------------|
| M1 | **Restrict management access** | Management interfaces (SSH, HTTPS, API) accessible only from dedicated management zone/subnet | CIS general: 1.x |
| M2 | **Enforce strong authentication** | Require MFA for admin access; use RADIUS/TACACS+/SAML/LDAP integration — no local-only accounts in production | CIS general: 1.x |
| M3 | **Minimum password complexity** | Enforce password length ≥14 characters, complexity requirements, and account lockout after failed attempts | — |
| M4 | **Role-based access control** | Implement RBAC with least-privilege admin roles (read-only, policy-admin, superadmin) | — |
| M5 | **Disable unused management protocols** | Disable HTTP (use HTTPS only), Telnet (use SSH only), SNMPv1/v2 (use v3 or disable) | CIS general: 2.x |
| M6 | **NTP synchronization** | Configure authenticated NTP from trusted sources; accurate timestamps are critical for log correlation | — |
| M7 | **Secure syslog/logging** | Forward logs to external SIEM over TLS; local log storage as backup only | — |
| M8 | **Firmware/OS patching** | Run a supported, patched firmware version; subscribe to vendor security advisories | — |
| M9 | **Configuration backups** | Automate configuration backups; store encrypted copies off-device | — |
| M10 | **Banner/MOTD** | Display legal warning banner on management interfaces | — |

### Data Plane

| # | Check | Description |
|---|-------|-------------|
| D1 | **Default deny** | Last rule in every policy/chain is an explicit deny-all with logging |
| D2 | **No any/any allow** | No rules permitting all traffic between zones without restriction |
| D3 | **Anti-spoofing** | Enable RPF (reverse path forwarding) or equivalent on all interfaces |
| D4 | **Fragment protection** | Drop or reassemble fragmented packets that could bypass inspection |
| D5 | **ICMP rate limiting** | Allow necessary ICMP types (echo-reply, unreachable, TTL exceeded) but rate-limit |
| D6 | **Bogon filtering** | Block RFC 1918, RFC 5737, RFC 6598 on external interfaces (unless NAT applies) |
| D7 | **SYN flood protection** | Enable SYN cookies or SYN proxy on internet-facing interfaces |
| D8 | **Session timeout tuning** | Set appropriate TCP/UDP/ICMP session timeouts — not too long (resource exhaustion) or too short (breaking legitimate flows) |

---

## Per-Vendor Hardening Specifics

Vendor-specific hardening details have been extracted to per-vendor pages:

- **[[Vendors/Azure-Firewall#Hardening|Azure Firewall]]**
- **[[Vendors/AWS-Network-Firewall#Hardening|AWS Network Firewall]]**
- **[[Vendors/GCP-Cloud-Firewall#Hardening|GCP Cloud Firewall]]**
- **[[Vendors/PAN-OS#Hardening|PAN-OS (Palo Alto Networks)]]**
- **[[Vendors/FortiGate#Hardening|FortiGate (Fortinet)]]**
- **[[Vendors/Check-Point#Hardening|Check Point]]**
- **[[Vendors/Cisco-ASA-FTD#Hardening|Cisco ASA / Firepower (FTD)]]**
- **[[Vendors/Juniper-SRX#Hardening|Juniper SRX]]**
- **[[Vendors/Zscaler#Hardening|Zscaler (ZIA / ZPA)]]**
- **[[Vendors/Sophos-XG#Hardening|Sophos XG / XGS]]**
- **[[Vendors/OPNsense#Hardening|OPNsense]]**
- **[[Vendors/pfSense#Hardening|pfSense]]**
- **[[Vendors/VyOS#Hardening|VyOS]]**
- **[[Vendors/iptables-nftables#Hardening|iptables / nftables]]**

## Checklist Output Format

```
=== FIREWALL HARDENING ASSESSMENT ===
Platform:     [vendor / version]
Date:         [assessment date]

MANAGEMENT PLANE
  [✓] M1 — Management access restricted to 10.0.0.0/24
  [✗] M2 — MFA not enabled for admin accounts
  [✓] M3 — Password policy meets complexity requirements
  ...

DATA PLANE
  [✓] D1 — Default deny rule present with logging
  [✗] D2 — Rule 14 has any/any allow (Critical)
  [✓] D3 — Anti-spoofing (RPF) enabled on all interfaces
  ...

VENDOR-SPECIFIC
  [✗] VS1 — Zone Protection Profile not applied to untrust zone
  [✓] VS2 — Security profiles attached to all allow rules
  ...

Score: 18/25 checks passed (72%)
Critical Gaps: 2 (M2, D2)
```

---
**Analysis only — verify against vendor documentation before applying.**
