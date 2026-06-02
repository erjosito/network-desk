---
type: service
name: AWS Network Load Balancer
cloud: aws
category: networking
specialists: ["cn_lb"]
aliases: ["AWS Network Load Balancer", "AWS NLB"]
tags: ["nlb", "layer4", "tcp", "udp", "tls"]
status: stub
updated: 2026-06-01
---
# AWS Network Load Balancer

Layer-4 load balancer for TCP / UDP / TLS, with ultra-low latency, preserved source IP (with target-type IP or instance), zonal isolation, and the only LB type that fronts an [[PrivateLink|AWS PrivateLink endpoint service]].

## When to use

- High-throughput, low-latency TCP/UDP workloads (databases, gaming, real-time).
- Source-IP preservation for backend logging / firewall rules.
- Fronting an [[PrivateLink|AWS PrivateLink]] [[PrivateLink|endpoint service]].

## When to avoid

- HTTP/HTTPS path/host routing — use [[AWS-Application-Load-Balancer|Application Load Balancer]].

## Cross-references

- Cloud equivalents: Azure Standard Load Balancer · [[Cloud-Load-Balancing|GCP TCP/UDP Network LB]]
- Pairs with: [[PrivateLink]] · [[AWS-Application-Load-Balancer]] · [[Health-Probe-Design]]

**Analysis only — verify against vendor documentation before applying.**
