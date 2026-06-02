---
type: service
name: AWS Transit Gateway
cloud: aws
category: networking
specialists: ["cn_hyb", "cn_vnet"]
aliases: ["Transit Gateway", "TGW"]
tags: ["transit-gateway", "tgw", "hub", "vpc-routing"]
status: stub
updated: 2026-06-01
---
# AWS Transit Gateway

Regional hub that interconnects VPCs, VPN connections, [[Direct-Connect|Direct Connect Gateways]], and other Transit Gateways through a single attachment model and shared route tables.

## When to use

- Interconnecting many VPCs at scale (>5) without n×(n-1)/2 peerings.
- Centralizing on-premises connectivity ([[Direct-Connect|DX]] / [[Site-to-Site-VPN|S2S VPN]]) and steering traffic via shared route tables.
- Multi-account [[Hub-and-Spoke]] designs using Resource Access Manager (RAM) sharing.

## When to avoid

- Two VPCs in the same region with stable, low-volume traffic — direct VPC peering is cheaper.
- Global multi-region hub — use [[Cloud-WAN|Cloud WAN]] or stitched per-region TGWs with TGW peering.

## Cross-references

- Cloud equivalents: [[Virtual-WAN|Azure Virtual WAN]] · [[Network-Connectivity-Center|GCP Network Connectivity Center]]
- Pairs with: [[Direct-Connect]] · [[Site-to-Site-VPN]] · [[Cloud-WAN]] · [[Hub-and-Spoke]] · [[Transit-Hub]]

**Analysis only — verify against vendor documentation before applying.**
