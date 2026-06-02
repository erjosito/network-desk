---
type: topic
name: Firewall Troubleshooting
specialists: [cn_fw, cn_ntsh]
tags: [firewall, troubleshooting, diagnostics]
status: stable
updated: 2026-06-01
---
# Firewall Troubleshooting

## Purpose

Systematically diagnose and resolve firewall connectivity issues across all 14 supported platforms. Follow a structured packet-flow methodology to isolate whether the problem is in policy, NAT, routing, or the network path itself.

---

## Troubleshooting Methodology

Follow these steps in order — do not skip ahead:

```
1. IDENTIFY SYMPTOMS
   └─ What is failing? (connection timeout, reset, ICMP unreachable, partial connectivity)
   └─ Is it new traffic or existing sessions breaking?
   └─ When did it start? (correlate with change windows)

2. CHECK PACKET FLOW (Does the packet reach the firewall?)
   └─ Packet capture on ingress interface
   └─ Verify source routing / ARP resolution

3. VERIFY POLICY (Is the traffic permitted by a rule?)
   └─ Identify which rule matches (or if default deny hits)
   └─ Check for shadow rules intercepting the traffic

4. CHECK NAT (Is NAT translating correctly?)
   └─ Source NAT — verify post-NAT source IP
   └─ Destination NAT — verify pre-NAT vs post-NAT destination
   └─ NAT hairpin / loopback scenarios

5. VERIFY ROUTING (Is the return path correct?)
   └─ Check routing table on the firewall
   └─ Asymmetric routing — return traffic via a different path?

6. INSPECT SESSION TABLE (Is a session established?)
   └─ Session present? State? Timeout?
   └─ TCP state issues (SYN_SENT, half-open, etc.)

7. CHECK MTU / FRAGMENTATION
   └─ MSS clamping, PMTUD, tunnel overhead

8. VERIFY APPLICATION LAYER
   └─ L7 inspection blocking? (App-ID, IPS, URL filter, SSL inspection)
```

---

## Per-Vendor Diagnostic Commands

Vendor-specific troubleshooting details have been extracted to per-vendor pages:

- **[[Vendors/Azure-Firewall#Troubleshooting|Azure Firewall]]**
- **[[Vendors/AWS-Network-Firewall#Troubleshooting|AWS Network Firewall]]**
- **[[Vendors/GCP-Cloud-Firewall#Troubleshooting|GCP Cloud Firewall]]**
- **[[Vendors/PAN-OS#Troubleshooting|PAN-OS (Palo Alto Networks)]]**
- **[[Vendors/FortiGate#Troubleshooting|FortiGate (Fortinet)]]**
- **[[Vendors/Check-Point#Troubleshooting|Check Point]]**
- **[[Vendors/Cisco-ASA-FTD#Troubleshooting|Cisco ASA / Firepower (FTD)]]**
- **[[Vendors/Juniper-SRX#Troubleshooting|Juniper SRX]]**
- **[[Vendors/Zscaler#Troubleshooting|Zscaler (ZIA / ZPA)]]**
- **[[Vendors/Sophos-XG#Troubleshooting|Sophos XG / XGS]]**
- **[[Vendors/OPNsense#Troubleshooting|OPNsense]]**
- **[[Vendors/pfSense#Troubleshooting|pfSense]]**
- **[[Vendors/VyOS#Troubleshooting|VyOS]]**
- **[[Vendors/iptables-nftables#Troubleshooting|iptables / nftables]]**

## Common Issues and Solutions

| Issue | Symptom | Investigation | Resolution |
|-------|---------|---------------|------------|
| **Asymmetric routing** | Intermittent drops, TCP RSTs | Session table shows half-open sessions; packet captures show traffic entering one interface but return traffic on another | Fix routing to ensure symmetric paths, or disable state checking on affected interfaces (last resort) |
| **MTU / PMTUD failure** | Large transfers fail, small packets work | Capture shows fragmented packets or ICMP "need to frag" being dropped | Set MSS clamping (`set tcp-mss-adjust`), allow ICMP type 3 code 4, reduce MTU |
| **NAT hairpin** | Internal hosts cannot reach public IP of internal server | DNAT works from outside but fails from inside (same zone) | Configure NAT hairpin / reflection / U-turn NAT; ensure source NAT is applied for same-zone DNAT traffic |
| **Implicit deny hit** | New traffic flow blocked with no matching explicit deny rule | Logs show default deny rule match | Add an explicit allow rule for the traffic flow |
| **Session timeout** | Long-lived connections drop after inactivity | Session table shows session aging out | Increase session timeout for the specific application; configure TCP keepalives on endpoints |
| **L7 inspection blocking** | HTTPS or app traffic blocked despite L4 allow rule | SSL decryption errors, App-ID mismatch, IPS signature match | Check security profiles, SSL decryption exceptions, application overrides |

---
**Analysis only — verify against vendor documentation before applying.**
