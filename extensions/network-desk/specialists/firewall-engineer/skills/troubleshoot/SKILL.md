# Skill: Firewall Troubleshooting (`fw_skill_troubleshoot`)

Diagnose firewall-related connectivity, performance, and policy issues across all 14 supported platforms. Owns the *systematic-methodology discipline* (define the failure → reproduce → identify path → check policy → check NAT → check session table → check counters / drops → check HA / sync state → check logs → fix → verify), the *5-tuple-first rule* (every troubleshoot starts with src IP, src port, dst IP, dst port, protocol), the *follow-the-packet trace* (use vendor packet-tracer / show-session / debug-flow to see actual evaluation), the *log-correlation-window discipline* (look at logs ±5 min from the reported failure timestamp, in the firewall's TZ), the *NAT-pre-vs-post awareness* (rules evaluated against original or translated 5-tuple depending on vendor), the *HA-state-check mandate* (failover or sync issues masquerade as policy bugs), the *don't-blindly-edit-prod rule* (root-cause first; rule changes go through `policy-test` + `policy-design`), and the *escalation-cutoff* (after 30 min vendor TAC; capture supportsave / tech-support file). Per-vendor diagnostic commands, common-issues catalogue, troubleshooting methodology, and procedure live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *systematic methodology*, the *5-tuple-first* rule, the *follow-the-packet* trace discipline, the *log-correlation-window* rule (±5 min, firewall TZ), the *NAT-pre-vs-post* awareness, the *HA-state-check* mandate, the *don't-edit-prod-without-root-cause* rule, and the *escalation-cutoff* discipline. Per-vendor diagnostic commands (PAN-OS test-security-policy-match / show-session / debug flow basic, FortiGate diagnose sniffer / diagnose debug flow / policy lookup, Check Point fw monitor / fw ctl chain / fw ctl pstat, ASA packet-tracer / capture, SRX flow filter / packet-tracing, Azure FW logs + Connection Troubleshoot, AWS NFW logs + Reachability Analyzer, GCP Cloud FW logs + Connectivity Tests, iptables -nvL + counters, Sophos / OPNsense / pfSense / VyOS / Zscaler), common-issues catalogue, methodology checklist, and procedure live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Firewall-Troubleshooting" })` for the methodology, per-vendor diagnostic commands, common-issues catalogue, and procedure.
2. For *hunting* patterns in firewall logs (top denied, geo, brute-force), redirect to `log-analysis`.
3. For *changing* the policy after root cause is found, redirect to `policy-design` (re-design) or `config-gen` (specific rule) + `policy-test`.

If a vendor / failure mode isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_fw" })`.

---

## When to use troubleshoot

| Scenario | Behaviour |
|---|---|
| "User can't reach app on port X — blocked at firewall?" | 5-tuple → packet-tracer → policy match → NAT trace → session table → log |
| "Intermittent drops on this flow" | Check HA state, session table evict, hash-pinning, asymmetric routing |
| "Throughput dropped" | Check sessions/CPU, IDS/IPS load, signature update event, HA failover event |
| "Tunnel up but no traffic" | Check IKE/IPsec SA + child SA + crypto-map / proposals + route + log |
| "FQDN rule worked then stopped" | DNS TTL race; check FQDN cache + DNS resolver |
| "VPN client can reach Azure but not on-prem via VPN" | UDR / route-table audit + firewall rule + asymmetric routing |
| Hunting in logs broadly (not a specific failure) | Redirect: `cn_skill({ specialist: "cn_fw", skill: "log-analysis" })` |
| Once root cause is known: re-design needed | Redirect: `cn_skill({ specialist: "cn_fw", skill: "policy-design" })` |
| Once root cause is known: rule-fix only | Redirect: `cn_skill({ specialist: "cn_fw", skill: "config-gen" })` + `policy-test` |
| HA-specific failover diagnosis | Apply HA-state-check + cite `cn_skill({ specialist: "cn_fw", skill: "ha-design" })` |
| Cross-domain (firewall + load balancer + DNS) | Apply this + `cn_skill({ specialist: "cn_ntsh", skill: "connectivity-troubleshoot" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical firewall-troubleshooting reference — systematic methodology, per-vendor diagnostic commands (PAN-OS, FortiGate, Check Point, ASA, SRX, Azure FW, AWS NFW, GCP Cloud FW, iptables/nftables, Sophos, OPNsense, pfSense, VyOS, Zscaler), common issues + solutions (asymmetric routing, NAT bypass, FQDN race, MTU/MSS, session table fill, HA split-brain, signature update outage, TLS inspection cert issues) | [[Firewall-Troubleshooting]] | `cn_vault_page({ page: "Firewall-Troubleshooting" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Vendor + version**.
2. **Symptom statement** — what is failing? since when? for whom?
3. **5-tuple** — src IP, src port, dst IP, dst port, protocol.
4. **Reproducibility** — always / intermittent / once.
5. **Timestamp** of failure (in firewall TZ + user TZ).
6. **Topology** — direct / via VPN / via cloud LB / via inspection NVA / asymmetric possibility.
7. **Recent changes** — rule pushes, signature updates, HA events, vendor upgrades.
8. **Vendor-support readiness** — supportsave / tech-support / show-tech file already captured?

---

## Workflow

1. **Collect inputs** above.
2. **Load `Firewall-Troubleshooting`**.
3. **State the 5-tuple** explicitly. If missing, refuse to proceed.
4. **Reproduce** — synthetic curl / nc / Test-NetConnection / ping from the source.
5. **Run vendor packet-tracer** from vault — exact CLI for the platform with the 5-tuple.
6. **Check policy match** — which rule matched? expected vs actual?
7. **Check NAT** — pre-NAT vs post-NAT 5-tuple; some vendors evaluate rules pre-NAT, others post-NAT.
8. **Check session table** — is there a stale session pinning to a stale path?
9. **Check counters / drops** — interface drops, IDS drops, threat-prevention drops, session-table evictions.
10. **Check HA state** — failover events? sync state? both nodes thinking they're primary (split-brain)?
11. **Check logs** in the ±5 min window in firewall TZ — deny logs, threat logs, system logs (signature update / HA / commit).
12. **Check route / UDR / asymmetric routing** — for stateful firewalls, asymmetric path = drop.
13. **Apply common-issues catalogue** from vault — FQDN TTL race, MTU/MSS, TLS inspection cert chain, time-based rule timezone drift, geo-block customer VPN exit, signature update outage, ARP / GARP failover lag.
14. **Determine root cause** — never edit prod blindly; once root cause is identified, route to `policy-design` (re-design) / `config-gen` (rule fix) / `ha-design` (HA fix) / `hardening-check` (hardening fix).
15. **For unresolved >30 min** — capture supportsave / tech-support / show-tech file + open vendor TAC case.
16. **Surface anti-patterns** — blind rule edits in prod, missing 5-tuple, ignoring HA state, wrong TZ for log correlation, no packet-tracer run.
17. **Emit** in the output format below.

---

## Output format

Every troubleshoot answer should emit:

1. **Inputs assumed** — vendor + version, 5-tuple, symptom, reproducibility, recent changes.
2. **Hypothesis** — likely failure mode (policy / NAT / session table / HA / route / FQDN / MTU / TLS / signature).
3. **Diagnostic commands** — exact per-vendor CLI from vault, in evaluation order.
4. **Expected vs actual** — what should match / drop / forward, what actually does.
5. **Root cause** statement.
6. **Remediation pointer** — `policy-design` / `config-gen` / `ha-design` / `hardening-check` / `vendor-migrate` / supplier TAC.
7. **Verification steps** — how to confirm the fix worked + how to monitor for recurrence.
8. **Evidence captured** for change record (logs, packet-tracer output, supportsave if escalated).
9. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
10. **What this excludes** — log hunting (`log-analysis`), policy design (`policy-design`), config gen (`config-gen`), hardening (`hardening-check`).
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Editing the production rule base before identifying root cause.** Often the rule is fine; the failure is NAT order / route / HA / signature.
2. **No 5-tuple captured.** Diagnostics turn into a guessing game.
3. **Skipping the packet-tracer / debug-flow.** The vendor's own tool tells you exactly what the firewall evaluated.
4. **Ignoring HA state.** Sync failures and split-brain look like policy bugs.
5. **Correlating logs in user TZ instead of firewall TZ.** Miss the actual log entry by hours.
6. **No NAT-pre-vs-post check.** Rules evaluate against the wrong 5-tuple; rule looks wrong but isn't.
7. **No asymmetric-routing check.** Stateful firewall sees only one direction; drop.
8. **No FQDN-TTL check.** Rule using `*.example.com` racing DNS resolver.
9. **No MTU / MSS check.** TCP completes handshake then drops on first large payload.
10. **No TLS-inspection cert-chain check.** Cert validation fails downstream; firewall drops.
11. **No signature-update event correlation.** Failure starts exactly at last sig update → known issue.
12. **No supportsave / tech-support file when escalating.** Vendor TAC starts from zero.

**Analysis only — verify against vendor documentation before applying.**
