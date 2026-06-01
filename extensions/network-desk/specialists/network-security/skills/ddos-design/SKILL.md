# Skill: DDoS Protection Design (`nsec_skill_ddos_design`)

Design DDoS protection across Azure DDoS Protection (Network / IP), AWS Shield (Standard / Advanced), and GCP Cloud Armor. Owns the *tier selection* (Standard always-on vs Advanced/Plus with DRT/DRR access), the *traffic-profiling discipline* (≥30 days baseline before tuning), the alerting requirements (detection visibility on Standard tiers), and the false-positive mitigation (allow-list scanners, geo-rules). The per-cloud CLI for enabling protection, threshold-configuration multipliers (3-10×), and per-cloud alerting CLI live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *protection-tier decision*, the *baseline-30-days* rule before tuning, the *whitelist-then-tune* loop for false-positive mitigation, and the *log-DDoS-events-to-SIEM* mandate. All per-cloud CLI (enable, attach, alert), tier pricing summaries, threshold multiplier ranges, and Cloud Armor security-policy CLI live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "DDoS-Protection-Design" })` for the canonical Azure DDoS Network/IP tier descriptions, AWS Shield Standard/Advanced descriptions, GCP Cloud Armor Standard/Plus descriptions, per-cloud configuration CLI, threshold-tuning guidance, false-positive mitigation patterns, and alerting CLI.
2. Cite the vault page when quoting pricing, threshold multipliers, or feature lists.
3. For WAF policy (often paired with DDoS at L7), redirect to `waf-policy-design`.

If a vendor isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_nsec" })`.

---

## When to use ddos-design

| Scenario | Behaviour |
|---|---|
| "Design DDoS protection for our Azure public IPs" | Tier selection (Network vs IP) → cost analysis → enable CLI → alert wiring |
| "Should we enable AWS Shield Advanced?" | Org-level $3K/mo decision → DRT access, cost-protection, WAF inclusion benefit |
| "Configure Cloud Armor DDoS for our LB-backed app" | Standard always-on vs Managed Protection Plus + adaptive ML rules |
| Tuning DDoS thresholds after false positive | Apply baseline + multiplier from vault; whitelist known scanners |
| Alerting for active DDoS event | Per-cloud alert CLI + SIEM integration |
| WAF L7 policy / OWASP rules | Redirect: `cn_skill({ specialist: "cn_nsec", skill: "waf-policy-design" })` |
| WAF at the edge (CDN-tier) | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "waf-edge" })` |
| Overall security posture / zero-trust | Redirect: `cn_skill({ specialist: "cn_nsec", skill: "zero-trust-architecture" })` |
| Load-balancer-specific WAF rule syntax | Redirect: `cn_skill({ specialist: "cn_lb", skill: "waf-rules" })` |
| Firewall pricing comparison | Redirect: `cn_skill({ specialist: "cn_price", skill: "firewall-pricing" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical DDoS reference — Azure DDoS Network/IP tiers + CLI, AWS Shield Standard/Advanced features + CLI, GCP Cloud Armor security policies + CLI, threshold-tuning multipliers, false-positive mitigation, alert configuration | [[DDoS-Protection-Design]] | `cn_vault_page({ page: "DDoS-Protection-Design" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Cloud(s)** in scope.
2. **Public-facing resources** to protect — count + type (LB, public IP, CDN, ALB, etc.).
3. **Baseline traffic profile** — SYN/sec, UDP/sec, total pps (if available, otherwise note ≥30-day baseline is required before tuning).
4. **Attack-surface tolerance** — willing to accept Standard tier (no visibility) vs need Advanced tier (visibility + DRT/DRR).
5. **Budget** — Shield Advanced is $3K/mo org-level; Azure Network Protection ~$2.9K/mo per plan.
6. **Compliance / SLA** — some regulated workloads require Advanced/Plus tier with cost protection.
7. **Existing WAF posture** — Shield Advanced bundles AWS WAF; Azure WAF Premium has DDoS Network bundling discount.

---

## Workflow

1. **Collect inputs** above.
2. **Load `DDoS-Protection-Design`**.
3. **Apply the tier decision**:
   - **Azure** — DDoS Network Protection for VNet-wide coverage with DRR (large estate, mission critical); DDoS IP Protection for ≤10 specific public IPs (smaller deployments).
   - **AWS** — Shield Standard is automatic + free for ALB/CloudFront/Route 53/etc. → enough for many workloads; upgrade to Shield Advanced when you need DRT access, cost protection, attack metrics, or proactive engagement.
   - **GCP** — Cloud Armor Standard (always-on volumetric) included; upgrade to Managed Protection Plus for ML-based adaptive protection.
4. **Apply the baseline-30-days rule** — if no baseline exists, profile first, tune later. Auto-tuning needs the 30-day window.
5. **Choose threshold multipliers** — SYN baseline ×3-5; UDP baseline ×5-10; total pps ×3 (detect) / ×10 (mitigate).
6. **Plan false-positive mitigation** — whitelist known scanners (CDN health-check IPs, Pingdom, internal monitors); use geo-allow for expected regions; never blanket-disable rules.
7. **Wire alerting** — Azure metric `IfUnderDDoSAttack > 0`; AWS `DDoSDetected` / `DDoSAttackBitsPerSecond`; GCP Cloud Monitoring on denied-request count.
8. **For Shield Advanced** — associate Route 53 health check for proactive engagement; document escalation path to DRT.
9. **Cross-link to WAF** — DDoS protects L3/L4 + some L7; layered WAF policy from `waf-policy-design` adds OWASP / bot / rate-limit defences.
10. **Surface anti-patterns** — promoting thresholds to block without baseline; relying on Shield Standard visibility (none); ignoring DDoS cost-protection benefit when scale-out could explode bill.
11. **Emit** in the output format below.

---

## Output format

Every DDoS-design answer should emit:

1. **Inputs assumed** — cloud, resources to protect, baseline (or "baseline TBD").
2. **Tier selected** + rationale (DRR access, cost protection, attack visibility).
3. **Configuration plan** — CLI snippets from vault for: enable plan, attach to VNet/resource, enable diagnostic logging.
4. **Threshold-tuning plan** — multiplier table, scheduled review of thresholds.
5. **Alerting plan** — metric, threshold, action group, SIEM ingestion.
6. **False-positive mitigation plan** — whitelist sources, geo-rules.
7. **Cost** — base + per-resource overage at user's resource count.
8. **WAF integration pointer** — `cn_skill({ specialist: "cn_nsec", skill: "waf-policy-design" })`.
9. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
10. **What this excludes** — WAF L7 policy, bot management, edge WAF.
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Promoting protection to mitigation without 30-day baseline.** Auto-tuning thresholds will produce false positives that block legitimate traffic.
2. **Recommending AWS Shield Standard for visibility** — Standard provides no attack metrics or notifications. If visibility matters, recommend Advanced.
3. **Recommending Shield Advanced for one resource.** It's org-level $3K/month + data fees; only justified at scale or for critical assets.
4. **Skipping the cost-protection benefit calculation** — for autoscaling workloads, the scale-out cost during attack can be $10K-$50K; cost protection often pays for the Advanced/Plus subscription.
5. **Whitelisting via blanket disable of rules.** Always scope exclusions to specific source IPs / paths, not "off".
6. **No Route 53 health check associated with Shield Advanced.** Loses proactive DRT engagement.
7. **No DiagnosticSettings on Azure DDoS PIPs.** Attack data isn't retained without the diagnostic logs enabled.
8. **No SIEM ingestion of DDoS events.** SOC can't correlate with other signals.
9. **Treating Cloud Armor Standard as full-stack DDoS.** It protects only resources behind HTTPS LB; other GCP resources need separate protection.
10. **No WAF in front of public APIs.** DDoS handles volume; L7 attack patterns still get through without WAF — recommend pairing.
11. **Skipping cost protection clause** in design doc when DRR is invoked but cost protection isn't, leaving the customer with the scale-out bill.
12. **No periodic review of thresholds.** Traffic profiles drift; quarterly re-baseline.

**Analysis only — verify against vendor documentation before applying.**
