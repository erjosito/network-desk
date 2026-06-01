# Skill: Security at the Edge — WAF & DDoS (`cdn_skill_waf_edge`)

Design WAF policies, bot management, rate limiting, DDoS protection, and geo-blocking at the CDN / edge layer — Azure Front Door WAF, AWS WAF + Shield + CloudFront, GCP Cloud Armor + Cloud CDN. Owns the defense-in-depth ordering (DDoS → geo → rate → bot → WAF), the managed-vs-custom-rule decision, the bot-classification framework, and the rate-limit-strategy selection. The exact Bicep / JSON / gcloud rule syntax, the managed rule-set inventories per provider, the Shield Advanced / Adaptive Protection details, and the cost matrix live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the defense-in-depth ordering, the managed-vs-custom decision, the rate-limiting strategy selection (per-IP / per-IP+path / per-header / per-cookie / per-geo / sliding-window / token-bucket), the bot tiering, and the "Detection mode first, Prevention later" rollout discipline. The exact rule syntax per provider, the OWASP CRS rule-group inventory, the AWS WCU economics, and the cost matrix live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Edge-WAF-and-DDoS" })` for canonical policy structure, managed rule-set inventory per provider, bot-management options, rate-limiting syntax, DDoS coverage, geo-blocking patterns, and the security decision matrix.
2. Cite the vault page when stating managed rule group names, WCU costs, Shield Advanced pricing, or geo-blocking syntax.

If a rule or feature is not in the vault, fall back to `cn_search({ query: "<keywords>", specialist: "cn_cdn" })`.

---

## When to use waf-edge

| Scenario | Behaviour |
|---|---|
| "Set up WAF for our public site / API" | Enable managed OWASP rule set + add custom rules per use case |
| "Block by country / region" | Geo-blocking pattern (vault page §Geo-Blocking) |
| "Rate-limit our API" | Rate-limit strategy selection + per-provider syntax |
| "Block / challenge bots" | Bot tiering + bot-management product selection |
| "Survive a DDoS" | DDoS protection layers (Front Door / Shield / Cloud Armor Adaptive Protection) |
| "Detect attacks but don't block yet" | Detection mode → tune → switch to Prevention |
| WAF false positives — what to exclude? | Exclusion strategy (vault page) + the "exclude headers, not rules" principle |
| TLS / cert config | Redirect: `cn_skill({ specialist: "cn_lb", skill: "tls-config" })` (CDN-level cert mgmt is upstream) |
| Cache rules / hit-ratio | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "cache-optimization" })` |
| Origin / failover design | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "cdn-design" })` |
| WAF rule design at L7 LB (non-CDN — AppGW WAF / ALB WAF / Cloud Armor on LB) | Pair with `cn_skill({ specialist: "cn_nsec", skill: "waf-policy-design" })` |
| Multi-cloud WAF strategy / pricing trade-offs | Redirect: `cn_skill({ specialist: "cn_price", skill: "egress-architecture" })` for cost detail |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical edge WAF / DDoS — policy structure, managed rule sets (DRS, AWS managed groups, CRS preconfigured), bot management, rate limiting, DDoS layers, geo-blocking, IP reputation, security decision matrix | [[Edge-WAF-and-DDoS]] | `cn_vault_page({ page: "Edge-WAF-and-DDoS" })` |
| Cache optimisation (for cache-key impact of geo / rate / variant rules) | [[CDN-Cache-Optimization]] | `cn_vault_page({ page: "CDN-Cache-Optimization" })` |
| Edge routing (when WAF is paired with routing logic) | [[Edge-Routing]] | `cn_vault_page({ page: "Edge-Routing" })` |
| WAF policy design at L7 LB (non-CDN context, paired skill) | [[WAF-Policy-Design]] | `cn_vault_page({ page: "WAF-Policy-Design" })` |

Row #1 is mandatory.

---

## Required inputs — collect before answering

1. **Cloud / CDN provider** — Front Door / CloudFront / Cloud CDN.
2. **Application type** — web / API / mobile backend / mixed.
3. **Threat profile** — OWASP-only / bot-heavy / known-good partner IPs / regulated industry / sanctioned-country blocks.
4. **Rate-limit goals** — per-IP threshold; per-path scope; per-header / per-cookie scoping.
5. **Bot tolerance** — block / challenge / allow with monitoring; do verified bots need allow-list?
6. **DDoS posture** — baseline Shield Standard / FD anycast / opt-in Shield Advanced or Adaptive Protection?
7. **Logging destination** — Log Analytics / CloudWatch + S3 / Cloud Logging.
8. **Cutover discipline** — Detection mode allowed before Prevention?

---

## Workflow

1. **Collect inputs** above.
2. **Load `Edge-WAF-and-DDoS`**.
3. **Start in Detection mode.** Always. Tune for a week, then promote to Prevention.
4. **Apply defense-in-depth in order**:
   1. DDoS — anycast absorption (FD / CloudFront / GCP) + Shield Advanced or Adaptive Protection if opt-in.
   2. Geo-blocking — sanctioned-country block at the lowest priority; allow-list for high-restriction sites.
   3. IP allow / known-good partner ranges — priority 10 or earlier.
   4. Rate limiting — scope to abuse-prone paths first (login, write APIs); cite vault page for syntax.
   5. Bot management — provider product (Bot Manager 1.1 / Bot Control TARGETED / Cloud Armor + reCAPTCHA).
   6. WAF managed rule set — DRS 2.1 / Common Rule Set / CRS 3.3 preconfigured; cite vault inventory.
5. **Tune exclusions surgically** — exclude headers / params / cookies, not whole rules. The vault page has the pattern.
6. **Plan logging + alerting** — sampled requests + metric, with the cardinality you can afford.
7. **Decide on Shield Advanced / Adaptive Protection** based on threat profile and budget (Shield Advanced ≈ $3 K/mo).
8. **Custom block response** — return 403 with a request-ID so support can correlate.
9. **Emit** in the format below.

---

## Output format

Every waf-edge answer should emit:

1. **Inputs assumed** — one line each.
2. **Defense-in-depth plan** — ordered list of layers with the rule type used at each.
3. **Rule set choice** — managed OWASP rule set + version, plus custom rules.
4. **Rate-limit plan** — threshold + duration + scope key + path filter (cite vault syntax).
5. **Bot plan** — verified-bot allow-list + suspicious-bot challenge + malicious-bot block.
6. **Geo plan** — sanctioned-country block at low priority; partner allow-list at high priority.
7. **DDoS posture** — baseline + opt-in service if any.
8. **Detection → Prevention cutover plan** — duration + alert thresholds before flipping mode.
9. **Logging & alerting** — destination + metric.
10. **What this excludes** — TLS cert lifecycle (cn_lb), origin design (cdn-design), cache rules (cache-optimization), L7 LB WAF design (cn_nsec for AppGW WAF / Cloud Armor on LB).
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's managed rule inventories and decision matrix.

1. **Going straight to Prevention mode.** Always Detection first; tune for a week minimum. False-positive blocks in production destroy user trust.
2. **Disabling whole rule groups instead of excluding fields.** Exclude the header / param / cookie that triggers the false positive; don't disable SQLi as a category.
3. **Per-IP rate limiting only.** Behind corporate NAT / mobile carriers, "per-IP" can be thousands of users. Pair with per-cookie / per-API-key for authenticated APIs.
4. **Recommending Shield Advanced for everyone.** ≈ $3 K/mo per account; only justified for high-value / repeat-targeted apps. FD anycast + Shield Standard handle most volumetric attacks for free.
5. **Geo-blocking as a security control on its own.** VPN / proxy bypass; use it for routing / compliance / sanctions, not for "blocking attackers".
6. **Blocking all bots.** Googlebot / Bingbot / GPTBot / monitoring tools / RSS readers need allow-lists; full bot block kills SEO and observability.
7. **Forgetting cache-key impact of variant rules.** WAF custom rules that branch on header / cookie can fragment the cache key if they modify the request — surface the cache-cost trade-off.
8. **Custom block response with sensitive info.** Don't include user IDs / session tokens / internal hostnames in the block body. Use opaque request-IDs.
9. **AWS WAF on CloudFront in wrong region.** CloudFront WebACL must be created in `us-east-1` regardless of where the rest of the stack lives. Surface this gotcha.
10. **Mixing WAF and L7 LB WAF without strategy.** If both FD WAF and AppGW WAF are in path, double-evaluate / double-cost / double-tune. Pick the layer that owns WAF and disable on the other.

**Analysis only — verify against vendor documentation before applying.**
