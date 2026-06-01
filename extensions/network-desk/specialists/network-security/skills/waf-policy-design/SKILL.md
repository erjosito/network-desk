# Skill: WAF Policy Design (`nsec_skill_waf_policy_design`)

Design layered WAF policies across Azure WAF (Front Door / App Gateway), AWS WAFv2 (CloudFront / ALB / API GW / AppSync), GCP Cloud Armor, and vendor WAFs (F5, Imperva, Akamai, Cloudflare, Fortinet). Owns the *five-layer policy model* (managed rules → custom rules → rate limiting → bot management → geo/IP coarse filters), the *Detect → Prevent rollout discipline* (never promote to block without ≥7 days of Detect data covering a full business cycle), the *scoped-exclusion rule* (exclude rule for specific URI / parameter / source — never disable globally), and the *log-everything + SIEM ingestion* requirement. The per-vendor managed-rule-set names, custom-rule pattern catalogue, vendor rate-limit CLI, bot-management classification matrix, FP-tuning matrix, and stack-integration map all live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *five-layer ordering* (with the anti-pattern of misordering), the *Detect-then-Prevent* rollout cadence, the *scoped-exclusion* discipline, and the *log + SIEM + synthetic bypass-test* requirement. All vendor-specific rule-set names, custom-rule pattern catalogue, rate-limit DSL examples, bot-classification table, and integration diagrams live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "WAF-Policy-Design" })` for the canonical 5-layer model, per-vendor managed-rule-set names, custom-rule pattern catalogue, rate-limit DSL examples, bot classification table, Detect→Prevent rollout, FP-tuning matrix, observability requirements, and verification checklist.
2. Cite the vault page when quoting rule IDs, set names, or vendor-specific syntax.

If a vendor / pattern isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_nsec" })`.

---

## When to use waf-policy-design

| Scenario | Behaviour |
|---|---|
| "Design WAF policy for our public app" | Apply 5-layer model + Detect→Prevent rollout + scoped exclusions |
| "Tune false positive on rule X" | Apply FP-tuning matrix — exclude scope-narrowly (URI + param + source) |
| "Add rate-limit for credential stuffing on /login" | Layer 3 rate-limit per IP with CAPTCHA challenge fall-back |
| "Bot management strategy" | Apply 4-class classification (good / neutral / unknown / bad / headless) + per-class action |
| "Geo-block from country X" | Layer 5 last-resort filter; combine with allow-list for known third parties |
| Promoting from Detect to Prevent | Apply rollout rule: ≥7 days Detect, full business cycle, documented exclusions |
| DDoS protection design | Redirect: `cn_skill({ specialist: "cn_nsec", skill: "ddos-design" })` |
| Overall zero-trust posture | Redirect: `cn_skill({ specialist: "cn_nsec", skill: "zero-trust-architecture" })` |
| LB-specific WAF rule syntax | Redirect: `cn_skill({ specialist: "cn_lb", skill: "waf-rules" })` |
| WAF at the edge (CDN-tier) | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "waf-edge" })` |
| Synthetic monitoring for bypass detection | Redirect: `cn_skill({ specialist: "cn_nmon", skill: "synthetic-monitoring" })` |
| Firewall pricing comparison | Redirect: `cn_skill({ specialist: "cn_price", skill: "firewall-pricing" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical 5-layer WAF policy model — managed rule sets (Azure DRS 2.1, AWS Core/KnownBadInputs/SQLi/IpReputation, GCP crs-v33-stable, Cloudflare, F5), custom-rule pattern catalogue, rate-limit DSL per vendor, bot management (Azure Bot Manager / AWS WAF Bot Control / GCP reCAPTCHA Enterprise / Cloudflare Bot Mgmt / DataDome), geo/IP filters, Detect→Prevent rollout, FP-tuning matrix, observability requirements, stack-integration, cost considerations, verification checklist | [[WAF-Policy-Design]] | `cn_vault_page({ page: "WAF-Policy-Design" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Cloud(s) / WAF product(s)** in scope (Azure Front Door / App GW / AWS WAFv2 / Cloud Armor / Cloudflare / F5 / Imperva / Akamai / Fortinet).
2. **App type** — web (browser-driven) / API (token-driven) / mixed.
3. **Sensitive routes** — `/admin`, `/login`, `/api`, file-upload endpoints, deprecated endpoints, GraphQL.
4. **Expected user geography** — drives geo-allow vs geo-deny.
5. **Bot tolerance** — public site with Googlebot vs internal app where no bots are expected.
6. **Existing telemetry pipeline** — SIEM / XDR (required for alerting + bypass detection).
7. **Latency budget** — WAF adds 1-5 ms typical.
8. **Cost constraint** — drives log sampling for non-blocked requests.
9. **Compliance** — PCI-DSS / SOC2 may require specific logging retention + WAF tiers.

---

## Workflow

1. **Collect inputs** above.
2. **Load `WAF-Policy-Design`**.
3. **Design layer-by-layer in order**:
   - **L1 (managed)** — enable vendor managed set in **Detect** mode; identify anomaly-score threshold (5 default for OWASP CRS).
   - **L2 (custom)** — capture app-specific knowns (admin from non-corp, GraphQL exceptions, file-upload size, CDN shared-header origin protection).
   - **L3 (rate-limit)** — per token / API key / IP — not naive per-IP; pair with `Retry-After` and log for capacity planning.
   - **L4 (bot mgmt)** — classify (good / neutral / unknown / bad / headless); per-class action.
   - **L5 (geo/IP)** — last-resort coarse filters; justify each.
4. **Apply Detect→Prevent rollout** — ≥7 days Detect; review FPs; promote managed first; later promote custom; finally rate-limit + bot.
5. **Document each exclusion** — rule ID, scope (URI + param + source), reason, ticket, expiry date (≤90 days default).
6. **Wire observability** — per-request log to SIEM with rule IDs + action + score + client info (PII-truncated); dashboards for block rate / top rules / top sources / top URIs.
7. **Wire alerts** — spike (attack or new FP), drop (bypass / misconfig), high-confidence rule fires (credential-stuffing → page SecOps).
8. **Wire synthetic bypass tests** — weekly comparison to baseline to confirm WAF still firing.
9. **Document rollback runbook** — revert to Detect or disable a rule in <5 min.
10. **Surface anti-patterns** — Prevent-without-baseline, blanket-disable for a single FP, naive per-IP rate-limit, geo-block-your-customers, no SIEM, no rollback runbook.
11. **Emit** in the output format below.

---

## Output format

Every WAF-policy answer should emit:

1. **Inputs assumed** — vendor, app type, sensitive routes, geo, bot tolerance.
2. **Layer-by-layer plan** — L1 (managed set + Detect period) → L2 (custom rules with scope) → L3 (rate-limit rules with key + action + fallback) → L4 (bot classification + per-class action) → L5 (geo/IP — only if justified).
3. **Detect→Prevent rollout calendar** — Day 0 / 7-14 / 30 with what gets promoted when.
4. **Exclusion register template** — column for rule ID, scope, reason, ticket, expiry.
5. **Observability plan** — log fields, SIEM destination, dashboards, alerts (spike / drop / high-confidence).
6. **Bypass-test plan** — synthetic checks weekly.
7. **Rollback runbook pointer** — 5-min revert path.
8. **Cost & latency note** — request volume × per-request, log-sampling recommendation, WAF latency budget.
9. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
10. **What this excludes** — vendor-specific syntax (cite vault), LB-specific syntax (`cn_lb/waf-rules`), edge WAF (`cn_cdn/waf-edge`).
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Promoting to Prevent without ≥7-day Detect baseline** covering a full business cycle. You'll block legitimate traffic on day 1.
2. **Disabling a rule globally** to fix a single FP. Exclude scoped to URI + param + source instead.
3. **Naive per-IP rate-limit** — broken by NAT, CGNAT, proxies. Rate-limit on identity (token / API key) where possible.
4. **Blocking all bots uniformly** — kills Googlebot, monitoring, OAuth providers. Classify per the 4-class table.
5. **Geo-block your customers** — geo-deny without an allow-list of known third parties strands legitimate users.
6. **Misordering the 5 layers** — rate-limit before bot classification blocks legitimate search crawlers; geo before managed wastes evaluation.
7. **No SIEM integration.** WAF without telemetry is a brittle proxy.
8. **No bypass synthetic tests.** WAF can silently turn off; you'll find out from an attacker.
9. **No expiry date on exclusions.** Exclusions become permanent; the anti-pattern they hide returns.
10. **No rollback runbook.** Day-of-incident, you need a < 5-min revert.
11. **Promoting custom rules before managed rules** — managed rules have lower FP rate; let them stabilise first.
12. **Body-inspecting health-check + static-asset routes** — wastes processing budget; disable body inspection where not needed.

**Analysis only — verify against vendor documentation before applying.**
