---
type: service
name: AWS Cloud WAN
cloud: aws
category: networking
specialists: ["cn_mcn", "cn_hyb"]
aliases: ["Cloud WAN", "AWS Cloud WAN"]
tags: ["cloud-wan", "global", "core-network", "segmentation"]
status: stub
updated: 2026-06-01
---
# AWS Cloud WAN

Managed global WAN service that builds a unified core network across Regions with [[Network-Segmentation|segmentation policies]], replacing manual mesh of [[Transit-Gateway|TGW]] peerings.

## When to use

- Multi-region AWS footprints where [[Transit-Gateway|TGW]] peering meshes become unmanageable.
- Global SaaS / enterprise with declarative segmentation requirements (prod/dev/shared).
- Replacing third-party SD-WAN overlays for AWS-to-AWS routing.

## When to avoid

- Single-region or 2–3 region deployments — [[Transit-Gateway|TGW]] + peering is cheaper.
- Heavy SD-WAN integration with non-AWS branches — combine with vendor SD-WAN ([[FortiGate]], [[Cisco-ASA-FTD|Cisco]], etc.).

## Cross-references

- Cloud equivalents: [[Virtual-WAN|Azure Virtual WAN]] · [[Network-Connectivity-Center|GCP NCC]]
- Pairs with: [[Transit-Gateway]] · [[Direct-Connect]] · [[Network-Segmentation]] · [[Cloud-Network-Service-Mapping]]

**Analysis only — verify against vendor documentation before applying.**
