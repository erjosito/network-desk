---
type: service
name: AWS WAF
cloud: aws
category: security
specialists: ["cn_nsec", "cn_cdn"]
aliases: ["AWS WAF", "WAFv2"]
tags: ["waf", "edge-security", "cloudfront", "alb"]
status: stub
updated: 2026-06-01
---
# AWS WAF

Web Application Firewall that attaches to [[CloudFront]], [[AWS-Application-Load-Balancer|ALB]], API Gateway, AppSync, or Cognito, with managed rule groups, custom rules, rate-based rules, and Bot Control / Fraud Control add-ons.

## When to use

- Edge L7 protection for public web apps and APIs.
- Bot mitigation and rate limiting at the edge.

## When to avoid

- Internal apps — use SG / NACL / firewall ([[AWS-Network-Firewall|NFW]]) instead.

## Cross-references

- Cloud equivalents: Azure Web Application Firewall (Front Door / App Gateway) · [[Cloud-Armor|GCP Cloud Armor]]
- Pairs with: [[WAF-Rules-Configuration]] · [[WAF-Policy-Design]] · [[CloudFront]] · [[AWS-Application-Load-Balancer]]

**Analysis only — verify against vendor documentation before applying.**
