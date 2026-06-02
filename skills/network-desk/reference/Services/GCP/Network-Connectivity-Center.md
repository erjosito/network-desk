---
type: service
name: GCP Network Connectivity Center
cloud: gcp
category: networking
specialists: ["cn_mcn", "cn_hyb"]
aliases: ["Network Connectivity Center", "NCC"]
tags: ["ncc", "hub", "spokes", "transit"]
status: stub
updated: 2026-06-01
---
# GCP Network Connectivity Center

[[Hub-and-Spoke]] transit service that interconnects VPCs, [[HA-VPN|HA VPN]] tunnels, [[Cloud-Interconnect|Interconnect]] attachments, and third-party SD-WAN appliances under a single managed hub.

## When to use

- Centralising hybrid + multi-VPC routing in GCP without manual mesh.
- Integrating third-party SD-WAN appliances (Cisco SD-WAN, Versa, etc.) as router appliance spokes.
- Cross-region GCP backbones replacing custom [[Cloud-Router|Cloud Router]] stitching.

## When to avoid

- Single-VPC or 2-VPC deployments — direct VPC peering is simpler.

## Cross-references

- Cloud equivalents: [[Virtual-WAN|Azure Virtual WAN]] · [[Cloud-WAN|AWS Cloud WAN]]
- Pairs with: [[Cloud-Interconnect]] · [[HA-VPN]] · [[Cloud-Router]] · [[Hub-and-Spoke]] · [[Transit-Hub]]

**Analysis only — verify against vendor documentation before applying.**
