---
type: service
name: GCP Cloud CDN
cloud: gcp
category: delivery
specialists: ["cn_cdn"]
aliases: ["Cloud CDN"]
tags: ["cdn", "edge", "cache", "load-balancer"]
status: stub
updated: 2026-06-01
---
# GCP Cloud CDN

Edge cache fronting the global external [[Cloud-Load-Balancing|HTTPS Load Balancer]], with cache modes (USE_ORIGIN_HEADERS / FORCE_CACHE_ALL / CACHE_ALL_STATIC), signed URLs / cookies, and negative caching policies.

## When to use

- Public HTTPS workloads behind GCP global HTTPS LB needing edge acceleration.
- Origin shielding for Cloud Storage, GKE Ingress, Compute Engine backends.

## When to avoid

- Non-HTTPS or non-GCP-LB origins — use third-party CDN.

## Cross-references

- Cloud equivalents: [[CDN-Architecture-Design|Azure Front Door / CDN]] · [[CloudFront|AWS CloudFront]]
- Pairs with: [[Cloud-Load-Balancing]] · [[Cloud-Armor]] · [[CDN-Cache-Optimization]] · [[TLS-Certificate-Management]]

**Analysis only — verify against vendor documentation before applying.**
