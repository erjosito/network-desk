---
type: service
name: AWS Application Load Balancer
cloud: aws
category: networking
specialists: ["cn_lb"]
aliases: ["AWS Application Load Balancer", "AWS ALB"]
tags: ["alb", "layer7", "http", "https", "tls"]
status: stub
updated: 2026-06-01
---
# AWS Application Load Balancer

Layer-7 load balancer for HTTP / HTTPS with path-based and host-based routing, [[AWS-WAF|WAF]] integration, OIDC / Cognito authentication, gRPC support, and per-request routing rules.

## When to use

- Public or internal web apps and REST/gRPC APIs needing host / path routing.
- [[AWS-WAF|WAF]] termination point for L7 attacks.
- Centralised TLS termination with [[TLS-Certificate-Management|ACM-managed certs]].

## When to avoid

- Raw TCP/UDP, source-IP preservation, or [[PrivateLink]] producer — use [[AWS-Network-Load-Balancer|NLB]].

## Cross-references

- Cloud equivalents: Azure Application Gateway · [[Cloud-Load-Balancing|GCP HTTPS Load Balancer]]
- Pairs with: [[AWS-WAF]] · [[AWS-Network-Load-Balancer]] · [[TLS-Certificate-Management]] · [[WAF-Rules-Configuration]]

**Analysis only — verify against vendor documentation before applying.**
