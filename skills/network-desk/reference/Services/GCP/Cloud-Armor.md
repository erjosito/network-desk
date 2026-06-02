---
type: service
name: GCP Cloud Armor
cloud: gcp
category: security
specialists: ["cn_nsec", "cn_cdn"]
aliases: ["Cloud Armor"]
tags: ["waf", "edge-security", "ddos", "load-balancer"]
status: stub
updated: 2026-06-01
---
# GCP Cloud Armor

Edge WAF + DDoS protection for the global / regional external HTTPS [[Cloud-Load-Balancing|Load Balancers]], with preconfigured OWASP rule sets, rate-based rules, bot management (reCAPTCHA Enterprise integration), and adaptive protection.

## When to use

- Edge L7 protection for public HTTPS workloads behind GCP external LBs.
- DDoS Protection Plus for internet-facing services.

## When to avoid

- Internal apps — use VPC firewall rules / [[GCP-Cloud-Firewall|Cloud Firewall]] instead.

## Cross-references

- Cloud equivalents: Azure Web Application Firewall · [[AWS-WAF]]
- Pairs with: [[WAF-Rules-Configuration]] · [[WAF-Policy-Design]] · [[Cloud-Load-Balancing]] · [[Cloud-CDN]]

**Analysis only — verify against vendor documentation before applying.**
