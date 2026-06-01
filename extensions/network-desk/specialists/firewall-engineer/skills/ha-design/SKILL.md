# Skill: Firewall HA Design (`fw_skill_ha_design`)

Design firewall high-availability topologies across cloud-native services (Azure Firewall, AWS Network Firewall, GCP Cloud Firewall — built-in HA) and NVA / on-prem deployments (PAN-OS, FortiGate, Check Point, Cisco ASA, Juniper SRX, Sophos XG, OPNsense / pfSense, VyOS). Owns the *HA-mode decision* (active/passive vs active/active vs active/active with session sync), the *session-sync mandate* (without it, failover drops every established connection), the *config-sync direction discipline* (one primary; don't let both ends drift independently), the *dedicated-heartbeat-network rule* (heartbeat must not share the data plane — split-brain risk), the *heartbeat-timer trade-off* (aggressive = fast failover + false positives; conservative = slow failover + stability), the *floating-IP / EIP failover pattern* in cloud (the cloud-equivalent of VRRP/HSRP), and the *split-brain prevention* (preempt off in active/passive, fence on heartbeat loss for active/active). Cloud-native managed firewalls inherit HA; for NVA deployments, all the items above are mandatory.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *HA-mode decision*, the *session-sync-or-failover-drops-everything* rule, the *config-sync-one-primary* discipline, the *dedicated-heartbeat-network* mandate, the *heartbeat-timer trade-off*, the *floating-IP-or-EIP-failover-in-cloud* pattern, and the *preempt-off + fence-on-heartbeat-loss* split-brain prevention. Per-vendor HA modes, session-sync protocols, config-sync mechanisms, cloud-specific HA patterns (UDR + Standard LB / Gateway LB / NLB), and the design checklist live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Firewall-HA-Design" })` for per-vendor HA modes (PAN-OS A/P + A/A, FortiGate FGCP / FGSP, Check Point ClusterXL, ASA failover, SRX chassis cluster, Sophos XG HA, OPNsense/pfSense CARP, VyOS VRRP / Conntrackd), session and config sync protocols, heartbeat network design, cloud-specific failover patterns (Azure UDR + Standard LB, AWS Gateway LB / NLB, GCP ILB), open-source HA, and the design checklist.
2. For cloud-native firewalls (Azure FW / AWS NFW / GCP Cloud FW), HA is managed by the service — confirm regional design but skip NVA-specific decisions.
3. For HA-specific config generation, redirect to `config-gen` after the design is finalised.

If a vendor / pattern isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_fw" })`.

---

## When to use ha-design

| Scenario | Behaviour |
|---|---|
| "Design HA for our PAN-OS pair in Azure" | A/P with floating IP via Azure Standard LB + UDR + HA1/HA2 dedicated subnets |
| "Should we go active/active or active/passive?" | Apply A/P-vs-A/A-vs-A/A-with-sync decision table |
| "Heartbeat keeps flapping" | Apply dedicated-heartbeat + heartbeat-timer trade-off |
| "We failed over and lost every connection" | Session sync missing or misconfigured |
| "Config drifted between HA pair" | Apply config-sync-one-primary discipline; reset secondary |
| "FortiGate FGCP vs FGSP — which?" | FGCP for cluster-of-2; FGSP when you need to scale beyond 2 (cite vault) |
| "Cloud-native HA — what's covered?" | Azure FW / AWS NFW / GCP Cloud FW: zone-redundant; you only design regional placement |
| Generating HA config | Redirect: `cn_skill({ specialist: "cn_fw", skill: "config-gen" })` after design finalised |
| Hardening the HA pair | Redirect: `cn_skill({ specialist: "cn_fw", skill: "hardening-check" })` |
| HA migration / vendor swap | Redirect: `cn_skill({ specialist: "cn_fw", skill: "vendor-migrate" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical firewall-HA reference — per-vendor HA modes (PAN-OS, FortiGate FGCP/FGSP, Check Point ClusterXL, ASA failover, SRX chassis cluster, Sophos XG, CARP, VRRP+Conntrackd), session-sync (HA2, FGSP, sync_master, stateful failover), config-sync (HA1, FortiManager push, mgmt CMA, write standby auto), heartbeat network design + dedicated interfaces + timer recommendations, cloud-specific patterns (Azure UDR+SLB, AWS GWLB/NLB, GCP ILB), open-source HA (CARP, VRRP+Conntrackd), design checklist | [[Firewall-HA-Design]] | `cn_vault_page({ page: "Firewall-HA-Design" })` |

Mandatory for any NVA HA design.

---

## Required inputs — collect before answering

1. **Cloud / on-prem placement** — if cloud-native firewall service, HA is built-in; if NVA, design required.
2. **Vendor + version**.
3. **Throughput target** — drives A/P (one box does it) vs A/A (load-balanced).
4. **RTO** — drives heartbeat timer + session sync requirement.
5. **Stateful workload presence** — long-lived TCP / VPN tunnels require session sync.
6. **Subnet / interface availability** — dedicated HA1 (config) + HA2 (session) subnets in cloud.
7. **Cloud LB type available** — Azure Standard LB / AWS GWLB or NLB / GCP ILB.
8. **Operational maturity** — A/A demands stronger tooling than A/P.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Firewall-HA-Design`**.
3. **For cloud-native firewall (Azure FW / AWS NFW / GCP Cloud FW)** — HA is service-managed. Design regional zone placement; stop here.
4. **For NVAs** — pick HA mode per vendor (A/P default; A/A when throughput justifies; A/A with session sync only with full operational backing).
5. **Plan dedicated HA subnets** — HA1 (control plane / config sync) and HA2 (data plane / session sync) MUST be separate from data subnets.
6. **Pick heartbeat timers** — vendor default for production stability; aggressive only with mature monitoring + dampening.
7. **Wire cloud failover pattern** — Azure: Standard LB front-end + UDR pointed at SLB / NVA primary; on failover, UDR or floating IP moves. AWS: Gateway LB or NLB-front + EIP failover via Lambda / scripts. GCP: Internal LB front-end + Cloud Router BGP failover or floating IP via API.
8. **Enable session sync** — without it every failover drops every connection.
9. **Enable config sync** with one-primary discipline — secondary must NEVER be edited.
10. **Set preempt OFF** (avoid flap loops) — let ops manually fail back during a maintenance window.
11. **Fence on heartbeat loss** in active/active — prevents split-brain.
12. **Surface anti-patterns** — shared heartbeat + data plane, no session sync, both nodes editable, aggressive timers without dampening, preempt on, A/A without LB.
13. **Wire HA-specific monitoring** — heartbeat state, sync state, failover events, time-to-converge metric.
14. **Emit** in the output format below.

---

## Output format

Every HA-design answer should emit:

1. **Inputs assumed** — cloud / on-prem, vendor + version, throughput target, RTO, stateful workload.
2. **HA mode chosen** + rationale (A/P / A/A / A/A+sync).
3. **Subnet plan** — HA1 + HA2 dedicated + data subnets per cloud.
4. **Heartbeat timer + dampening config.**
5. **Cloud failover pattern** — LB type + UDR / EIP / floating IP mechanism citing vault.
6. **Session sync configuration** — protocol / port / link.
7. **Config sync direction + discipline** — primary owner + secondary read-only.
8. **Preempt setting + fence behaviour.**
9. **Monitoring plan** — heartbeat state, sync state, failover counter, time-to-converge.
10. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
11. **What this excludes** — rule config (`config-gen`), hardening (`hardening-check`), troubleshooting after failover (`troubleshoot`).
12. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Heartbeat sharing data-plane subnet.** Data outage = heartbeat loss = unnecessary failover.
2. **No session sync.** Every failover drops every active TCP session. Loud user-visible event.
3. **Editing the secondary node.** Config drift; on failover the rule set changes; production outage.
4. **Aggressive heartbeat timers without dampening.** Flap loops kill availability worse than slow failover.
5. **Preempt on.** Primary recovers mid-traffic, fails back, drops sessions; flap risk.
6. **Active/active without LB.** No traffic distribution = active/idle.
7. **No fence on heartbeat loss in A/A.** Split-brain; both write the same EIP / floating IP; outage.
8. **No commit-confirm + rollback timer on HA config push.** Bad push locks both nodes out.
9. **Recommending NVA HA for a cloud where a managed firewall service would do.** Pay for ops you don't need.
10. **No HA-specific monitoring** — failover events, time-to-converge, sync state. SREs see only the symptom, not the cause.
11. **No periodic failover drill.** First production failover finds the bug.
12. **No documented runbook for asymmetric routing post-failover** — Azure UDR / AWS routes / GCP routes may not converge fast enough; document the manual nudge.

**Analysis only — verify against vendor documentation before applying.**
