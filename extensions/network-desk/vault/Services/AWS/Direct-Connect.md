---
type: service
name: AWS Direct Connect
cloud: aws
category: networking
specialists: [cn_hyb]
aliases: [Direct Connect, DX]
tags: [direct-connect, dx, hybrid, bgp, dedicated-circuit]
status: stable
updated: 2026-06-01
---
# AWS Direct Connect

AWS Direct Connect (DX) provides dedicated private connectivity between on-premises networks and AWS via a physical cross-connect at a Direct Connect location (colocation facility / meet-me room). This is the AWS analogue of [[ExpressRoute|Azure ExpressRoute]] and [[Cloud-Interconnect|GCP Cloud Interconnect]].

---

## Summary

Customer brings a physical fiber to an AWS-approved DX location, peers via BGP with AWS routers, and gets predictable bandwidth, lower latency, and (with the right VIF / DXGW topology) private connectivity to one or many VPCs across regions.

## When to use / when to avoid

**Use when:**
- You need predictable throughput beyond what [[Site-to-Site-VPN|S2S VPN]] can sustain (≥ 1 Gbps), or sub-2 ms RTT to AWS regions.
- You have a multi-VPC / multi-region footprint reachable from a single circuit via [[Transit-Gateway|AWS Transit Gateway]] + DX Gateway (transit VIF).
- Compliance forbids transit over the public internet.

**Avoid when:**
- Bandwidth is < 100 Mbps and latency is non-critical — [[Site-to-Site-VPN|Site-to-Site VPN]] is simpler and per-GB cheaper.
- Lead time matters — a dedicated circuit typically takes 2–4 weeks (vs minutes for VPN).

---

## Connection Types

**Dedicated Connection**: Physical port (1 Gbps, 10 Gbps, or 100 Gbps) at a Direct Connect location. Customer manages the cross-connect to their router or colocated equipment. Lead time: typically 2–4 weeks.

**Hosted Connection**: Sub-rate connection provisioned by an AWS Direct Connect Partner. Available bandwidths vary by partner and region, including higher options where supported; verify current hosted connection speeds in the AWS Direct Connect documentation before sizing: https://docs.aws.amazon.com/directconnect/latest/UserGuide/hosted_connection.html.

---

## Virtual Interfaces (VIFs)

**Private VIF**: Connects to a VPC via a Virtual Private Gateway (VGW) or Direct Connect Gateway. BGP session with Amazon's router (ASN 7224 by default). Supports 802.1Q VLAN tagging. One private VIF per VPC (via VGW) or multiple VPCs (via Direct Connect Gateway).

**Public VIF**: Connects to AWS public services (S3, DynamoDB, EC2 public IPs) via Amazon's public IP space. BGP session advertises Amazon's public prefixes. Customer must advertise their own public prefixes (or Amazon-provided prefixes).

**Transit VIF**: Connects to one or more Transit Gateways via a Direct Connect Gateway. Enables connectivity to multiple VPCs and other [[Transit-Gateway|Transit Gateway]] attachments. Supports up to 3 Transit Gateways per Direct Connect Gateway. Limited to 100 route prefixes advertised from AWS.

---

## Link Aggregation Groups (LAGs)

Bundle multiple dedicated connections (same bandwidth, same location) into a single logical connection using LACP (802.3ad). Minimum links threshold configurable — if active links drop below threshold, the entire LAG goes down.

---

## Direct Connect Gateway

A globally available resource that enables connectivity to VPCs in any AWS region (excluding China). Associates with VGWs (for private VIFs) or Transit Gateways (for transit VIFs). Supports up to 10 VGW associations and 3 [[Transit-Gateway|Transit Gateway]] associations.

---

## Configuration Commands

```bash
# Create Direct Connect Gateway
aws directconnect create-direct-connect-gateway \
  --direct-connect-gateway-name MyDCGateway \
  --amazon-side-asn 64512

# Create Private VIF
aws directconnect create-private-virtual-interface \
  --connection-id dxcon-xxxx \
  --new-private-virtual-interface '{
    "virtualInterfaceName": "MyPrivateVIF",
    "vlan": 100,
    "asn": 65001,
    "authKey": "MyBGPKey",
    "amazonAddress": "169.254.100.1/30",
    "customerAddress": "169.254.100.2/30",
    "directConnectGatewayId": "dxgw-xxxx"
  }'
```

---

## Common pitfalls

1. **Single circuit / single location** — no SLA. AWS only offers an SLA when you have circuits at ≥ 2 distinct DX locations with diverse fiber paths.
2. **Transit VIF route limit (100 prefixes)** — easy to hit with summarized RFC1918 advertisements from multiple TGWs. Use route summarization and prefix-list filters carefully.
3. **MACsec only on Direct Connect dedicated 10G/100G ports** — not on hosted connections. Compliance teams should confirm encryption requirements early.
4. **BGP MD5 mismatch on cutover** — pre-stage keys on both sides; AWS won't tell you the key, you set it on the VIF and the on-prem device.
5. **Public VIF vs [[PrivateLink]] confusion** — Public VIF gives you BGP-advertised access to AWS public IPs; for *private* access to AWS services, prefer [[VPC-Endpoint|AWS VPC Endpoints]] (interface or gateway).

---

## Cross-references

- Cloud equivalents: [[ExpressRoute|Azure ExpressRoute]] · [[Cloud-Interconnect|GCP Cloud Interconnect]]
- Pairs with: [[BGP-Design]] · [[Hybrid-Failover-Design]] · [[Hybrid-Bandwidth-Planning]] · [[Dedicated-Circuit-Pricing]]
- Producer-side topics: [[Routing-Debug]] · [[MTU-and-PMTUD]]

**Analysis only — verify against vendor documentation before applying.**
