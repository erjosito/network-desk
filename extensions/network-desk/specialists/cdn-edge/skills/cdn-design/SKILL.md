# Skill: CDN Architecture Design (`cdn_skill_cdn_design`)

Design content-delivery network architectures across Azure Front Door, AWS CloudFront, and GCP Cloud CDN / Media CDN — origin selection, multi-origin failover, origin shielding, protocol optimisation (HTTP/2, HTTP/3, WebSocket, gRPC), and private-origin connectivity (Private Link Origin, VPC Origin, PSC). Provider Bicep/CLI/JSON templates and the cross-cloud feature/decision matrix live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the cross-cloud origin-selection decision, the multi-origin failover pattern, the protocol selection methodology (HTTP/3 / WebSocket / gRPC), the private-origin pattern (when to invest in Private Link Origin / VPC Origin / PSC), and CDN-specific workflow anti-patterns. Provider Bicep / JSON / gcloud templates, the per-feature provider matrix, and Media CDN vs. Cloud CDN guidance live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "CDN-Architecture-Design" })` for canonical origin examples, provider templates, and the design decision matrix.
2. Call vault pages for any provider explicitly in scope: `Front-Door` (Azure), `CloudFront` (AWS), `Cloud-CDN` (GCP).
3. Call `cn_vault_page({ page: "Edge-WAF-and-DDoS" })` when WAF / bot / DDoS is in scope.
4. Cite the vault page when stating provider feature availability (HTTP/3, gRPC, private origins, Media CDN).

If a feature is not in the vault, fall back to `cn_search({ query: "<keywords>", specialist: "cn_cdn" })`.

---

## When to use CDN design

| Scenario | Behaviour |
|---|---|
| "Pick a CDN for our public site / API" | Run origin-selection workflow + decision matrix (vault page) |
| "We need multi-region failover for our CDN origin" | Multi-origin pattern (primary + secondary, health probes, status-code-driven failover) |
| "Should we use Private Link Origin / VPC Origin / PSC?" | Private-origin sub-workflow + caveat list |
| "Do we need Origin Shield?" | Origin-shielding decision (per provider) |
| "Pick between Cloud CDN and Media CDN" | Media-vs-Cloud sub-workflow (GCP only) |
| Cache rules / TTL strategy / cache-key normalisation | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "cache-optimization" })` |
| Edge routing / rules engine logic / SR / geo-block | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "edge-routing" })` |
| WAF / bot management / DDoS | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "waf-ddos" })` |
| CDN troubleshooting (cache MISS, 502 from edge, etc.) | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "troubleshoot" })` |
| CDN egress cost / SKU comparison | Redirect: `cn_skill({ specialist: "cn_price", skill: "egress-architecture" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical CDN reference — origin types, multi-origin failover, origin shielding, protocols, private origins, Media CDN decision, design matrix | [[CDN-Architecture-Design]] | `cn_vault_page({ page: "CDN-Architecture-Design" })` |
| Azure Front Door service page (when Azure is in scope) | [[Front-Door]] | `cn_vault_page({ page: "Front-Door" })` |
| AWS CloudFront service page (when AWS is in scope) | [[CloudFront]] | `cn_vault_page({ page: "CloudFront" })` |
| GCP Cloud CDN service page (when GCP is in scope) | [[Cloud-CDN]] | `cn_vault_page({ page: "Cloud-CDN" })` |
| Edge WAF / DDoS (when public-facing endpoint is in scope) | [[Edge-WAF-and-DDoS]] | `cn_vault_page({ page: "Edge-WAF-and-DDoS" })` |
| Cache optimisation (always link as the next step) | [[CDN-Cache-Optimization]] | `cn_vault_page({ page: "CDN-Cache-Optimization" })` |

Row #1 is mandatory. Rows #2–4 are mandatory when the cloud is in scope. Row #5 is mandatory for public-facing endpoints (WAF is recommended for every public L7 origin).

---

## Required inputs — collect before answering

1. **Cloud(s) in scope** — Azure / AWS / GCP / multi-cloud.
2. **Traffic profile** — static web / dynamic API / streaming media / large downloads / mixed.
3. **Origin type** — storage (Blob / S3 / GCS), application LB (AppGW / ALB / GCP HTTPS LB), custom HTTP, on-prem.
4. **Origin reachability** — public IP today vs. private-only (drives Private Link / VPC Origin / PSC).
5. **Geographic profile** — single-region origin vs. multi-region; user base by region (drives PriceClass / POP selection).
6. **Protocol requirements** — HTTP/3, WebSocket, gRPC?
7. **WAF / DDoS / bot management** — required (almost always for public-facing).
8. **SLA / failover requirements** — single origin vs. multi-origin with auto-failover; acceptable detection time.

---

## Workflow

1. **Collect inputs** above. Push back on "what CDN should we use?" until you have at least cloud + origin type + traffic profile.
2. **Load `CDN-Architecture-Design`** plus the relevant provider service page.
3. **Pick the CDN product** using the vault page's design decision matrix (Front Door Standard/Premium vs. CloudFront vs. Cloud CDN / Media CDN).
4. **Pick the origin type + topology** — single origin, multi-origin failover (primary + secondary), or weighted multi-origin.
5. **Decide on origin shielding** if traffic is high or origin is fragile.
6. **Decide on private origin connectivity** if origin should not be public — Front Door Premium + Private Link, CloudFront VPC Origin, or PSC + Internal LB. Cite vault page for restrictions (e.g. CloudFront VPC Origin GLB / dual-stack NLB / TLS-listener caveats).
7. **Pick protocols** — HTTP/2 / HTTP/3 / WebSocket / gRPC — and call out gaps (e.g. Cloud CDN has no WebSocket; CloudFront has no gRPC).
8. **Bolt on WAF / DDoS / bot** — recommend by default for public-facing; redirect to `cn_skill({ specialist: "cn_cdn", skill: "waf-ddos" })`.
9. **Emit** in the format below.

---

## Output format

Every CDN-design answer should emit:

1. **Inputs assumed** — one line each.
2. **Product choice + rationale** — cite the vault page row that justifies it.
3. **Architecture** — POP → origin group → primary / secondary origins (single table or compact diagram).
4. **Origin connectivity** — public vs. private (Private Link / VPC Origin / PSC) + caveats.
5. **Protocol plan** — HTTP/3 on/off, WebSocket, gRPC; gaps surfaced.
6. **Failover plan** — health probe path, interval, threshold; failover status codes.
7. **Origin shielding** — yes / no + which region.
8. **WAF / DDoS plan** — recommendation + handoff.
9. **Provisioning** — pointer to the vault page section (do not duplicate templates inline).
10. **What this excludes** — cache rules / TTL strategy / edge routing rules / WAF detail / pricing detail (handed off to sibling skills).
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's pitfall content.

1. **Recommending a CDN without identifying the origin.** Origin type drives 80% of the design (storage vs. ALB vs. custom vs. private origin). Refuse to design "in the abstract".
2. **Picking Front Door Standard when Private Link Origin is needed.** Premium-only feature; surface this gate early in the conversation.
3. **Forgetting protocol gaps.** Cloud CDN has no WebSocket. CloudFront has no gRPC. Don't recommend a product if the user explicitly needs the missing protocol.
4. **Recommending Origin Shield for low-traffic apps.** Origin Shield adds request-cost / latency and only pays off at high cache-fill volume. Use the vault page's "when to use" gating.
5. **Skipping WAF for public origins.** Every public-facing L7 endpoint should have a WAF. Don't ship a design without it (or an explicit "we accept this risk" sign-off).
6. **Designing a single-origin global CDN as "highly available".** A single origin region is a single point of failure regardless of how many POPs the CDN has. Force the multi-origin question.
7. **Confusing Cloud CDN with Media CDN.** Cloud CDN is for web/API/static; Media CDN is for HLS/DASH / VOD / large downloads with origin protection. Don't quote Media CDN features for a generic web app.
8. **CloudFront VPC Origin without checking restrictions.** GLB / dual-stack NLB / NLB TLS listeners / Lambda@Edge / gRPC are excluded. Always validate against the vault page restriction list (and the AWS doc linked there).
9. **Quoting cache behaviour as part of design.** Cache rules belong to `cache-optimization`. CDN design owns origin + protocol + failover + WAF integration, not TTL or cache-key strategy.

**Analysis only — verify against vendor documentation before applying.**
