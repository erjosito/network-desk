---
type: vendor
name: Azure Firewall
vendor_kind: cloud-fw
roles: [firewall]
tags: [firewall, vendor, azure, azure-firewall, cloud-fw]
specialists: [cn_fw]
status: stable
updated: 2026-06-01
---

# Azure Firewall

## Overview

Microsoft's managed, cloud-native NGFW service in Azure, deployed as a fully managed PaaS resource into a dedicated `AzureFirewallSubnet` (and optionally `AzureFirewallManagementSubnet` for Forced Tunneling). Three SKUs:

- **Basic** — small workloads, limited features.
- **Standard** — Firewall Policy with FQDN filtering and threat intel.
- **Premium** — adds TLS inspection, IDPS (Snort-based), URL filtering, and web categories.

Billed by deployment-hour + data processed (GB). HA, autoscaling, and patching are handled by Azure — no instance management. Often paired with **Azure Firewall Manager + Firewall Policy** for multi-region/multi-instance governance and integrates natively with **[[Virtual-WAN|Virtual WAN]] secured hubs**. Best fit for [[Hub-and-Spoke]] and VWAN topologies where customers want a managed control plane and don't need feature parity with third-party NGFWs.

## Config generation

```bicep
// Network Rule Collection within a Firewall Policy
resource ruleCollectionGroup 'Microsoft.Network/firewallPolicies/ruleCollectionGroups@2023-09-01' = {
  name: 'DMZ-to-Database'
  parent: firewallPolicy
  properties: {
    priority: 300
    ruleCollections: [
      {
        ruleCollectionType: 'FirewallPolicyFilterRuleCollection'
        name: 'Allow-DMZ-to-DB'
        priority: 310
        action: {
          type: 'Allow'
        }
        rules: [
          {
            ruleType: 'NetworkRule'
            name: 'Allow-WebServers-MySQL'
            description: 'Allow DMZ web servers to MySQL'
            sourceAddresses: [ '10.1.2.0/24' ]
            destinationAddresses: [ '10.1.3.0/24' ]
            destinationPorts: [ '3306' ]
            ipProtocols: [ 'TCP' ]
          }
        ]
      }
    ]
  }
}
```

```bash
# Azure CLI equivalent
az network firewall policy rule-collection-group collection add-filter-collection \
  --policy-name myFirewallPolicy \
  --resource-group myRG \
  --rule-collection-group-name DMZ-to-Database \
  --name Allow-DMZ-to-DB \
  --collection-priority 310 \
  --action Allow \
  --rule-name Allow-WebServers-MySQL \
  --rule-type NetworkRule \
  --source-addresses "10.1.2.0/24" \
  --destination-addresses "10.1.3.0/24" \
  --destination-ports 3306 \
  --ip-protocols TCP
```

## HA

```
Internet → Azure LB (Standard, HA ports rule) → NVA-1 (active)
                                               → NVA-2 (standby or active)
           Internal LB (HA ports) ← NVA-1 / NVA-2 ← spoke VNets (via UDR)
```
- Use **Azure Standard Load Balancer** with HA ports rule (protocol=all, port=0) for transparent traffic steering.
- **Health probes** determine which NVA receives traffic; failed probe removes NVA from pool.
- **UDRs** in spoke subnets point to the internal LB frontend IP as next hop.
- Azure Firewall has HA built-in — no LB pattern needed.

## Policy design

- Zones map to Azure VNet subnets or IP Groups.
- Rule Collection Groups act as zone-transition containers (priority-ordered).
- Use Application Rule Collections for L7 (FQDN, HTTP/S) and Network Rule Collections for L3/L4.

## Hardening

- Enable **Threat Intelligence** in "Alert and deny" mode (Standard/Premium).
- Enable **IDPS** in "Alert and deny" mode (Premium).
- Enable **TLS Inspection** for outbound traffic (Premium) — requires CA certificate.
- Use **Structured Logs** (resource-specific tables) over legacy `AzureDiagnostics`.
- Configure **Diagnostic Settings** to send logs to Log Analytics workspace.
- Use **Azure Policy** to enforce Firewall Policy compliance at scale.
- Ref: [CIS Microsoft Azure Foundations Benchmark](https://www.cisecurity.org/benchmark/azure).

## Logging

```kql
// Top denied flows (structured logs)
AZFWNetworkRule
| where Action == "Deny"
| summarize DenyCount=count() by SourceIp, DestinationIp, DestinationPort, Protocol
| order by DenyCount desc
| take 20

// Application rule hits
AZFWApplicationRule
| where TimeGenerated > ago(24h)
| summarize HitCount=count() by Fqdn, Action
| order by HitCount desc

// Threat intelligence hits
AZFWThreatIntel
| where TimeGenerated > ago(7d)
| project TimeGenerated, SourceIp, DestinationIp, DestinationPort, ThreatDescription, Action

// IDPS signature alerts (Premium)
AZFWIdpsSignature
| where Severity in (1, 2)
| summarize AlertCount=count() by SignatureId, Description, Severity
| order by AlertCount desc
```

## Rule audit

```bash
# Export rule collections via CLI
az network firewall policy rule-collection-group list \
  --policy-name <policy> --resource-group <rg> -o json

# Hit counts via Azure Monitor / Log Analytics (KQL)
AzureDiagnostics
| where Category == "AzureFirewallNetworkRule" or Category == "AzureFirewallApplicationRule"
| summarize HitCount=count() by RuleName=msg_s
| order by HitCount asc

# Structured logs (resource-specific tables — preferred)
AZFWNetworkRule
| summarize HitCount=count() by Rule
| order by HitCount asc
```

## Policy testing

```bash
# Enable Policy Analytics on a Firewall Policy (collects rule-hit telemetry)
az network firewall policy update \
  --name fw-policy --resource-group rg-hub \
  --enable-policy-analytics true

# Query rule hit counts via Log Analytics (Azure Monitor)
# KQL — top hit rules in last 24h
AzureDiagnostics
| where Category == "AzureFirewallNetworkRule" or Category == "AzureFirewallApplicationRule"
| where TimeGenerated > ago(24h)
| summarize hits = count() by Resource, RuleName = tostring(parse_json(msg_s).rule)
| sort by hits desc
```

Policy Analytics also surfaces: **unused rules**, **rule shadowing**, **IP-group dependency drift**, and **traffic that didn't match any rule** (the implicit deny).

## Troubleshooting

```bash
# Check if traffic is being processed (Log Analytics / KQL)
AZFWNetworkRule
| where SourceIp == "10.1.2.5" and DestinationIp == "10.1.3.10"
| project TimeGenerated, Action, Rule, Protocol, DestinationPort

# Check DNAT rule hits
AZFWNatRule
| where DestinationIp == "<public-ip>"
| project TimeGenerated, SourceIp, TranslatedIp, TranslatedPort, Action

# Verify effective routes in spoke subnet (is UDR pointing to firewall?)
az network nic show-effective-route-table \
  --resource-group <rg> --name <nic-name> -o table

# Azure Firewall diagnostic logs
az monitor diagnostic-settings list --resource <firewall-resource-id>
```

## Common gotchas

- `AzureFirewallSubnet` must be exactly `/26` or larger, dedicated, and unnamed at the original cast — no other resources allowed; resizing requires recreating the firewall.
- TLS inspection (Premium) requires an internal CA cert in Key Vault, accessed via the firewall's user-assigned managed identity; cert rotation invalidates inspected sessions until clients reconnect.
- SNAT port exhaustion on the public outbound path silently throttles east-west and outbound flows — attach multiple public IPs (up to 250) or front the outbound path with NAT Gateway.
- Per-rule logging is **disabled by default**; enable Diagnostic Settings AND prefer the resource-specific structured logs (`AZFWNetworkRule`, `AZFWApplicationRule`, etc.) over the legacy `AzureDiagnostics` table.
- Forced Tunneling (sending all traffic to on-prem via UDR) requires the `AzureFirewallManagementSubnet` and breaks the management plane unless explicitly configured.
- The Firewall Policy resource is independent of the firewall lifecycle — deleting the firewall does **not** delete the policy; orphaned policies accumulate cost and audit noise.

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
