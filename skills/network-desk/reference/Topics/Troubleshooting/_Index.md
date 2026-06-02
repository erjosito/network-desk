---
type: index
name: Troubleshooting (decision tree)
tags: [troubleshooting, diagnostics, decision-tree, index]
specialists: [cn_ntsh, cn_vnet, cn_fw, cn_lb, cn_dns, cn_pl, cn_hyb, cn_nsec, cn_vwan, cn_nmon, cn_cnet, cn_cdn, cn_ipv6]
updated: 2026-06-01
---

# Troubleshooting (decision tree)

This folder holds **vendor-agnostic, cross-cutting techniques** — the toolbox you reach for regardless of which cloud or product is involved. Domain-specific runbooks (CDN, DNS, Firewall, VWAN, etc.) live under their own domain folders, not here.

Pick the closest symptom and follow the pointer.

## Symptom → start here

| Symptom | Start at |
|---|---|
| "It's slow." (latency, jitter, throughput shortfall) | [[Network-Latency-Analysis]] → [[Throughput-Calculations]] |
| "It doesn't connect at all." (no SYN/ACK, no ping, asymmetric) | [[Connectivity-Testing]] → [[Routing-Debug]] |
| "It connects then breaks at random sizes." (works for small payloads, hangs on large) | [[MTU-and-PMTUD]] |
| "TLS handshake fails / cert errors." | [[TLS-Handshake-Debugging]] |
| "NAT is broken." (port exhaustion, source IP mismatch, hairpin) | [[NAT-Debugging]] |
| "I need raw packets." | [[Packet-Capture]] → [[PCAP-Analysis]] |
| "Path is wrong." (BGP, route table, next-hop wrong, asymmetric routing) | [[Routing-Debug]] |

## Symptom is domain-specific → jump out of this folder

| Domain | Runbook |
|---|---|
| CDN / origin / edge / cache misses | [[../CDN/CDN-Troubleshooting]] |
| Containers / Pods / Services / Ingress | [[../Containers/Container-Networking-Troubleshooting]] |
| DNS resolution failures | [[../DNS/DNS-Troubleshooting]] |
| Firewall drops / rule mis-match | [[../Firewall/Firewall-Troubleshooting]] |
| Hybrid (ExpressRoute / VPN / Direct Connect / Interconnect / SD-WAN) | [[../Hybrid/Hybrid-Connectivity-Troubleshooting]] |
| IPv6 specifics (RA, NDP, dual-stack confusion) | [[../IPv6/IPv6-Troubleshooting]] |
| Load Balancer / health probes / backend unhealthy | [[../Load-Balancing/Load-Balancer-Troubleshooting]] |
| Private Endpoint / PrivateLink DNS / NIC | [[../Private-Link/Private-Endpoint-Troubleshooting]] |
| NSG / Security Group / WAF | [[../Security/Network-Security-Troubleshooting]] |
| Virtual WAN (hub / branch / routing-intent) | [[../VWAN/VWAN-Troubleshooting]] |

## Method — when no symptom isolates the layer

Work bottom-up, narrowest scope first. Confirm L1/L2 (link, interface counters, MTU) before chasing L3 (routing, NAT), L4 (TCP state, sockets), then L7 (TLS, app). Capture from both ends when possible; one-sided captures lie about what the other side actually saw.

A typical 5-minute triage:

1. **Reproduce.** Pin down what fails, what works. Symmetric or one-direction? Always, intermittent, or burst-correlated?
2. **Topology mental model.** Draw the path from source to destination — every hop that can drop, NAT, inspect, or rate-limit a packet.
3. **Bisect the path.** Probe from a midpoint (jump host, NVA console, FW logs). Halve the suspect zone.
4. **Capture if needed.** [[Packet-Capture]] when logs are ambiguous; [[PCAP-Analysis]] for the post-mortem.
5. **Match symptom to discipline.** Drop into the relevant table above.

---
Analysis only — verify against vendor documentation before applying.
