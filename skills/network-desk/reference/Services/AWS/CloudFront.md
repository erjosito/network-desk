---
type: service
name: AWS CloudFront
cloud: aws
category: delivery
specialists: ["cn_cdn"]
aliases: ["CloudFront", "AWS CDN"]
tags: ["cdn", "edge", "tls", "waf"]
status: stub
updated: 2026-06-01
---
# AWS CloudFront

Global CDN with edge locations and Regional Edge Caches, origin failover, [[AWS-WAF|AWS WAF]] integration, signed URLs/cookies, and Lambda@Edge / CloudFront Functions for edge compute.

## When to use

- Public web / API delivery with low-latency edge caching.
- Origin shielding for S3 / [[AWS-Application-Load-Balancer|ALB]] / [[AWS-Network-Load-Balancer|NLB]] / custom origins.
- Edge security ([[AWS-WAF|WAF]] + Shield) for internet-facing endpoints.

## When to avoid

- Internal-only traffic — use private endpoints and internal load balancers.

## Cross-references

- Cloud equivalents: [[CDN-Architecture-Design|Azure Front Door / CDN]] · [[Cloud-CDN|GCP Cloud CDN]]
- Pairs with: [[CDN-Cache-Optimization]] · [[AWS-WAF]] · [[Route-53]] · [[TLS-Certificate-Management]]

**Analysis only — verify against vendor documentation before applying.**
