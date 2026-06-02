---
type: service
name: GCP HA VPN
cloud: gcp
category: networking
specialists: ["cn_hyb"]
aliases: ["HA VPN", "GCP HA VPN", "Cloud VPN HA"]
tags: ["ha-vpn", "ipsec", "bgp", "hybrid"]
status: stub
updated: 2026-06-01
---
# GCP HA VPN

Highly available IPsec VPN with a 99.99% SLA when configured per the HA topology patterns — two interfaces with separate public IPs, BGP via [[Cloud-Router|Cloud Router]], active-active tunnel pairs.

## When to use

- Hybrid connectivity to on-premises without [[Cloud-Interconnect|Cloud Interconnect]].
- Backup path for [[Cloud-Interconnect|Cloud Interconnect]] using BGP weighting / MED.
- Multi-cloud connectivity to AWS / Azure via IPsec.

## When to avoid

- Latency- / throughput-sensitive workloads — use [[Cloud-Interconnect|Cloud Interconnect]].
- Legacy Classic VPN — HA VPN supersedes it; do not deploy new Classic VPN.

## Cross-references

- Cloud equivalents: [[VPN-Gateway|Azure VPN Gateway]] · [[Site-to-Site-VPN|AWS S2S VPN]]
- Pairs with: [[Cloud-Router]] · [[Cloud-Interconnect]] · [[BGP-Design]] · [[Hybrid-Failover-Design]]

**Analysis only — verify against vendor documentation before applying.**
