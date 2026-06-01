# Skill: Traffic Analytics (`nmon_skill_traffic_analytics`)

Analyse network flow data to extract actionable insights on traffic patterns, security threats, and capacity utilisation. Covers Azure Traffic Analytics (over VNet flow logs; NSG flow logs migration-only), AWS VPC flow log analysis (Athena), AWS Traffic Mirroring, and GCP Network Intelligence Center. Owns the *flow-log-source decision* (which logs to enable + interval), the *insight-category prioritisation* (start with geographic + malicious + top talkers + denied flows; deepen as needed), the *NSG-flow-logs retirement awareness* (new creation blocked after 2025-06-30; full retirement 2027-09-30 — never recommend for new builds), the *cross-cloud normalisation discipline* (unified schema before correlation), and the *SIEM-ingestion mandate* (raw flow data → SIEM for hunting + retention). KQL snippets, Athena SQL, NIC capabilities + CLI, schema field mappings, processing-interval costs, and mirror-target setup live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *log-source-decision* (VNet over NSG; processing interval 10 vs 60 min), the *category-prioritisation* (geographic / malicious / top talkers / denied flows first), the *NSG-retirement* awareness, the *unified-schema-before-correlation* rule, and the *SIEM-or-warehouse for retention* mandate. KQL queries, Athena SQL, mirror CLI, NIC CLI, and schema field mappings live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Traffic-Analytics" })` for KQL queries (top talkers, malicious IPs, geo distribution, port utilisation, denied-flow spikes), AWS Traffic Mirroring CLI + Athena SQL, GCP NIC components (Connectivity Tests, Topology, Performance Dashboard, Firewall Insights), and the cross-cloud unified schema.
2. For flow-log infrastructure setup, redirect to `cn_skill({ specialist: "cn_nmon", skill: "flow-log-setup" })`.
3. For dashboards built on this data, redirect to `dashboard-build`.

If a tool / pattern isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_nmon" })`.

---

## When to use traffic-analytics

| Scenario | Behaviour |
|---|---|
| "Who is talking to whom?" | Top-talkers query from vault per cloud |
| "Find any traffic to known-malicious IPs in the last 7 days" | Malicious IP query (Azure) / TI lookup (AWS Athena) / NIC + threat intel (GCP) |
| "Why are denied flows spiking?" | Denied-flow spike-detection KQL; cross-ref NSG / SG rule changes |
| "Visualise geographic origin of traffic" | Geo distribution KQL / map widget |
| "Detect lateral movement / unexpected port usage" | Port utilisation KQL; correlate with workload identity |
| Multi-cloud correlation | Unified schema first; SIEM aggregates; cite the field-mapping table |
| Flow-log infrastructure setup (enable + retention + sampling) | Redirect: `cn_skill({ specialist: "cn_nmon", skill: "flow-log-setup" })` |
| Dashboards built on this data | Redirect: `cn_skill({ specialist: "cn_nmon", skill: "dashboard-build" })` |
| Alerting on top-talker / denied-flow thresholds | Redirect: `cn_skill({ specialist: "cn_nmon", skill: "alert-design" })` |
| Synthetic latency / packet-loss tests | Redirect: `cn_skill({ specialist: "cn_nmon", skill: "synthetic-monitoring" })` |
| Packet capture / deep inspection | Cite AWS Traffic Mirroring section from vault; for Azure / GCP packet capture, redirect to `cn_skill({ specialist: "cn_ntsh", skill: "packet-capture" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical traffic-analytics reference — Azure Traffic Analytics (processing interval, schema, KQL for top talkers / malicious IPs / geo / port utilisation / denied-flow spikes), AWS Traffic Mirroring (mirror sessions, NLB target, filter rules) + Athena SQL for VPC flow logs, GCP NIC (Connectivity Tests, Network Topology, Performance Dashboard, Firewall Insights), cross-cloud unified schema field mapping, aggregation approach | [[Traffic-Analytics]] | `cn_vault_page({ page: "Traffic-Analytics" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Cloud(s) + flow-log status** — enabled? source (VNet / NSG / VPC / GCP)? retention?
2. **Question being answered** — capacity / security / cost attribution / incident hunting / compliance.
3. **Time window** — last hour (alerting), 24h (ops), 7-30 days (hunting), longer (capacity / compliance).
4. **Data destination** — Log Analytics workspace / S3 + Athena / BigQuery / SIEM (Sentinel / Splunk / Elastic / Datadog).
5. **Sampling tolerance** — full vs sampled (cost lever).
6. **Existing dashboards / alerts** consuming the same data (avoid duplication).
7. **Cost budget** — Traffic Analytics 10-min ~$1.50/GB, 60-min ~$0.75/GB.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Traffic-Analytics`**.
3. **Pick the data source per cloud**:
   - **Azure** — VNet flow logs + Traffic Analytics. NSG flow logs are migration-only.
   - **AWS** — VPC flow logs → S3 → Athena for SQL hunting; Traffic Mirroring for deep packet inspection where IDS/IPS is required.
   - **GCP** — VPC flow logs + NIC for path analysis, topology, performance, firewall insights.
4. **Pick the processing interval** — 10 min for security-sensitive, 60 min for ops/capacity.
5. **Prioritise insight categories** — geographic + malicious + top talkers + denied flows first; deepen to port utilisation + protocol breakdown + flow-state analysis after.
6. **Emit the query** — KQL / Athena SQL / MQL — cite vault.
7. **Plan unified schema** if multi-cloud — Source IP / Dest IP / Ports / Bytes / Action mapped per the vault table; normalise in SIEM.
8. **Wire SIEM ingestion** — for retention and correlation with EDR / IAM / app logs.
9. **Cost guardrail** — sampling rate (e.g., 1:10 outside business-hours), short hot retention + cold archive.
10. **For incident hunting** — combine flow data with DNS logs (`dns/resolver-design`), firewall logs (`fw/policy-design`), and L7 logs (WAF / app gateway).
11. **Surface anti-patterns** — new dashboards on NSG flow logs, 10-min interval everywhere, no SIEM ingestion, no normalisation before multi-cloud correlation.
12. **Emit** in the output format below.

---

## Output format

Every traffic-analytics answer should emit:

1. **Inputs assumed** — cloud(s), flow-log status, time window, destination, sampling.
2. **Data-source decision** — per cloud, with VNet-over-NSG flagged.
3. **Processing interval** + cost note.
4. **Insight category** + ranked secondary categories.
5. **Query stub(s)** — KQL / Athena SQL / MQL — citing vault.
6. **Unified-schema mapping** (if multi-cloud).
7. **SIEM ingestion plan** — destination, retention, sampling.
8. **Hunting cross-references** — DNS / firewall / L7 logs to combine with.
9. **Cost guardrail** — sampling + tiered retention.
10. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
11. **What this excludes** — flow-log setup (`flow-log-setup`), dashboards (`dashboard-build`), alerts (`alert-design`), packet capture (`ntsh/packet-capture` for Azure/GCP).
12. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Recommending NSG flow logs for new Azure deployments.** New creation blocked after 2025-06-30; full retirement 2027-09-30. Use VNet flow logs.
2. **10-minute Traffic Analytics interval everywhere.** Doubles cost. Reserve for security-sensitive workloads.
3. **No SIEM ingestion.** Without retention + cross-correlation with EDR / IAM / app logs, hunting is shallow.
4. **No unified schema across clouds.** Joining `srcaddr` + `SrcIP_s` + `connection.src_ip` ad-hoc is brittle; normalise once at ingest.
5. **Athena queries over full S3 dataset every time.** Partition by year/month/day; query a partition window.
6. **No partition pruning + no Glue catalogue.** Cost explodes; queries time out.
7. **Trusting `MaliciousIP_s` (Azure TA) as the only TI signal.** Combine with your TI feeds; new IOCs lag.
8. **Top-talker query without source/destination dedup.** Inflates because flows are bi-directional records.
9. **Forgetting the asymmetric-routing case** when correlating both sides of an inter-cloud link.
10. **Recommending Traffic Mirroring as a default in AWS.** It's expensive (instance type, NLB target, processing); use only where IDS/IPS is required and flow logs aren't enough.
11. **No data-egress cost calc** when streaming flow data cross-region or cross-cloud to SIEM.
12. **Treating GCP NIC Connectivity Tests as live monitoring.** They're synthetic path analyses — pair with VPC flow logs for actual traffic.

**Analysis only — verify against vendor documentation before applying.**
