---
type: service
name: GCP Cloud Interconnect
cloud: gcp
category: networking
specialists: [cn_hyb]
aliases: [Cloud Interconnect, Dedicated Interconnect, Partner Interconnect]
tags: [cloud-interconnect, hybrid, bgp, dedicated-circuit]
status: stable
updated: 2026-06-01
---
# GCP Cloud Interconnect

GCP Cloud Interconnect provides dedicated private connectivity between on-premises networks and Google Cloud VPCs via [[Cloud-Router|Cloud Router]] BGP sessions over VLAN attachments. This is the GCP analogue of [[ExpressRoute|Azure ExpressRoute]] and [[Direct-Connect|AWS Direct Connect]].

---

## Summary

Two flavors: **Dedicated Interconnect** (your fiber into Google's edge at a colo facility) and **Partner Interconnect** (a Google Cloud partner provisions the last mile). Both terminate as **VLAN attachments** on a regional [[Cloud-Router|Cloud Router]] in a VPC.

## When to use / when to avoid

**Use when:**
- Throughput requirements exceed what [[HA-VPN|HA VPN]] can sustain, or you need predictable RTT to a specific region.
- You want to reach multiple VPCs across regions through a single circuit via [[Cloud-Router|Cloud Router]] + global routing.
- You're integrating with [[Network-Connectivity-Center|GCP Network Connectivity Center]] for hybrid mesh topologies.

**Avoid when:**
- Bandwidth < 50 Mbps and the workload tolerates internet path — [[HA-VPN|HA VPN]] is faster to provision and cheaper.

---

## Dedicated Interconnect

Physical 10 Gbps or 100 Gbps connections at GCP colocation facilities. Customer provisions cross-connects between their router and Google's peering edge. Supports up to 8 connections per interconnect for link aggregation (LACP). SLA: 99.9% with single interconnect, 99.99% with recommended topology (4 connections across 2 metro areas).

---

## Partner Interconnect

Connections through a Google Cloud Partner (50 Mbps to 50 Gbps). Partner handles the physical connectivity to Google. Suitable when the customer's data center is not at a GCP colocation facility or when lower bandwidth is sufficient.

---

## VLAN Attachments

Connect an interconnect (Dedicated or Partner) to a VPC network via [[Cloud-Router|Cloud Router]]. Each VLAN attachment is assigned a VLAN ID and creates a BGP session with the [[Cloud-Router|Cloud Router]]. Multiple VLAN attachments can share a single interconnect.

---

## MED-Based Routing

GCP uses Multi-Exit Discriminator (MED) for inbound traffic engineering on Cloud Interconnect:

- [[Cloud-Router|Cloud Router]] advertises VPC subnets with MED values based on the region of the VPC subnet relative to the interconnect location.
- Local region subnets: MED = 100 (preferred)
- Remote region subnets: MED = 200+ (based on inter-region distance)
- On-premises routers should honor MED to route traffic to the nearest interconnect.

---

## Configuration Commands

```bash
# Create VLAN attachment for Dedicated Interconnect
gcloud compute interconnects attachments dedicated create my-attachment \
  --interconnect=my-interconnect \
  --router=my-cloud-router \
  --region=us-central1 \
  --bandwidth=1g \
  --vlan=100

# Verify BGP session status
gcloud compute routers get-status my-cloud-router \
  --region=us-central1
```

---

## Common pitfalls

1. **Single-metro deployment for SLA** — the 99.99% SLA requires 4 connections across **2 distinct metros**; 4 connections at 1 metro only gives 99.9%.
2. **MED ignored on-premises** — if your edge router strips/overwrites MED, traffic doesn't return on the closest interconnect and you eat avoidable inter-region latency.
3. **Global vs regional dynamic routing** — VPCs default to *regional* dynamic routing. Switch to *global* if you want VLAN attachments in one region to advertise to subnets in other regions (otherwise on-prem can't see them).
4. **Partner Interconnect bandwidth changes** — bandwidth is partner-controlled. Bumping speed requires coordination with the partner; not a self-service change.
5. **No native encryption** — Cloud Interconnect is unencrypted at L2. Layer MACsec (where supported) or run [[HA-VPN|HA VPN]] over the interconnect ([[HA-VPN|HA VPN]] over Cloud Interconnect) for compliance.

---

## Cross-references

- Cloud equivalents: [[ExpressRoute|Azure ExpressRoute]] · [[Direct-Connect|AWS Direct Connect]]
- Pairs with: [[Cloud-Router]] · [[BGP-Design]] · [[Hybrid-Failover-Design]] · [[Network-Connectivity-Center]]
- Producer-side topics: [[Routing-Debug]] · [[Dedicated-Circuit-Pricing]]

**Analysis only — verify against vendor documentation before applying.**
