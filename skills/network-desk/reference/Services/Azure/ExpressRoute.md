---
type: service
name: Azure ExpressRoute
cloud: azure
category: networking
specialists: [cn_hyb]
aliases: [ExpressRoute, Azure ER]
tags: [expressroute, hybrid, bgp, dedicated-circuit]
status: stable
updated: 2026-06-01
---
# Azure ExpressRoute

Design dedicated private connectivity between on-premises networks and Microsoft cloud services using Azure ExpressRoute — circuit provisioning, peering configuration, redundancy patterns, and advanced features (FastPath, Global Reach, ExpressRoute Direct).

> **Cloud equivalents:** [[Direct-Connect|AWS Direct Connect]] · [[Cloud-Interconnect|GCP Cloud Interconnect]]

---

## Circuit Architecture

An ExpressRoute circuit represents a logical connection between on-premises infrastructure and Microsoft cloud services through a connectivity provider at a peering location (meet-me facility). Each circuit consists of two physical cross-connections (primary and secondary) for redundancy.

**Circuit Bandwidth Options**: 50 Mbps, 100 Mbps, 200 Mbps, 500 Mbps, 1 Gbps, 2 Gbps, 5 Gbps, 10 Gbps.

**SKUs**:
- **Standard**: Connect to VNets in the same geopolitical region as the peering location.
- **Premium**: Connect to VNets in any Azure region worldwide. Increased route limits (10,000 routes for private peering vs 4,000 for Standard).

**Billing Models**:
- **Metered**: Per-GB egress charge (ingress free). Suitable for variable workloads.
- **Unlimited**: Flat monthly fee regardless of egress volume. Cost-effective above ~10 TB/month egress.

---

## Peering Types

**Private Peering**:
- Connects on-premises networks to Azure VNets. BGP session between on-premises edge router (customer/provider ASN) and Microsoft Enterprise Edge routers (MSEE, ASN 12076).
- Requires two /30 or /126 subnets for BGP peering (primary and secondary links).
- Advertise on-premises routes to Azure; learn VNet address spaces from Azure.
- Route limit: 4,000 prefixes (Standard) or 10,000 prefixes (Premium).

**Microsoft Peering**:
- Connects to Microsoft 365, Dynamics 365, and Azure PaaS services via public IPs.
- Requires public IP prefixes owned by the customer or provider (registered in RIR).
- Route filters control which Microsoft service communities are advertised (e.g., Exchange Online, SharePoint Online, Azure Storage in specific regions).
- NAT required — Microsoft services see traffic from the customer's public IP pool.

---

## Advanced Features

**ExpressRoute Global Reach**: Enables data transfer between on-premises sites through two ExpressRoute circuits via Microsoft's backbone. Useful for inter-site connectivity without MPLS or internet VPN. Available in supported peering locations.

**FastPath**: Bypasses the ExpressRoute virtual network gateway for data-path traffic, sending packets directly from the MSEE to the VNet VM. Reduces latency. Support for VNet peering and user-defined routes depends on circuit type and documented constraints; verify the current FastPath matrix before relying on peering or UDR behavior: https://learn.microsoft.com/en-us/azure/expressroute/about-fastpath.

| Circuit type | VNet peering with FastPath | UDR support with FastPath | Guidance |
|--------------|----------------------------|---------------------------|----------|
| ExpressRoute Direct | Supported under documented constraints | Supported under documented constraints | Validate gateway, route table, and NVA constraints in the current FastPath docs. |
| Provider-provisioned ExpressRoute | Verify current support before design | Verify current support before design | Do not assume ExpressRoute Direct behavior applies to partner/provisioned circuits. |

**ExpressRoute Direct**: Provides 10 Gbps or 100 Gbps physical port pairs directly into Microsoft's peering edge. Enables MACsec (802.1AE) encryption on the physical link. Supports multiple ExpressRoute circuits on the same Direct port pair with flexible bandwidth allocation. Required for circuits > 10 Gbps.

---

## Provisioning Commands

```bash
# Create ExpressRoute circuit
az network express-route create \
  --name MyERCircuit \
  --resource-group MyRG \
  --bandwidth 1000 \
  --peering-location "Silicon Valley" \
  --provider "Equinix" \
  --sku-family MeteredData \
  --sku-tier Premium

# Configure Private Peering
az network express-route peering create \
  --circuit-name MyERCircuit \
  --resource-group MyRG \
  --peering-type AzurePrivatePeering \
  --peer-asn 65001 \
  --primary-peer-subnet 10.0.0.0/30 \
  --secondary-peer-subnet 10.0.0.4/30 \
  --vlan-id 100
```

---

## Circuit Sizing and Redundancy Patterns

### Sizing Guidelines

- Measure current bandwidth usage (95th percentile, peak, and average) for 30 days.
- Add 40% headroom for growth and burst absorption.
- Consider protocol overhead: Ethernet (14 bytes), IP (20 bytes), TCP (20 bytes) headers reduce usable throughput.
- Account for bidirectional traffic — most circuits are symmetric but workloads may be asymmetric.

### Redundancy Patterns

**Dual Circuits — Same Provider, Different Peering Locations**:
- Active-active or active-passive. Provides resilience against peering location failure.
- Use BGP local preference to define primary/secondary paths.

**Dual Circuits — Diverse Providers**:
- Maximum resilience against provider outages. Higher cost and complexity.
- Ensure diverse physical paths (different fiber routes, different meet-me rooms).

**ExpressRoute + VPN Backup**:
- ExpressRoute as primary (BGP LP 200), S2S [[VPN-Gateway|VPN]] as backup (BGP LP 100).
- VPN provides encrypted backup over internet with automatic failover via BGP.
- Azure supports this natively — [[VPN-Gateway|VPN Gateway]] and ExpressRoute Gateway can coexist in the same VNet.

---

## Cross-references

- Cloud equivalents: [[Direct-Connect|AWS Direct Connect]] · [[Cloud-Interconnect|GCP Cloud Interconnect]]
- Pairs with: [[BGP-Design]] · [[Hybrid-Failover-Design]] · [[Hybrid-Bandwidth-Planning]] · [[Dedicated-Circuit-Pricing]] · [[VPN-Gateway]]

**Analysis only — verify against vendor documentation before applying.**
