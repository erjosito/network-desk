---
type: service
name: AWS Route 53
cloud: aws
category: networking
specialists: ["cn_dns"]
aliases: ["Route 53", "Route53", "R53"]
tags: ["dns", "route53", "private-hosted-zone", "resolver"]
status: stub
updated: 2026-06-01
---
# AWS Route 53

Managed authoritative DNS, recursive resolver (Route 53 Resolver), and traffic-management service with public / private hosted zones, health-checked routing policies, and DNSSEC for public zones.

## When to use

- Authoritative DNS for public domains hosted in AWS.
- Private DNS for VPCs (private hosted zones) with [[VPC-Endpoint|VPC Endpoint]] integration.
- Hybrid DNS forwarding to/from on-premises via Route 53 Resolver Inbound/Outbound endpoints.

## When to avoid

- Non-AWS-centric DNS estate — keep authority where it lives (often a third-party registrar / on-premises AD).

## Cross-references

- Cloud equivalents: [[DNS-Zone-Design]] · [[Cloud-DNS|GCP Cloud DNS]]
- Pairs with: [[DNS-Resolver-Design]] · [[DNS-Resolver-Design]] · [[VPC-Endpoint]] · [[PrivateLink]]

**Analysis only — verify against vendor documentation before applying.**
