---
type: service
name: GCP Cloud Router
cloud: gcp
category: networking
specialists: ["cn_hyb"]
aliases: ["Cloud Router"]
tags: ["bgp", "dynamic-routing", "ha-vpn", "interconnect"]
status: stub
updated: 2026-06-01
---
# GCP Cloud Router

Managed BGP speaker that terminates dynamic routing for [[HA-VPN|HA VPN]] and [[Cloud-Interconnect|Cloud Interconnect]] attachments, with regional or global dynamic-routing modes and per-peer custom advertisements.

## When to use

- Anywhere BGP is required for hybrid connectivity in GCP.
- Controlling route propagation between hybrid attachments and VPCs via custom advertisements.

## When to avoid

- Static routing only — Cloud Router still needs to exist for the attachment but advertisements are minimal.

## Cross-references

- Cloud equivalents: [[ExpressRoute]] Gateway BGP · [[Site-to-Site-VPN|AWS VPN]] / [[Direct-Connect|DX]] BGP
- Pairs with: [[BGP-Design]] · [[Cloud-Interconnect]] · [[HA-VPN]] · [[Network-Connectivity-Center]]

**Analysis only — verify against vendor documentation before applying.**
