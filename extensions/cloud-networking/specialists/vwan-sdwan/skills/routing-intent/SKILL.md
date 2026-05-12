# vwan_routing_intent — Routing Intent and Routing Policies

## Overview

Routing intent is a mechanism in Azure Virtual WAN that simplifies how traffic is steered through a security solution (Azure Firewall or a supported NVA) deployed in a secured virtual hub. Instead of manually configuring static routes, custom route tables, and UDRs on spoke VNets, routing intent uses declarative policies to automatically program the required routes across all connected resources.

Routing intent supports two independent policy types that can be enabled separately or together:

- **Internet Traffic Policy:** Routes 0.0.0.0/0 (default route) through the specified next-hop resource (Azure Firewall or NVA) for internet-bound traffic inspection.
- **Private Traffic Policy:** Routes RFC1918 aggregate prefixes (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) through the specified next-hop resource for east-west traffic inspection between spokes, branches, and on-premises networks.

## How Routing Intent Changes Effective Routes

When routing intent is enabled, the hub automatically injects routes into the effective route tables of all connected VNets, VPN connections, and ExpressRoute connections:

### Internet Traffic Policy Enabled

- All connected spoke VNets receive 0.0.0.0/0 with next hop = Azure Firewall or NVA in the hub
- Spoke VNets no longer break out to the internet directly; all internet traffic is forced through the hub security stack
- The hub advertises 0.0.0.0/0 to VPN and ExpressRoute connected branches (configurable)

### Private Traffic Policy Enabled

- All connected spoke VNets receive 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16 with next hop = Azure Firewall or NVA
- Spoke-to-spoke traffic that previously routed directly through the hub router now transits through the firewall or NVA
- Branch-to-spoke traffic is also routed through the security stack
- More specific VNet prefixes (e.g., 10.1.0.0/16 for a spoke) are overridden by the RFC1918 supernets pointing to the firewall

### Both Policies Enabled

When both internet and private traffic policies are enabled simultaneously, all traffic — internet-bound, spoke-to-spoke, branch-to-spoke, and branch-to-branch — is inspected by the designated security resource. This is the recommended configuration for zero-trust network architectures.

## Inter-Hub Routing with Routing Intent

In multi-hub deployments where routing intent is enabled on both hubs:

- Traffic between spokes connected to different hubs is inspected by the firewall/NVA in **both** hubs (double inspection — source hub egress and destination hub ingress)
- The hub router exchanges RFC1918 supernets between hubs, ensuring that inter-hub traffic is also steered through the security stack
- Each hub independently enforces its own routing intent policies; there is no cross-hub policy inheritance

**Important:** Double firewall inspection in multi-hub scenarios can introduce latency and increase firewall processing costs. Consider this when designing multi-hub topologies with routing intent.

## Implications for Spoke-to-Spoke Traffic

Without routing intent, spoke-to-spoke traffic within the same hub routes directly through the hub router without inspection. With private traffic policy enabled:

- All spoke-to-spoke traffic is hair-pinned through the Azure Firewall or NVA
- Azure Firewall network rules and application rules apply to east-west flows
- Firewall logs capture all spoke-to-spoke traffic for auditing and compliance
- Throughput between spokes is constrained by the firewall's capacity (up to 30+ Gbps for Azure Firewall Premium)

## Default Route Injection (0.0.0.0/0)

When the internet traffic policy is enabled:

- The 0.0.0.0/0 route is automatically injected into all connected VNet route tables
- No manual UDR configuration is required on spoke subnets
- VNet connections must have the `internetSecurity` flag set to `true` (also called "Propagate Default Route") to receive the 0.0.0.0/0 route
- If `internetSecurity` is set to `false` on a VNet connection, that specific spoke will **not** receive the default route and will use its own internet path

## RFC1918 Supernets

The private traffic policy injects three aggregate prefixes:

| Prefix | Range | Purpose |
|--------|-------|---------|
| 10.0.0.0/8 | 10.0.0.0 – 10.255.255.255 | Covers most Azure VNet and on-prem ranges |
| 172.16.0.0/12 | 172.16.0.0 – 172.31.255.255 | Secondary private range |
| 192.168.0.0/16 | 192.168.0.0 – 192.168.255.255 | Common branch/home office range |

These supernets override any more-specific VNet prefixes in the effective routes because routing intent programs them with a higher priority. This ensures that **all** private traffic transits the firewall regardless of individual spoke address ranges.

If your environment uses non-RFC1918 private ranges (e.g., 100.64.0.0/10 for CGNAT space), additional static routes must be configured separately — routing intent does not cover these ranges automatically.

## CLI Commands

### Enable Routing Intent with Both Policies

```bash
az network vhub routing-intent create \
  --name "routing-intent-eastus" \
  --resource-group "rg-networking" \
  --vhub "hub-eastus" \
  --routing-policies "[{name:InternetTraffic,destinations:[Internet],nextHop:/subscriptions/{sub-id}/resourceGroups/rg-networking/providers/Microsoft.Network/azureFirewalls/fw-hub-eastus},{name:PrivateTrafficPolicy,destinations:[PrivateTraffic],nextHop:/subscriptions/{sub-id}/resourceGroups/rg-networking/providers/Microsoft.Network/azureFirewalls/fw-hub-eastus}]"
```

### Show Current Routing Intent Configuration

```bash
az network vhub routing-intent show \
  --name "routing-intent-eastus" \
  --resource-group "rg-networking" \
  --vhub "hub-eastus" \
  --output json
```

### Update Routing Intent (Change Next Hop to NVA)

```bash
az network vhub routing-intent update \
  --name "routing-intent-eastus" \
  --resource-group "rg-networking" \
  --vhub "hub-eastus" \
  --routing-policies "[{name:InternetTraffic,destinations:[Internet],nextHop:/subscriptions/{sub-id}/resourceGroups/rg-networking/providers/Microsoft.Network/networkVirtualAppliances/nva-hub-eastus},{name:PrivateTrafficPolicy,destinations:[PrivateTraffic],nextHop:/subscriptions/{sub-id}/resourceGroups/rg-networking/providers/Microsoft.Network/networkVirtualAppliances/nva-hub-eastus}]"
```

### Delete Routing Intent

```bash
az network vhub routing-intent delete \
  --name "routing-intent-eastus" \
  --resource-group "rg-networking" \
  --vhub "hub-eastus" \
  --yes
```

## Common Pitfalls and Best Practices

1. **Forgetting `internetSecurity` on VNet connections:** If a spoke VNet connection has `internetSecurity` set to `false`, it will not receive the 0.0.0.0/0 default route even when routing intent is enabled. Always verify this flag on all VNet connections.

2. **Non-RFC1918 address space:** Routing intent only covers RFC1918 ranges. If you use addresses outside these ranges (e.g., 100.64.0.0/10), configure additional static routes manually in the hub route table.

3. **Asymmetric routing with ExpressRoute:** When private traffic policy is enabled, return traffic from on-premises may bypass the firewall if ExpressRoute routes are more specific than the RFC1918 supernets. Ensure consistent route advertisement from on-premises.

4. **Firewall capacity planning:** Enabling routing intent forces all traffic through the firewall. Size Azure Firewall or NVA capacity to handle the combined throughput of all spoke-to-spoke, branch-to-spoke, and internet traffic.

5. **Migration from custom route tables:** When enabling routing intent on an existing hub with custom route tables and static routes, routing intent takes precedence and may override existing configurations. Plan a maintenance window and validate effective routes after enabling.

6. **Inter-hub double inspection:** In multi-hub deployments, traffic between hubs is inspected twice. If this is undesirable, consider using custom route tables instead of routing intent for inter-hub flows.

## Reference

- Routing intent overview: https://learn.microsoft.com/en-us/azure/virtual-wan/how-to-routing-policies
- Virtual WAN routing: https://learn.microsoft.com/en-us/azure/virtual-wan/about-virtual-hub-routing

Analysis only — verify against vendor documentation before applying.
