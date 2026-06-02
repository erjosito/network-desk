---
type: service
name: AWS Site-to-Site VPN
cloud: aws
category: networking
specialists: ["cn_hyb"]
aliases: ["Site-to-Site VPN", "AWS VPN", "S2S VPN"]
tags: ["s2s-vpn", "ipsec", "bgp", "hybrid"]
status: stub
updated: 2026-06-01
---
# AWS Site-to-Site VPN

IPsec/IKEv2 VPN service that terminates on a Virtual Private Gateway (VGW) or [[Transit-Gateway|Transit Gateway]] with two redundant tunnels per connection, BGP-capable, supporting active-active or active-passive failover.

## When to use

- Hybrid connectivity to on-premises without [[Direct-Connect|Direct Connect]].
- Backup path for [[Direct-Connect|DX]] circuits ([[Hybrid-Failover-Design|active/standby failover]] via BGP).
- Quick interim connectivity while [[Direct-Connect|DX]] is being provisioned.

## When to avoid

- Latency- or bandwidth-sensitive workloads at scale — use [[Direct-Connect]] instead.
- Single-tunnel reliance — both tunnels are always provisioned; use BGP for automatic failover.

## Cross-references

- Cloud equivalents: [[VPN-Gateway|Azure VPN Gateway]] · [[HA-VPN|GCP HA VPN]]
- Pairs with: [[BGP-Design]] · [[Direct-Connect]] · [[Transit-Gateway]] · [[Hybrid-Failover-Design]]

**Analysis only — verify against vendor documentation before applying.**
