---
type: service
name: AWS NAT Gateway
cloud: aws
category: networking
specialists: ["cn_vnet", "cn_price"]
aliases: ["AWS NAT Gateway"]
tags: ["nat", "egress", "vpc", "ipv4"]
status: stub
updated: 2026-06-01
---
# AWS NAT Gateway

Managed AZ-scoped NAT for IPv4 egress from private subnets to the internet, billed per-hour and per-GB; one NAT Gateway per AZ for HA.

## When to use

- Internet-bound egress from private subnets without exposing instances.
- Centralised egress points that simplify [[Egress-Cost-Architecture|cost auditing]].

## When to avoid

- Egress to AWS service endpoints — prefer [[VPC-Endpoint|VPC endpoints]] (gateway endpoints are free).
- High-volume same-region S3/DynamoDB traffic — [[VPC-Endpoint|gateway endpoint]] avoids per-GB NAT charges.

## Cross-references

- Cloud equivalents: Azure NAT Gateway · [[Cloud-NAT|GCP Cloud NAT]]
- Pairs with: [[Egress-Cost-Architecture]] · [[VPC-Endpoint]] · [[Transit-Gateway]]

**Analysis only — verify against vendor documentation before applying.**
