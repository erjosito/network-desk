# Skill: Edge Routing & Traffic Management (`cdn_skill_edge_routing`)

Design intelligent traffic routing at the CDN edge — anycast principles, geographic / latency routing, edge compute (CloudFront Functions, Lambda@Edge, Front Door Rules Engine, GCP Service Extensions), A/B testing and canary patterns at the edge. The exact Bicep / JSON / JavaScript samples, the Front-Door-vs-Traffic-Manager matrix, AWS managed cache-policy IDs, and the routing decision tree live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the routing-pattern decision (anycast / geo / latency / weighted / canary), the CloudFront-Functions-vs-Lambda@Edge selection methodology, the Front-Door-vs-Traffic-Manager decision (L7 reverse proxy vs. DNS steering), and the A/B-and-canary discipline (consistent assignment, cache-key separation, gradual rollout). The exact provider samples and feature matrices live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Edge-Routing" })` for canonical anycast / geo / latency framing, CloudFront cache behaviors, GCP URL maps, edge-compute samples, A/B + canary patterns, and the routing decision tree.
2. Cite the vault page when stating routing-method behaviour, edge-compute runtime limits, or canary syntax.

If a routing scenario is not in the vault, fall back to `cn_search({ query: "<keywords>", specialist: "cn_cdn" })`.

---

## When to use edge-routing

| Scenario | Behaviour |
|---|---|
| "Front Door vs. Traffic Manager?" | L7-reverse-proxy vs. DNS-steering decision (vault page matrix) |
| "How do I do path-based routing on AWS / GCP / Azure?" | Per-provider routing constructs (CF cache behaviors / GCP URL maps / FD route rules) |
| "Implement A/B testing at the edge" | A/B pattern — assignment + cache-key + measurement + gradual rollout |
| "Run canary at 5% of traffic" | Weighted-routing pattern (FD weights / CF continuous deployment / GCP backend service weights) |
| "Run logic at the edge" — URL rewrite / header injection / auth check | CloudFront Functions vs. Lambda@Edge selection |
| "Block / redirect by country" | Geo-routing — pair with WAF if security is the goal |
| Cache rules / TTL strategy | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "cache-optimization" })` |
| WAF / DDoS / bot management | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "waf-edge" })` |
| Origin selection / failover | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "cdn-design" })` |
| Edge troubleshooting | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "troubleshoot" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical edge routing — anycast, geo, latency, FD vs. TM matrix, CF cache behaviors, GCP URL maps, edge-compute samples, A/B + canary, routing decision tree | [[Edge-Routing]] | `cn_vault_page({ page: "Edge-Routing" })` |
| CDN design (origin selection / multi-origin failover) | [[CDN-Architecture-Design]] | `cn_vault_page({ page: "CDN-Architecture-Design" })` |
| WAF / DDoS (when geo-blocking or rate-limiting is in scope) | [[Edge-WAF-and-DDoS]] | `cn_vault_page({ page: "Edge-WAF-and-DDoS" })` |

Row #1 is mandatory. Row #3 is mandatory if the routing answer overlaps security.

---

## Required inputs — collect before answering

1. **Routing requirement** — anycast (default) / geo / latency / path / header / weighted / canary.
2. **Protocol** — HTTP/HTTPS (L7 CDN) or TCP/UDP (DNS steering / Global Accelerator / TCP proxy LB).
3. **Edge logic needs** — header manipulation only / URL rewrite / origin selection / auth check / image processing.
4. **A/B or canary** — assignment basis (cookie / header / random %), rollout %, measurement plan.
5. **Failover speed requirement** — instant (proxy with health probes) vs. DNS TTL acceptable.
6. **Cloud(s) in scope** — drives which constructs to cite.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Edge-Routing`**.
3. **If protocol is non-HTTP** — pivot to DNS steering / Global Accelerator / TCP proxy LB and surface that CDN-edge routing skills don't apply.
4. **Pick the routing method** — anycast is the default; layer geo / latency / weighted on top per requirement.
5. **For Azure** — Front Door (instant failover, WAF, caching) vs. Traffic Manager (DNS-only, any protocol). Cite the vault matrix.
6. **For AWS** — CloudFront cache behaviors (path / host patterns) + managed cache policies for steady state; add Functions / Lambda@Edge when logic is needed.
7. **For GCP** — URL maps with `hostRules` + `pathMatchers` + `routeRules` (priority-ordered); add Service Extensions for in-path logic.
8. **For edge compute** — pick CloudFront Functions (<1 ms, JS, no network) vs. Lambda@Edge (up to 30 s, Node/Python, network + body access) per the vault matrix.
9. **For A/B / canary** — apply consistent-assignment + cache-key-separation + gradual-rollout discipline; surface the 1% → 5% → 20% → 50% → 100% pattern.
10. **Emit** in the format below.

---

## Output format

Every edge-routing answer should emit:

1. **Inputs assumed** — one line each.
2. **Routing method** — anycast / geo / latency / weighted / canary + rationale.
3. **Per-provider implementation pointer** — name the construct (FD route / CF cache behavior / GCP URL map) and link to vault snippet.
4. **Edge-compute decision** — Functions vs. Lambda@Edge / FD Rules Engine / GCP Service Extensions; cite the constraint matrix.
5. **A/B or canary plan** — assignment basis, % split, cache-key impact, measurement, rollout schedule.
6. **Failover characteristics** — DNS TTL vs. instant; impact on RTO.
7. **What this excludes** — cache rules (cache-optimization), WAF rules (waf-edge), origin design (cdn-design).
8. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's matrices and samples.

1. **Recommending Front Door for TCP/UDP.** FD is HTTP/HTTPS/WebSocket only. For non-HTTP global, pivot to Traffic Manager / Global Accelerator / GCP proxy NLB.
2. **Recommending Traffic Manager when instant failover is required.** TM is DNS-only; failover speed = TTL. If the SLA needs sub-30-second failover, you need a proxy LB (FD / Application LB).
3. **Forgetting to update the cache key for A/B testing.** Serving the wrong variant from cache silently breaks the experiment. The variant *must* be in the cache key.
4. **Recommending Lambda@Edge for simple header rewrites.** CloudFront Functions are 6× cheaper, sub-millisecond, scale to millions RPS. Use Lambda@Edge only when you need network / body access / longer runtime.
5. **Using geo-routing as a security control.** Geo is bypassable by VPN/proxy; use it as routing optimisation only. For security, pair with WAF geo-block.
6. **Canary at 50%+ from day 1.** Always start at 1% and ramp; the rollback path is much harder once large user populations are sticky to the new origin.
7. **Recommending GCP Service Extensions without checking supported LBs.** Service Extensions only run on supported global external Application LB paths — cite the vault page link for current support.
8. **Path-based routing without ordering priority.** GCP `routeRules` and AWS cache behaviors are priority-ordered — wrong priority means the wrong backend matches. Always set explicit priorities.
9. **Treating "anycast" as automatic global LB.** Anycast routes to the nearest POP, but origin selection at that POP is a separate decision (latency-based, priority/weight, etc.). Don't conflate.

**Analysis only — verify against vendor documentation before applying.**
