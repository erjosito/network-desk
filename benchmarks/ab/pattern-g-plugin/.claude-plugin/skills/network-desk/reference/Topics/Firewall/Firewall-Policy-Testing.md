---
type: topic
name: Firewall Policy Testing and Rule Simulation
specialists: [cn_fw]
tags: [firewall, testing, rule-simulation, validation]
status: stable
updated: 2026-06-01
---
# Firewall Policy Testing and Rule Simulation

> Pairs with [[Firewall-Policy-Design]] (write) and [[Firewall-Rule-Audit]] (review). Use this skill to **validate** rules — proposed or live — **before** they reach production. Analysis only: never modify rules without explicit user confirmation.

## Purpose

Test firewall rules without putting traffic at risk. Covers vendor-native simulators, log-driven validation, packet-trace tools, automated rule-coverage testing, and a structured pre-deployment checklist.

---

## Decision tree — which test mode?

```mermaid
flowchart TD
    A[Need to validate a rule] --> B{Rule already deployed?}
    B -- No --> C[Pre-deploy simulator<br/>tools that match against the policy]
    B -- Yes --> D{Have production traffic logs?}
    D -- Yes --> E[Log-driven test<br/>shadow rules + log + measure hit-rate]
    D -- No --> F[Live packet trace<br/>per-packet path through policy]
    C --> G[Compare expected vs simulated verdict]
    E --> G
    F --> G
    G --> H{All test cases pass?}
    H -- Yes --> I[Promote with rollback plan]
    H -- No --> J[Revise → re-test]
```

---

## Vendor-native simulators

Vendor-specific policy testing details have been extracted to per-vendor pages:

- **[[Vendors/Azure-Firewall#Policy testing|Azure Firewall]]**
- **[[Vendors/AWS-Network-Firewall#Policy testing|AWS Network Firewall]]**
- **[[Vendors/PAN-OS#Policy testing|PAN-OS (Palo Alto Networks)]]**
- **[[Vendors/FortiGate#Policy testing|FortiGate (Fortinet)]]**
- **[[Vendors/Check-Point#Policy testing|Check Point]]**
- **[[Vendors/Cisco-ASA-FTD#Policy testing|Cisco ASA / Firepower (FTD)]]**

### Vendor validation matrix

| Platform | Primary pre-deploy validation | Runtime/log validation |
|---|---|---|
| [[Azure-Firewall|Azure Firewall]] | Policy Analytics, rule hit metrics, non-prod policy clone | Azure Monitor resource-specific logs; verify current tables in Azure docs |
| [[AWS-Network-Firewall|AWS Network Firewall]] | Stateless analyzer for stateless groups; Suricata syntax + lab endpoint for stateful groups | CloudWatch/S3/Kinesis alert and flow logs |
| [[GCP-Cloud-Firewall|GCP Cloud Firewall]] / [[Cloud-Armor|Cloud Armor]] | `gcloud` describe/dry-run where supported; preview [[Cloud-Armor|Cloud Armor]] policy rules | Firewall Rules Logging and [[Cloud-Armor|Cloud Armor]] request logs |
| Palo Alto PAN-OS | `test security-policy-match`, commit validation, BPA/Policy Optimizer | Traffic logs, threat logs, rule hit counts |
| Fortinet FortiGate | `diagnose firewall policy lookup`, FortiManager install preview | FortiAnalyzer reports, debug flow, packet sniffer |
| [[Check-Point|Check Point]] | SmartConsole policy analysis and verify/install preview | SmartLog, `fw monitor`, hit counts |
| Cisco ASA/FTD | `packet-tracer`, FMC policy comparison/deploy preview | Connection events, ASP drops, syslog |
| [[Juniper-SRX|Juniper SRX]] | `show security match-policies`, commit check/confirmed commit | `show security flow session`, policy hit counts, traceoptions |
| Zscaler ZIA/ZPA | Admin Portal policy test/preview where available; scoped pilot policy | NSS logs, user/session logs, test users/locations |
| [[Sophos-XG|Sophos XG]]/XGS | Policy simulation/validation in UI where available; lab appliance | Log Viewer, [[Packet-Capture|packet capture]], conntrack diagnostics |
| OPNsense | Config validation, `pfctl -nf` on generated pf rules when applicable | `pfctl -sr -v`, live logs, [[Packet-Capture|packet capture]] |
| pfSense | Config validation, `pfctl -nf` on generated pf rules when applicable | `pfctl -sr -v`, firewall logs, [[Packet-Capture|packet capture]] |
| VyOS | `commit-confirm`, lab config load, verify release-specific syntax | `show firewall ... statistics`, `monitor firewall`, packet capture |
| iptables/nftables | `iptables-restore --test` / `nft --check -f` | TRACE/log-only chains, counters, conntrack |

- **[[Vendors/OPNsense#Policy testing|OPNsense]]**
## Log-driven validation (production)

When the rule is already live but you need confidence:

1. **Add a logging-only shadow rule** above the rule under test (same match criteria, action = log+pass-through).
2. Let it run for 24-72h covering your traffic patterns (include peak, batch windows, off-hours).
3. **Compare hit volumes**: shadow rule hits ≈ expected rule hits. If shadow ≫ expected, you have unintended matches.
4. **Cross-reference with flow logs**: NSG flow logs (Azure), VPC Flow Logs (AWS), VPC Flow Logs (GCP) — confirm the same 5-tuples appear at the network layer.
5. **Look for shadowed cases**: traffic that *would have* matched the shadow rule but hit an earlier-matching rule first → that earlier rule is shadowing your new one.

---

## Automated test-cases (treat rules as code)

Test rule changes the same way you test application code:

```yaml
# tests/fw-policy.yaml
cases:
  - name: "App tier to DB tier on 5432 allowed"
    src: 10.1.10.5
    dst: 10.1.20.10
    port: 5432
    proto: tcp
    expected: allow
    expected_rule: app-to-db

  - name: "App tier to internet on 443 must go via proxy"
    src: 10.1.10.5
    dst: 203.0.113.10
    port: 443
    proto: tcp
    expected: deny
    reason: "Direct egress to internet bypasses content inspection"

  - name: "DB tier outbound DNS allowed only to internal resolver"
    src: 10.1.20.10
    dst: 10.0.0.4
    port: 53
    proto: udp
    expected: allow
    expected_rule: db-dns-internal

  - name: "DB tier outbound DNS to public resolver denied"
    src: 10.1.20.10
    dst: 1.1.1.1
    port: 53
    proto: udp
    expected: deny
```

Run via a harness that calls the vendor simulator (`test security-policy-match`, `packet-tracer`, `diagnose firewall policy lookup`, etc.) and asserts the verdict. Run on **every PR** that changes the rule base. Integrate with [[Network-CICD-Pipeline]].

---

## Common bug classes to test for explicitly

| Bug class | Test technique |
|---|---|
| **Rule shadowing** (earlier rule overrides intent) | Simulate the *exact* 5-tuple of the new rule; verify the matched rule name equals expected. |
| **Order-dependence after refactor** | Re-run full test suite after any rule reorder. |
| **Asymmetric return path** | Test reverse 5-tuple too; stateful FW should remember session, stateless requires explicit return rule. |
| **NAT-after-policy vs policy-after-NAT** confusion | Test with both pre-NAT and post-NAT addresses; vendors differ (PAN matches pre-NAT, ASA matches post-NAT). |
| **IP-group / object drift** | After updating an address object, replay tests for every rule referencing it. |
| **Application-layer mismatch** | For app-aware FWs (PAN, FortiGate, Azure FW), test with explicit `application=` to catch SSL-decoy traffic. |
| **Default-deny misinterpretation** | Always include at least one negative case (traffic that should be blocked) — easy to miss. |
| **Time-based rule windows** | Run simulator at boundary times (00:00, 23:59) for time-restricted rules. |

---

## Pre-deployment checklist

- [ ] Every new/changed rule has a written **intent statement** (allow X to Y for Z).
- [ ] At least one **positive test case** per intent statement.
- [ ] At least one **negative test case** (traffic that must NOT match).
- [ ] All test cases run through the vendor simulator and pass.
- [ ] Shadow-rule logging on production for ≥ 24 h with hit volume reviewed.
- [ ] Rule placement verified — no shadowing by earlier rules (vendor analyzer or `test ... match` for the rule directly above).
- [ ] **Rollback plan** documented: how to revert (config snapshot, `git revert`, restore-from-Panorama).
- [ ] Change-window scheduled; impact-aware (peak-hour avoidance).
- [ ] Post-deploy: 30-min observation window with hit-count alerts on the new rule.

---

## References

- [[Azure-Firewall|Azure Firewall]] Policy Analytics: https://learn.microsoft.com/azure/firewall/policy-analytics
- [[AWS-Network-Firewall|AWS Network Firewall]] logs and analysis: https://docs.aws.amazon.com/network-firewall/latest/developerguide/firewall-logging.html
- PAN-OS `test security-policy-match`: https://docs.paloaltonetworks.com/pan-os/network-security/security-policy/security-policy-best-practices/policy-test
- FortiGate policy lookup: https://docs.fortinet.com/document/fortigate/latest/cli-reference (search "diagnose firewall policy lookup")
- Cisco packet-tracer: https://www.cisco.com/c/en/us/td/docs/security/asa/asa97/configuration/general/asa-97-general-config/admin-trshoot.html
**Analysis only — verify against vendor documentation before applying.**
