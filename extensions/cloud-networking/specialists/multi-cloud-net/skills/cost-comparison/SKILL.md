# Cost Comparison — Multi-Cloud Network Pricing Analysis

## Overview

Network costs — particularly egress charges — are often the most underestimated component of multi-cloud architectures. This skill provides detailed pricing breakdowns for data transfer, private circuits, and VPN gateways across Azure, AWS, and GCP, along with optimization strategies to reduce spend. All prices are approximate, in USD, and based on published pricing as of early 2025. Prices vary by region and change over time.

## Egress Pricing by Cloud

### Azure Data Transfer

| Traffic Type | Price |
|---|---|
| Inbound (ingress) | Free |
| Intra-region (same VNet, peered VNets in same region) | Free |
| Inter-AZ (within same region) | Free |
| VNet Peering (same region) | $0.01/GB (each direction) |
| VNet Peering (global/cross-region) | $0.035–$0.075/GB (varies by region pair) |
| Outbound to internet (first 5 GB/month) | Free |
| Outbound to internet (5 GB – 5 TB) | ~$0.087/GB |
| Outbound to internet (5 TB – 50 TB) | ~$0.083/GB |
| Outbound to internet (50 TB – 500 TB) | ~$0.07/GB |
| Outbound via ExpressRoute (metered) | ~$0.025/GB (varies by peering location) |

### AWS Data Transfer

| Traffic Type | Price |
|---|---|
| Inbound (ingress) | Free |
| Intra-AZ (same AZ, private IP) | Free |
| Inter-AZ (cross-AZ, same region) | $0.01/GB (each direction) |
| Inter-region | $0.02/GB (varies by region pair) |
| Outbound to internet (first 100 GB/month) | Free |
| Outbound to internet (100 GB – 10 TB) | ~$0.09/GB |
| Outbound to internet (10 TB – 50 TB) | ~$0.085/GB |
| Outbound to internet (50 TB – 150 TB) | ~$0.07/GB |
| Outbound via Direct Connect (data transfer out) | ~$0.02/GB |
| Transit Gateway data processing | $0.02/GB |

### GCP Data Transfer

| Traffic Type | Price |
|---|---|
| Inbound (ingress) | Free |
| Intra-zone (same zone) | Free |
| Intra-region (cross-zone, same region) | $0.01/GB |
| Inter-region (within same continent) | $0.01–$0.02/GB |
| Inter-region (cross-continent) | $0.05–$0.08/GB |
| Outbound to internet (first 1 GB/month, standard) | Free |
| Outbound to internet (1 GB – 10 TB) | ~$0.085–$0.12/GB (varies by destination) |
| Outbound to internet (10 TB – 50 TB) | ~$0.065–$0.085/GB |
| Outbound via Interconnect (egress via peering) | ~$0.02/GB (discounted vs internet) |

**Key Insight:** AWS charges for inter-AZ traffic ($0.01/GB each way), Azure does not. GCP charges for cross-zone within a region ($0.01/GB). These seemingly small charges accumulate significantly for distributed architectures with high inter-zone traffic.

## Private Circuit Costs

### Azure ExpressRoute

| Component | Cost |
|---|---|
| Port fee (ExpressRoute Direct, 10 Gbps) | ~$5,500/month per port pair |
| Circuit fee (1 Gbps, metered) | ~$436/month |
| Circuit fee (1 Gbps, unlimited data) | ~$1,740/month |
| Data transfer (metered plan) | ~$0.025/GB outbound |
| Global Reach add-on | ~$0.05/GB per direction |
| ExpressRoute Gateway (Standard) | ~$146/month |
| ExpressRoute Gateway (High Performance) | ~$438/month |

### AWS Direct Connect

| Component | Cost |
|---|---|
| Dedicated connection (1 Gbps) port-hour | ~$0.30/hour (~$219/month) |
| Dedicated connection (10 Gbps) port-hour | ~$1.50/hour (~$1,095/month) |
| Dedicated connection (100 Gbps) port-hour | ~$13.50/hour (~$9,855/month) |
| Hosted connection (varies by partner) | Partner-dependent |
| Data transfer out (per GB) | ~$0.02/GB (US regions) |
| Direct Connect Gateway | Free (no separate charge) |
| Transit VIF (to Transit Gateway) | Standard TGW attachment pricing |

### GCP Cloud Interconnect

| Component | Cost |
|---|---|
| VLAN attachment (Dedicated, 10 Gbps) | ~$1,700/month |
| VLAN attachment (Dedicated, 100 Gbps) | ~$17,000/month |
| Partner Interconnect attachment (50 Mbps – 50 Gbps) | Partner-dependent |
| Egress via Interconnect | ~$0.02/GB (discounted from standard) |
| Cloud Router | Free (no separate charge) |

## VPN Costs

| Component | Azure VPN Gateway | AWS Site-to-Site VPN | GCP Cloud VPN |
|---|---|---|---|
| **Gateway Hourly** | VpnGw1: ~$0.19/hr ($138/mo) | Per connection: ~$0.05/hr ($36/mo) | HA VPN: ~$0.088/hr per tunnel (~$64/mo) |
| **Bandwidth** | VpnGw1: 650 Mbps; VpnGw2: 1 Gbps | Up to 1.25 Gbps per tunnel | 3 Gbps per tunnel (HA VPN) |
| **Data Transfer** | Standard outbound egress rates | $0.09/GB outbound | Standard egress rates |
| **Max Tunnels** | VpnGw1: 30; VpnGw2: 30 | 10 per VPN Gateway | Varies by gateway type |

## Cost Comparison for Common Scenarios

Estimated monthly costs for cross-cloud data transfer (egress from source cloud only, excludes ingress at destination which is free):

| Scenario | Via VPN (Internet Egress) | Via Private Interconnect | Savings with Interconnect |
|---|---|---|---|
| **1 TB/month** (Azure → AWS) | ~$89 (egress) + $138 (GW) = ~$227 | ~$25 (ER metered) + $146 (GW) + $436 (circuit) = ~$607 | VPN cheaper at low volume |
| **10 TB/month** (Azure → AWS) | ~$860 + $138 = ~$998 | ~$250 + $146 + $436 = ~$832 | ~17% savings via interconnect |
| **100 TB/month** (Azure → AWS) | ~$7,300 + $138 = ~$7,438 | ~$2,500 + $146 + $436 = ~$3,082 | ~59% savings via interconnect |
| **1 TB/month** (AWS → GCP) | ~$90 + $36 = ~$126 | ~$20 (DX) + $219 (port) + $1,700 (VLAN) = ~$1,939 | VPN far cheaper at low volume |
| **100 TB/month** (AWS → GCP) | ~$7,500 + $36 = ~$7,536 | ~$2,000 + $219 + $1,700 = ~$3,919 | ~48% savings via interconnect |

**Break-Even Point:** Private interconnects become cost-effective at roughly 5–15 TB/month of data transfer, depending on the specific cloud pair and circuit size selected. Below this threshold, VPN with internet egress is usually cheaper despite the higher per-GB rate because it avoids fixed monthly circuit and port fees.

## Cross-Cloud Data Transfer Optimization Strategies

**CDN Offload:** Serve cacheable content (static assets, API responses with appropriate cache headers) through Azure Front Door, CloudFront, or Cloud CDN. CDN egress rates are typically lower than standard compute egress, and cache hits eliminate origin egress entirely.

**Compression:** Enable gzip or Brotli compression on all cross-cloud API traffic. For typical JSON/XML payloads, compression reduces transfer volume by 60–80%, directly reducing egress costs.

**Caching at Boundary:** Deploy Redis or Memcached at the receiving cloud boundary to cache frequently accessed data from the source cloud. This reduces repetitive cross-cloud fetches. Example: cache database query results from Azure SQL in an AWS ElastiCache cluster co-located with the consuming application.

**Data Locality:** Place data stores in the same cloud as their primary consumers. Avoid architectures where the database is in one cloud and the application tier is in another — this generates continuous cross-cloud egress. Use event-driven replication (Change Data Capture, event streams) to synchronize data across clouds asynchronously rather than synchronous cross-cloud reads.

**Committed Use Discounts:** AWS offers Data Transfer bundles with CloudFront for reduced egress rates. GCP offers committed use discounts for Interconnect bandwidth. Azure offers unlimited data ExpressRoute circuits that cap egress costs regardless of volume. Evaluate committed pricing against on-demand rates for predictable workloads.

**Minimize Inter-AZ Transfer on AWS:** AWS charges $0.01/GB per direction for inter-AZ traffic. For high-throughput distributed systems (Kafka, Cassandra, Elasticsearch), prefer single-AZ placement for non-critical workloads or use topology-aware scheduling (e.g., Kubernetes topology spread constraints) to minimize cross-AZ traffic.

Analysis only — verify against vendor documentation before applying.
