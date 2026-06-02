---
type: topic
name: Firewall Log Analysis
specialists: [cn_fw, cn_nmon]
tags: [firewall, logs, analysis, monitoring]
status: stable
updated: 2026-06-01
---
# Firewall Log Analysis

## Purpose

Parse, interpret, and analyze firewall logs across all 14 supported platforms. Identify security events, traffic anomalies, policy gaps, and operational issues from log data. Provide query templates and analysis patterns for common investigation scenarios.

---

## Log Formats

| Format | Used By | Structure |
|--------|---------|-----------|
| **Syslog (BSD/RFC 3164)** | Most on-prem firewalls, OPNsense, pfSense, VyOS, iptables | `<priority>timestamp hostname process[pid]: message` |
| **Syslog (IETF/RFC 5424)** | Modern syslog implementations | `<priority>version timestamp hostname app-name procid msgid SD message` |
| **CEF (Common Event Format)** | [[Check-Point|Check Point]], Palo Alto (optional), ArcSight integration | `CEF:0|vendor|product|version|eventId|name|severity|extension` |
| **LEEF (Log Event Extended Format)** | [[Check-Point|Check Point]] (QRadar integration) | `LEEF:1.0|vendor|product|version|eventId|key=value pairs` |
| **JSON** | [[Azure-Firewall|Azure Firewall]], [[AWS-Network-Firewall|AWS Network Firewall]], Zscaler NSS, REST APIs | Structured key-value JSON objects |
| **CSV / TSV** | PAN-OS (traffic/threat logs), FortiGate (FortiAnalyzer export) | Comma/tab-separated fields |
| **Custom** | Cisco ASA (syslog with ASA-x-xxxxxx message IDs), [[Sophos-XG|Sophos XG]] | Vendor-specific structured syslog |
| **pf log (filterlog)** | OPNsense, pfSense | CSV-style fields in syslog: `filterlog: rule,subrule,anchor,...,action,direction,ip-version,...` |

---

## Key Fields for Analysis

Every firewall log entry should be parsed for these critical fields:

| Field | Description | Analysis Value |
|-------|-------------|----------------|
| **Timestamp** | When the event occurred | Timeline correlation, burst detection |
| **Source IP** | Origin of the traffic | Identify attackers, anomalous internal hosts |
| **Source Port** | Origin port | Ephemeral vs well-known; scanning patterns |
| **Destination IP** | Target of the traffic | Identify targeted assets |
| **Destination Port** | Target port/service | Service identification, port scanning |
| **Protocol** | TCP, UDP, ICMP, etc. | Protocol anomalies |
| **Action** | Allow, deny, drop, reject, alert | Policy enforcement verification |
| **Rule Name/ID** | Which rule matched | Rule utilization, shadow rule detection |
| **Bytes/Packets** | Volume metrics | Data exfiltration, DDoS indicators |
| **Application** | App-ID or application name (L7 firewalls) | Shadow IT detection, application control verification |
| **Threat/IPS** | Threat name, severity, CVE | Security event triage |
| **NAT** | Pre/post-NAT addresses | Correlation, troubleshooting |
| **Session Duration** | How long the session lasted | Long-lived vs short-lived anomalies |
| **User** | User-ID (if integrated) | User attribution, compromised account detection |

---

## Common Analysis Patterns

### 1. Top Denied Flows
Identify the most frequently denied traffic — reveals misconfigured applications, scanning, or missing policy rules.

### 2. Geographic Anomalies
Traffic from/to unexpected countries — potential C&C, data exfiltration, or unauthorized access.

### 3. Port Scanning Detection
Single source hitting multiple destination ports or IPs in a short window.

### 4. Policy Gap Detection
Denied traffic that should have been allowed (user-reported issues) — candidate for new rules.

### 5. Unused Rule Detection
Rules with zero hits over the observation period — candidates for cleanup.

### 6. Data Exfiltration Indicators
Unusually high outbound bytes from internal hosts, especially to uncommon destinations.

### 7. Brute-Force Detection
Repeated denied connections to management ports (SSH/22, RDP/3389, HTTPS/443 management).

---

## Per-Vendor Log Queries

Vendor-specific logging details have been extracted to per-vendor pages:

- **[[Vendors/Azure-Firewall#Logging|Azure Firewall]]**
- **[[Vendors/AWS-Network-Firewall#Logging|AWS Network Firewall]]**
- **[[Vendors/GCP-Cloud-Firewall#Logging|GCP Cloud Firewall]]**
- **[[Vendors/PAN-OS#Logging|PAN-OS (Palo Alto Networks)]]**
- **[[Vendors/FortiGate#Logging|FortiGate (Fortinet)]]**
- **[[Vendors/Check-Point#Logging|Check Point]]**
- **[[Vendors/Cisco-ASA-FTD#Logging|Cisco ASA / Firepower (FTD)]]**
- **[[Vendors/Juniper-SRX#Logging|Juniper SRX]]**
- **[[Vendors/OPNsense#Logging|OPNsense]]**
- **[[Vendors/pfSense#Logging|pfSense]]**
- **[[Vendors/VyOS#Logging|VyOS]]**
- **[[Vendors/iptables-nftables#Logging|iptables / nftables]]**

## Analysis Workflow

1. **Define the question** — what are you investigating? (security incident, policy validation, capacity planning, troubleshooting)
2. **Set the time window** — narrow to the relevant period.
3. **Query for relevant events** — use vendor-specific log queries above.
4. **Aggregate and summarize** — group by source, destination, port, action.
5. **Identify anomalies** — deviations from baseline traffic patterns.
6. **Correlate** — cross-reference with other data sources (DNS logs, endpoint logs, SIEM alerts).
7. **Report** — summarize findings with evidence (log excerpts, charts, top-N tables).

---
**Analysis only — verify against vendor documentation before applying.**
