---
type: vendor
name: Check Point
vendor_kind: ngfw
roles: [firewall]
tags: [firewall, vendor, check-point, ngfw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# Check Point

## Overview

Check Point Software's NGFW family, sold as **Quantum Security Gateway** appliances (1500/6000/16000/26000/28000 series) and **CloudGuard Network Security** for AWS/Azure/GCP/Oracle Cloud. Three-tier architecture — **Security Gateway** (enforcement), **Security Management Server (SMS)** (policy authoring + push), **SmartConsole** (admin GUI / scriptable via mgmt_cli). Policy is package-based with multiple layers (Network, Application/URL, Content Awareness, Threat Prevention) compiled and pushed atomically to all gateways in the cluster. Subscriptions (IPS, Anti-Bot, Anti-Virus, URL Filtering, App Control, SandBlast threat emulation) are licensed via **NGTP** or **NGTX** blade bundles.

## Config generation

```bash
# Create host/network objects
mgmt_cli add network name "DMZ_WebServers" subnet "10.1.2.0" mask-length 24
mgmt_cli add network name "DB_Servers" subnet "10.1.3.0" mask-length 24

# Create service
mgmt_cli add service-tcp name "MySQL" port 3306

# Add access rule
mgmt_cli add access-rule layer "Network" \
  position top \
  name "Allow-DMZ-to-DB-MySQL" \
  source "DMZ_WebServers" \
  destination "DB_Servers" \
  service "MySQL" \
  action "Accept" \
  track "Log" \
  comments "Allow DMZ web servers to MySQL"

# Publish and install
mgmt_cli publish
mgmt_cli install-policy policy-package "Standard"
```

## Policy design

- Zones defined as network objects (networks, groups) in SmartConsole.
- Security Policy layers: Access Control → Threat Prevention → HTTPS Inspection.
- App Control blade for L7 application awareness.

## Hardening

- Enable **HTTPS Inspection** blade for encrypted traffic visibility.
- Enable **Anti-Bot**, **Anti-Virus**, **IPS**, and **Threat Emulation** blades.
- Configure **Implicit Cleanup Rule** to log (not just drop silently).
- Restrict SmartConsole access via **GUI Clients** object.
- Disable **cpridstop** — use SIC for secure communication only.
- Enable **Multi-Factor Authentication** for SmartConsole login.
- Ref: [CIS Check Point Firewall Benchmark](https://www.cisecurity.org/benchmark/check_point_firewall).

## Logging

```bash
# SmartLog query (SmartConsole)
action:Drop AND NOT service:domain-udp | last 24 hours

# CLI: fw log
fw log -c deny -n 100

# Log Exporter (JSON to SIEM)
cp_log_export name "siem_feed" target-server <siem-ip> target-port 514 protocol udp format json
```

## Rule audit

```bash
# Export rulebase via mgmt_cli
mgmt_cli show access-rulebase name "Network" details-level full -f json

# Hit counts
mgmt_cli show access-rulebase name "Network" use-object-dictionary true \
  hits-settings.from-date "2024-01-01" -f json

# SmartConsole: Policy > Access Control > hit count column (enable if hidden)
# cpstat fw -f policy for real-time policy stats
```

## Policy testing

```bash
# Inline packet trace through policy
fw monitor -e "accept src=10.1.1.5;" -F "10.1.1.5,0,203.0.113.10,443,6"
# Position markers (i,I,o,O) show pre/post inspection at each chain
```

SmartConsole → **Manage Policies → Analyze Policy** flags shadowed/unused rules and policy package conflicts.

## Troubleshooting

```bash
# fw monitor (packet capture at inspection points)
fw monitor -e "accept src=10.1.2.5 and dst=10.1.3.10;"

# fw ctl zdebug drop (show reason for drops)
fw ctl zdebug drop | grep "10.1.2.5"

# Connection table
fw tab -t connections -f -u | grep "10.1.2.5"

# Policy verification
mgmt_cli show access-rulebase name "Network" filter "src:10.1.2.5 AND dst:10.1.3.10" -f json
```

## Common gotchas

- Policy push is atomic across the cluster — a single misconfigured rule can roll back the entire policy; use **policy verification** in SmartConsole before push.
- The implicit cleanup rule (`Any Any Drop`) at the end of the policy is invisible by default — enable "Show implied rules" in SmartConsole to debug unexpected drops.
- HA via **ClusterXL** (Active/Active or Active/Passive) requires a sync interface + multicast or broadcast; cloud deployments often need Active/Backup mode with no Sync interface.
- `cpinfo` and `cpview` are the right diagnostics tools — `tcpdump` shows fewer details than `fw monitor`, which decodes the four Check Point inspection points (i/I/o/O).
- Identity Awareness via AD integration requires a **PDP** (Policy Decision Point) gateway and **PEP** (Policy Enforcement Point) — separating them across sites breaks identity resolution.
- License model is per-blade per gateway — adding IPS to a cluster needs licenses on every member; missing one silently disables enforcement on that member without alerting.

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
