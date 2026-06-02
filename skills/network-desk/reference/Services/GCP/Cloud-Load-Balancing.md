---
type: service
name: GCP Cloud Load Balancing
cloud: gcp
category: networking
specialists: ["cn_lb"]
aliases: ["Cloud Load Balancing", "GCLB"]
tags: ["load-balancer", "external", "internal", "global", "regional"]
status: stub
updated: 2026-06-01
---
# GCP Cloud Load Balancing

Family of managed load balancers: global external HTTPS (Application LB), regional external / internal HTTPS, external / internal TCP-UDP (Network LB), and proxy-based variants — choice depends on protocol, scope, and IP-preservation needs.

## When to use

- Global anycast HTTPS for public web apps (External Application LB).
- Regional internal HTTP / TCP load balancing for internal services and [[Service-Attachment|PSC producers]].
- Ultra-low-latency L4 TCP/UDP with the Network Load Balancer family.

## When to avoid

- Don't mix global and regional LBs for the same workload without a clear traffic policy — document which entry point serves which traffic class.

## Cross-references

- Cloud equivalents: Azure Application Gateway / Standard LB · [[AWS-Application-Load-Balancer|AWS ALB]] / [[AWS-Network-Load-Balancer|NLB]]
- Pairs with: [[Service-Attachment]] · [[Cloud-Armor]] · [[Cloud-CDN]] · [[Health-Probe-Design]]

**Analysis only — verify against vendor documentation before applying.**
