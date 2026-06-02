---
type: topic
name: Firewall Rule Audit
specialists: [cn_fw, cn_nsec]
tags: [firewall, audit, rules, hit-count, cleanup]
status: stable
updated: 2026-06-01
---
# Firewall Rule Audit

## Purpose

Perform comprehensive firewall rule-base audits across all 14 supported platforms. Identify security risks, operational inefficiencies, and compliance gaps in existing rule sets. Produce a risk-rated findings table with actionable remediation recommendations.

---

## Audit Categories

Every rule audit checks for the following categories:

| Category | Description | Risk Level |
|----------|-------------|------------|
| **Any/Any Allow** | Rules permitting all sources to all destinations on all services | Critical |
| **Overly Broad Source/Dest** | Rules using excessively wide CIDR ranges (e.g., /8, /16) or "any" on one axis | High |
| **Shadow Rules** | Rules that can never match because a broader rule above already handles the traffic | High |
| **Unused Rules** | Rules with zero hit count over a significant observation period (30+ days) | Medium |
| **Redundant Rules** | Multiple rules that achieve the same effect — consolidation candidates | Medium |
| **Expired Time-Based Rules** | Rules with schedule objects whose valid dates have passed | Medium |
| **Missing Logging** | Allow rules without logging enabled (compliance gap) | Medium |
| **Disabled Rules** | Rules in disabled state — review for removal or re-enablement | Info |
| **Documentation Gaps** | Rules without descriptions or comments | Info |

---

## Per-Vendor Rule Export and Hit Count Retrieval

Vendor-specific rule audit details have been extracted to per-vendor pages:

- **[[Vendors/Azure-Firewall#Rule audit|Azure Firewall]]**
- **[[Vendors/AWS-Network-Firewall#Rule audit|AWS Network Firewall]]**
- **[[Vendors/GCP-Cloud-Firewall#Rule audit|GCP Cloud Firewall]]**
- **[[Vendors/PAN-OS#Rule audit|PAN-OS (Palo Alto Networks)]]**
- **[[Vendors/FortiGate#Rule audit|FortiGate (Fortinet)]]**
- **[[Vendors/Check-Point#Rule audit|Check Point]]**
- **[[Vendors/Cisco-ASA-FTD#Rule audit|Cisco ASA / Firepower (FTD)]]**
- **[[Vendors/Juniper-SRX#Rule audit|Juniper SRX]]**
- **[[Vendors/Zscaler#Rule audit|Zscaler (ZIA / ZPA)]]**
- **[[Vendors/Sophos-XG#Rule audit|Sophos XG / XGS]]**
- **[[Vendors/OPNsense#Rule audit|OPNsense]]**
- **[[Vendors/pfSense#Rule audit|pfSense]]**
- **[[Vendors/VyOS#Rule audit|VyOS]]**
- **[[Vendors/iptables-nftables#Rule audit|iptables / nftables]]**

## Output Format

Present findings in the following table format:

| Rule # | Name/ID | Source | Destination | Service | Action | Hit Count | Risk | Finding | Recommendation |
|--------|---------|-------|-------------|---------|--------|-----------|------|---------|----------------|
| 5 | Legacy-Any-Allow | any | any | any | Allow | 45,231 | **Critical** | Unrestricted allow rule | Decompose into specific rules by traffic analysis, then disable |
| 12 | Old-Vendor-Access | 10.0.0.0/8 | 192.168.1.0/24 | TCP/22,443 | Allow | 0 | **Medium** | Unused for 90 days | Disable with monitoring; remove after 30-day hold |
| 23 | Web-DMZ-Alt | 10.1.0.0/16 | DMZ_Servers | TCP/443 | Allow | 1,203 | **High** | Shadowed by rule 20 | Merge into rule 20 or re-order |
| 47 | Temp-Migration | 10.5.0.0/16 | DB_Servers | TCP/1433 | Allow | 312 | **Medium** | Schedule expired 2024-01-15 | Remove — expired temporary rule |

---

## Risk Summary Template

```
=== FIREWALL RULE AUDIT SUMMARY ===
Platform:       [vendor / version]
Rule Count:     [total]
Audit Period:   [start] to [end]

Critical:  [N] findings  — Immediate action required
High:      [N] findings  — Address within 7 days
Medium:    [N] findings  — Address within 30 days
Info:      [N] findings  — Best-practice improvements

Top Recommendations:
1. [Most critical finding and action]
2. [Second most critical]
3. [Third]
```

---

## Procedure

1. **Export** the current rule set and hit counts using the vendor-specific commands above.
2. **Normalize** rules into the common table format (Rule #, Source, Dest, Service, Action, Hit Count).
3. **Analyze** each rule against the audit categories.
4. **Score** each finding using the risk levels defined above.
5. **Recommend** specific remediations — be precise (e.g., "merge rule 23 into rule 20" not "clean up rules").
6. **Report** using the output format and risk summary template.

---
**Analysis only — verify against vendor documentation before applying.**
