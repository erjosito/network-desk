---
type: service
name: GCP Cloud NAT
cloud: gcp
category: networking
specialists: ["cn_vnet", "cn_price"]
aliases: ["Cloud NAT"]
tags: ["nat", "egress", "vpc", "ipv4"]
status: stub
updated: 2026-06-01
---
# GCP Cloud NAT

Regional managed NAT for IPv4 egress from private VM instances, GKE pods, and Cloud Run / Cloud Functions; provides per-VM port allocation tunable for predictable scale.

## When to use

- Internet egress from private GKE clusters and VMs without public IPs.
- Centralised egress IP pool for allow-listing on partner endpoints.

## When to avoid

- Egress to Google APIs — prefer [[Private-Service-Connect|PSC]] or Private Google Access.

## Cross-references

- Cloud equivalents: Azure NAT Gateway · [[AWS-NAT-Gateway|AWS NAT Gateway]]
- Pairs with: [[Egress-Cost-Architecture]] · [[Private-Service-Connect]]

**Analysis only — verify against vendor documentation before applying.**
