---
type: service
name: GCP Cloud DNS
cloud: gcp
category: networking
specialists: ["cn_dns"]
aliases: ["Cloud DNS"]
tags: ["dns", "private-zone", "forwarding", "dnssec"]
status: stub
updated: 2026-06-01
---
# GCP Cloud DNS

Managed authoritative DNS with public, private, forwarding, and peering zones; DNSSEC for public zones; inbound / outbound DNS server policies for hybrid forwarding.

## When to use

- Authoritative DNS for GCP-hosted domains and VPCs.
- Private DNS for VPCs ([[Private-Service-Connect|PSC]] FQDN overlay).
- Hybrid DNS forwarding to/from on-premises via DNS server policies.

## When to avoid

- Non-GCP-centric estate — keep authority on existing DNS providers.

## Cross-references

- Cloud equivalents: [[DNS-Zone-Design]] · [[Route-53|AWS Route 53]]
- Pairs with: [[DNS-Resolver-Design]] · [[DNS-Resolver-Design]] · [[Private-Service-Connect]]

**Analysis only — verify against vendor documentation before applying.**
