# Skill: Dashboard Build (`nmon_skill_dashboard_build`)

Design and build network monitoring dashboards (Azure Monitor Workbooks, CloudWatch dashboards, Grafana multi-cloud). Owns the *golden-signals framing* for network (latency / traffic / errors / saturation), the *3-level drill-down hierarchy* (Executive → Service → Resource), the *parameter-first dashboard design* (one workbook per use-case, parameterised per env/region rather than copy-pasting per scope), the *legacy NSG-flow-log retirement awareness* (use VNet flow logs for new builds; NSG flow logs are migration-only), and the *annotation discipline* (deploys + maintenance windows must annotate dashboards). The KQL snippets, CloudWatch widget catalogue, math-expression patterns, Grafana data-source per cloud, multi-cloud layout, and refresh-interval defaults live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *golden-signals framing*, the *L1/L2/L3 drill-down*, *parameterise-don't-copy*, *VNet-over-NSG-flow-logs* discipline, the *annotate-deploys* rule, and the *what-belongs-on-which-level* judgement. KQL snippets, widget catalogue, Grafana data-source CLI, and per-cloud field names live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Network-Dashboard-Build" })` for canonical KQL panels (VPN tunnels, ExpressRoute utilization, denied flows), CloudWatch widget types + math-expressions, Grafana data-source config per cloud, multi-cloud layout template, dashboard best practices.
2. For raw flow-log analysis underlying these dashboards, redirect to `traffic-analytics`.
3. For alerting on the same metrics, redirect to `cn_skill({ specialist: "cn_nmon", skill: "alert-design" })`.

If a vendor/visualization isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_nmon" })`.

---

## When to use dashboard-build

| Scenario | Behaviour |
|---|---|
| "Build a network health dashboard for our Azure estate" | Apply golden signals → 3 levels → workbook with parameters → KQL from vault |
| "We need a single pane across Azure/AWS/GCP" | Grafana multi-cloud layout from vault; data-source config per cloud |
| "What should a network ops L1 dashboard show?" | L1 executive overview pattern; aggregate health + traffic lights |
| "How do we visualise SNAT exhaustion / ER utilisation?" | Cite the panels from vault; emit KQL stub |
| "Show denied flows heatmap" | VNet flow logs first; flag NSG flow logs as migration-only |
| Raw flow-log analysis / hunting | Redirect: `cn_skill({ specialist: "cn_nmon", skill: "traffic-analytics" })` |
| Alert thresholds on these metrics | Redirect: `cn_skill({ specialist: "cn_nmon", skill: "alert-design" })` |
| Synthetic monitoring | Redirect: `cn_skill({ specialist: "cn_nmon", skill: "synthetic-monitoring" })` |
| Connection monitoring (Azure NW / Reachability / VPC Reachability) | Redirect: `cn_skill({ specialist: "cn_nmon", skill: "connection-monitoring" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical dashboard reference — Azure Monitor Workbooks (parameter cascades, KQL panels for VPN/ER/denied flows), CloudWatch widget types + math expressions, Grafana data-source per cloud, multi-cloud dashboard layout, golden-signals framework, drill-down hierarchy, time-range defaults | [[Network-Dashboard-Build]] | `cn_vault_page({ page: "Network-Dashboard-Build" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Cloud(s) + tool stack** — Azure Monitor / CloudWatch / GCP Monitoring / Grafana / Datadog / Splunk.
2. **Audience** — executives / NOC L1 / SRE on-call / network engineer.
3. **Scope** — single env / single region / per-app / multi-cloud.
4. **Existing telemetry** — workspace IDs, log retention, sampling rate.
5. **Refresh cadence** — real-time ops (30s) vs review (5 min).
6. **Annotation pipeline** — deployment events + maintenance windows.
7. **Cost ceiling** — KQL query cost; CloudWatch dashboard / Grafana cost considerations.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Network-Dashboard-Build`**.
3. **Pick the dashboard level** (L1 / L2 / L3) — only design one level per dashboard; link them.
4. **Apply golden signals** — latency, traffic, errors, saturation. Each panel must map to one.
5. **Parameterise** — subscription / region / environment / app — single workbook reused per scope.
6. **Pick the panel set** from the vault — KQL for Azure, widget+math-expression for AWS, MQL/PromQL for GCP.
7. **For multi-cloud** — apply the row-per-cloud layout; aggregate health on row 1.
8. **Wire annotations** — deployments + maintenance windows + known incidents.
9. **Add the time-range selector** + refresh-cadence per audience.
10. **For denied-flow / flow-log panels** — use VNet flow log schema (Azure); flag any NSG flow log dependency as migration-only.
11. **Surface anti-patterns** — too many panels, copy-paste-per-scope, "real-time" 30s refresh on review dashboards, no annotations, missing time-range selector, dashboard built on retired data source (NSG flow logs post-2025-06-30).
12. **Emit** in the output format below.

---

## Output format

Every dashboard-build answer should emit:

1. **Inputs assumed** — cloud(s), tool, audience, scope, refresh cadence.
2. **Dashboard level** (L1/L2/L3) + 1-line justification.
3. **Panel inventory** — table of panels mapped to golden signal + data source + KQL/widget stub citing the vault.
4. **Parameter list** — what to bind (sub / region / env / app).
5. **Layout sketch** — rows / sections.
6. **For multi-cloud** — the row-per-cloud layout + aggregate health row 1.
7. **Annotation wiring** — deploy events + maintenance windows.
8. **Time-range default + refresh interval** with rationale.
9. **Cost / query-budget note** — sampling, retention impact.
10. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
11. **What this excludes** — alert design (`alert-design`), flow-log analysis (`traffic-analytics`).
12. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Building dashboards on NSG flow logs in 2025+.** New NSG flow logs blocked after 2025-06-30; full retirement 2027-09-30. Use VNet flow logs.
2. **Copy-pasting dashboards per env/region/app.** Use parameters. Otherwise 30 dashboards drift independently.
3. **No annotations.** Metrics spike during a deploy and the SRE thinks it's an attack. Annotate everything.
4. **Single dashboard for all 3 audiences.** Exec sees too much detail, NOC sees not enough context. Build per audience.
5. **30-second refresh on a 24-hour review dashboard.** Wastes query budget. Use 5-min for review.
6. **No time-range selector.** Users can't zoom into incidents.
7. **Mixed-golden-signal panels in one row.** Latency + traffic + saturation on one row is confusing; group by signal.
8. **No SNAT / ER / SNAT-port / connection-table-fullness panel.** These are the network exhaustion modes; missing them = blind to capacity events.
9. **No drill-down links** between L1 / L2 / L3. Users hunt manually instead of clicking through.
10. **Putting KQL inline 50× rather than a saved query / function.** Editing requires touching 50 panels.
11. **Cross-cloud dashboards with inconsistent units** — bps on one cloud, Mbps on another. Normalise.
12. **No dashboard ownership tag.** Orphan dashboards proliferate; tag with owner + last-validated date.

**Analysis only — verify against vendor documentation before applying.**
