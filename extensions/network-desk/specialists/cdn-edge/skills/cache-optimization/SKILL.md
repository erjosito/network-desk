# Skill: Cache Optimization (`cdn_skill_cache_optimization`)

Design caching strategies at the CDN edge — `Cache-Control` headers, cache-key design, TTL strategy by content type, invalidation patterns (purge vs. cache-busting), compression (gzip / Brotli / zstd), and video/streaming optimisation (HLS / DASH / byte ranges). The exact `Cache-Control` directive table, per-provider Bicep / JSON / gcloud snippets, KQL hit-ratio queries, and the 10-step hit-ratio checklist live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the cache-key design methodology (which components to include vs. exclude), the TTL-by-content-type discipline, the "prefer cache-busting over purging" framing, and the cache-optimisation workflow anti-patterns. The exhaustive `Cache-Control` directive matrix, per-provider templates, video / streaming cache rules, and KQL / CLI / CloudWatch metrics live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "CDN-Cache-Optimization" })` for the canonical directive table, TTL-by-content-type table, invalidation patterns, compression algorithm matrix, and hit-ratio checklist.
2. Cite the vault page when stating `Cache-Control` directive semantics, SWR / stale-if-error behaviour, provider compression syntax, or purge-cost figures.

If a directive / scenario is not in the vault, fall back to `cn_search({ query: "<keywords>", specialist: "cn_cdn" })`.

---

## When to use cache-optimization

| Scenario | Behaviour |
|---|---|
| "Our cache hit ratio is X% — how do we improve it?" | Run the hit-ratio checklist (vault page §Cache Hit Ratio Optimization) |
| "Set up caching for this content type" | TTL strategy by content type (vault page §TTL Strategies) |
| "Should we purge or use cache-busting?" | Cache-busting-first framing + when purging is justified |
| "What `Cache-Control` should I send?" | Directive selection — fingerprinted vs. HTML vs. API vs. media (vault page §Cache-Control) |
| Cache-key design (query strings, headers, cookies) | Cache-key methodology — minimise what's in the key |
| Compression configuration | Compression algorithm matrix + what NOT to compress |
| Video / HLS / DASH cache rules | Streaming sub-workflow |
| CDN topology / origin design | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "cdn-design" })` |
| Edge logic / URL rewrites / A/B testing | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "edge-routing" })` |
| WAF rules at the edge | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "waf-edge" })` |
| Cache MISS / 502 from edge / stale-content investigation | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "troubleshoot" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical cache optimisation — `Cache-Control` directives, cache-key design, TTL table, invalidation, compression, streaming, hit-ratio checklist, provider metrics | [[CDN-Cache-Optimization]] | `cn_vault_page({ page: "CDN-Cache-Optimization" })` |
| CDN design (paired when sizing origin / failover) | [[CDN-Architecture-Design]] | `cn_vault_page({ page: "CDN-Architecture-Design" })` |

Row #1 is mandatory.

---

## Required inputs — collect before answering

1. **Content types in scope** — fingerprinted static assets / HTML / public APIs / user-specific APIs / images / fonts / video manifests / video segments.
2. **Cache-busting strategy** — content-hashed filenames vs. versioned URLs vs. none (drives `immutable` eligibility).
3. **Cardinality of cache-key variants** — query strings, language, device class, user/session cookies.
4. **Tolerance for stale content** — drives SWR / stale-if-error decision.
5. **Hit-ratio target** — typical: >90% static, >60% dynamic.
6. **CDN provider** — Azure Front Door / CloudFront / Cloud CDN (drives the snippet you cite).
7. **Compression preference** — gzip / Brotli / zstd; ensure no double-compression of already-compressed types.

---

## Workflow

1. **Collect inputs** above. Don't recommend TTLs without knowing the content type.
2. **Load `CDN-Cache-Optimization`**.
3. **Design the cache key** — start with `scheme + host + path`; add the absolute minimum (query whitelist, `Accept-Encoding`); refuse to add cookies / `User-Agent` unless mandatory.
4. **Pick the TTL per content type** using the vault page's table — fingerprinted = 1 yr `immutable`; HTML = 0–5 min or SWR; APIs = SWR.
5. **Add SWR / stale-if-error** unless freshness is absolute. SWR is the single biggest hit-ratio improvement most sites are missing.
6. **Plan compression** — enable gzip + Brotli for text / JSON / SVG; do NOT compress already-compressed binary (JPEG / PNG / WebP / MP4 / WOFF2 / archives).
7. **Plan invalidation** — prefer cache-busting via fingerprinted URLs; surgical purges for HTML / config; never wildcard-purge in steady state (origin thundering herd).
8. **For streaming** — short TTL on manifests, very long TTL on segments (vault page table).
9. **Apply the hit-ratio checklist** (10 items on vault page) to the current design.
10. **Recommend metrics** — provider-specific (KQL / CloudWatch / Cloud Logging snippets on vault page).
11. **Emit** in the format below.

---

## Output format

Every cache-optimization answer should emit:

1. **Inputs assumed** — one line each.
2. **Cache-key plan** — what's in vs. excluded, with rationale.
3. **TTL plan per content type** — table mapping to the vault page's TTL guidance.
4. **`Cache-Control` headers** — recommended directive per content type (cite vault row).
5. **Invalidation strategy** — cache-busting where possible; surgical purge plan otherwise.
6. **Compression plan** — algorithms + content-type whitelist.
7. **Metrics & target** — hit-ratio target + query snippet pointer.
8. **What this excludes** — origin design / WAF rules / edge logic / TLS / pricing.
9. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's directive / TTL tables.

1. **Adding cookies to the cache key for performance work.** Cookies usually destroy the hit ratio. Push back hard before agreeing.
2. **`Vary: User-Agent`.** Thousands of variants per URL. Use device-detection headers (CloudFront-Is-Mobile-Viewer) or split into separate paths instead.
3. **Quoting `max-age` without `s-maxage`.** Browser-only TTL doesn't help CDN hit-ratio. The vault page recommends `s-maxage` (CDN) + shorter `max-age` (browser) as the default pattern.
4. **Skipping SWR.** Stale-while-revalidate is the cheapest, biggest hit-ratio win — recommend it unless freshness is contractually absolute.
5. **Wildcard purges in steady state.** `/*` invalidations cause origin thundering herd. Use them only for emergency rollback.
6. **Caching API responses as `public`.** User-scoped APIs must be `private` (or `no-store`) — caching them at CDN leaks data across users.
7. **Compressing already-compressed binary.** Wastes CPU at the edge for ~0% size reduction. Always disable for JPEG / PNG / WebP / MP4 / WOFF2 / archives.
8. **Forgetting tracking-param normalisation.** `utm_*` / `fbclid` / `gclid` should be stripped from the cache key (not from the request to the origin if analytics relies on them). The vault page has the pattern.
9. **Long TTL on HLS *live* manifest.** Live streams need `max-age=2` or similar on the manifest; long TTL freezes viewers on an old playlist.
10. **Confusing cache hit-ratio target.** ">90%" is a healthy *static* target; dynamic / API will rarely exceed 60%. Don't promise the wrong number for the wrong content type.

**Analysis only — verify against vendor documentation before applying.**
