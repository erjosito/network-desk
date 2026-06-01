# Skill: Egress Cost Architecture (`price_skill_egress_architecture`)

Design architectures that **structurally avoid egress charges** — not just measure them. Covers private endpoints / PrivateLink, CDN offload, regional pinning, cross-AZ minimisation, dedicated interconnects, egress-free storage tiers, payload compression, multi-cloud double-billing avoidance, and the AWS NAT-GW tax. Owns the "biggest savings first" prioritisation and the cost-architecture review questionnaire. Per-cloud egress meter rules, the 10-pattern catalogue, the modelling formulas, and reference links live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *change-the-architecture* framing (vs `egress-calc` which measures; vs `cost-optimizer` which trims), the priority of patterns 1-3 (private endpoints → CDN → regional pinning) over the rest, and the modelling/reversibility discipline. The 10-pattern catalogue, per-cloud egress-meter rules, mermaid diagrams, modelling formula, and review questionnaire all live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Egress-Cost-Architecture" })` for the canonical 10-pattern catalogue (private endpoints → CDN → regional pinning → cross-AZ → dedicated interconnect → egress-free storage → compression → multi-cloud → NAT-GW tax → tier discounts), per-cloud meter rules, modelling formulas, and review questionnaire.
2. Cite the vault page when quoting per-cloud rates, free-tier rules, or break-even formulas.
3. If the user wants to *measure* current egress, redirect to `egress-calc`; if they want to *trim general network waste*, redirect to `cost-optimizer`.

If a pattern isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_price" })`.

---

## When to use egress-architecture

| Scenario | Behaviour |
|---|---|
| "How do we redesign to cut egress?" | Apply the 10-pattern catalogue, prioritising 1-3 |
| "Should we adopt CDN / private endpoints?" | Run patterns 1-2, including the cache-strategy gate |
| "Multi-region active-active is killing our bill" | Pattern 3 (regional pinning) — quantify the RPO/RTO vs egress trade |
| "AWS NAT GW is dominating our line items" | Pattern 1 (Gateway Endpoints) + pattern 9 (NAT-GW tax) |
| "Cross-AZ traffic on AWS is huge" | Pattern 4 (cross-AZ minimisation) |
| "We're sending 50+ TB/mo to internet" | Pattern 5 (dedicated interconnect break-even) |
| Calculating *current* egress cost | Redirect: `cn_skill({ specialist: "cn_price", skill: "egress-calc" })` |
| General networking waste / right-sizing | Redirect: `cn_skill({ specialist: "cn_price", skill: "cost-optimizer" })` |
| Specifically private-endpoint design | Redirect: `cn_skill({ specialist: "cn_pl", skill: "endpoint-design" })` |
| CDN cache strategy | Redirect: `cn_skill({ specialist: "cn_cdn", skill: "cache-optimization" })` |
| Cross-cloud transit topology | Redirect: `cn_skill({ specialist: "cn_mcn", skill: "transit-design" })` |
| Pattern 5 (dedicated circuits) detailed design | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "expressroute-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical egress-architecture catalogue — per-cloud meter rules, 10 patterns (private endpoints → tier discounts), mermaid diagrams, modelling formulas, review questionnaire, anti-patterns, references | [[Egress-Cost-Architecture]] | `cn_vault_page({ page: "Egress-Cost-Architecture" })` |
| Egress *measurement* (companion) | [[Egress-Cost-Calculation]] | `cn_vault_page({ page: "Egress-Cost-Calculation" })` |

Row #1 is mandatory.

---

## Required inputs — collect before answering

1. **Top 5 egress contributors by source / dest / meter** — without this, you'll misprioritise. If unavailable, redirect to `egress-calc` first.
2. **Per-meter monthly GB volume**.
3. **Cloud(s)** in scope.
4. **Workload class** — user-facing web (CDN-friendly), back-end APIs (compression-friendly), data replication (regional-pinning-relevant), batch (egress-free storage candidate).
5. **RPO/RTO requirements** — drives regional-pinning feasibility.
6. **Existing dedicated connectivity** — already have ER/DX/Interconnect? Drives pattern 5.
7. **Implementation budget + downtime tolerance**.

---

## Workflow

1. **Collect inputs** above. **Refuse to act without top-5 egress contributors** — guesses misprioritise. Redirect to `egress-calc` if missing.
2. **Load `Egress-Cost-Architecture`**.
3. **For each top-5 contributor**, walk the 10-pattern catalogue *in order*:
   - **Pattern 1 (private endpoint)** — if dest is a same-cloud managed service.
   - **Pattern 2 (CDN)** — if dest is user-facing cacheable content.
   - **Pattern 3 (regional pinning)** — if it's cross-region replication on the hot path.
   - **Pattern 4 (cross-AZ minimisation)** — AWS only; topology-aware routing.
   - **Pattern 5 (dedicated interconnect)** — only when egress > 5-20 TB/mo to a single destination.
   - **Patterns 6-9** as filters for residual cases.
4. **For each chosen pattern** — quantify current vs proposed using the modelling formula; compute break-even months.
5. **Apply the cost-architecture review questionnaire** — every box from the vault page.
6. **Surface anti-patterns** — "turning on CDN with no cache strategy", "NAT GW for everything", "cross-region replication for low-RPO when async would suffice".
7. **Document reversibility** — what if traffic patterns shift in 6 months.
8. **Schedule a 30-day post-impl measurement window**.
9. **Emit** in the output format below.

---

## Output format

Every egress-architecture answer should emit:

1. **Inputs assumed** — top 5 contributors with monthly $.
2. **Pattern selection per contributor** — `Contributor 1 → Pattern 1 (private endpoint) + Pattern 7 (compression)`.
3. **Per-pattern block**:
   - Current path + meter + monthly cost.
   - Proposed path + new meter + monthly cost.
   - Setup cost + engineering effort.
   - Steady-state saving + break-even months.
   - Reversibility plan.
4. **Review-questionnaire results** — go / no-go per checklist item.
5. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
6. **Total projected monthly saving** — additive across patterns.
7. **30-day measurement plan**.
8. **What this excludes** — measurement (see `egress-calc`), general right-sizing (see `cost-optimizer`).
9. **Footer** — `Pricing is indicative — verify against current vendor pricing pages before budgeting.` then `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Acting without top-5 egress contributors.** Without data you'll suggest pattern 5 (interconnect) when the win is pattern 1 (private endpoint). Refuse and redirect to `egress-calc`.
2. **"Just turn on CDN"** with no cache-control / ETag / TTL strategy → 10% hit rate, near-zero saving.
3. **Putting NAT GW in front of S3 / DynamoDB traffic on AWS.** Gateway endpoints are free; NAT to S3 is a billing leak.
4. **Recommending Private Link / Endpoint without noting per-hour + data-processing cost.** They're cheaper than NAT/internet at scale; not free.
5. **Picking the premium CDN tier without need.** Premium pricing for features (image-optim, advanced routing) that the workload doesn't use.
6. **Cross-region replication for low-RPO availability** when an async pattern would meet SLA at a fraction of the egress cost.
7. **Multi-region active-active** where regional-active + global-failover would meet RTO at half the steady-state egress.
8. **Skipping cross-AZ analysis on AWS.** It can be 5-15% of network bill silently.
9. **Recommending dedicated interconnect at < 5 TB/mo to single destination.** Break-even doesn't justify.
10. **No reversibility plan.** Egress patterns shift with product features.
11. **Skipping the 30-day measurement window** — savings unverified.
12. **Optimising egress while egress is < 5% of total bill.** Focus where the money is.

**Pricing is indicative — verify against current vendor pricing pages before budgeting.**
**Analysis only — verify against vendor documentation before applying.**
