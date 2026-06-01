# Skill: Load Balancer Selector (`lb_selector`)

Cross-cloud decision matrix for choosing the right load balancer (Azure / AWS / GCP) based on protocol layer (L4 vs. L7), scope (regional vs. global, public vs. private), feature requirements (WAF, WebSocket, gRPC, mTLS, static IP, PrivateLink-provider role), and cost sensitivity. Per-cloud decision trees, the cross-cloud feature comparison, and the quick-reference CLI live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the "five decision inputs" intake checklist, the cross-cloud selection methodology, sibling-skill redirects (probes / TLS / routing / troubleshoot), and the workflow anti-patterns. The exact per-cloud decision trees, deprecation notes (Azure LB Basic, AppGW v1, Front Door Classic, AWS Classic LB), the cross-cloud feature matrix, and quick-reference CLI live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Load-Balancer-Selection" })` for canonical decision trees and the cross-cloud comparison table.
2. Load service pages when a specific service is in scope (e.g. `Front-Door`, `AWS-Application-Load-Balancer`, `Cloud-Load-Balancing`).
3. Cite the vault page when stating a deprecation, SKU constraint, or feature gap.

If a service is not in the vault, fall back to `cn_search({ query: "<keywords>", specialist: "cn_lb" })`.

---

## When to use lb-selector

| Scenario | Behaviour |
|---|---|
| "Which load balancer should we use for X?" | Run the 5-input intake + cross-cloud selection |
| "L4 vs L7 — what do we need?" | Use the protocol-layer gate (vault page §Decision inputs) |
| "Do we need global or regional?" | Use the scope gate (DNS-based vs. anycast-based steering) |
| "We need static IP / WAF / WebSocket / gRPC / mTLS / PrivateLink-provider — which LB?" | Use the special-features matrix |
| Health probe design | Redirect: `cn_skill({ specialist: "cn_lb", skill: "health-probes" })` |
| TLS / SNI / cert chain design | Redirect: `cn_skill({ specialist: "cn_lb", skill: "tls-config" })` |
| Path / host / header routing rules | Redirect: `cn_skill({ specialist: "cn_lb", skill: "traffic-routing" })` |
| LB troubleshooting (5xx, slow, intermittent) | Redirect: `cn_skill({ specialist: "cn_lb", skill: "troubleshoot" })` |
| Global L4 + anycast IP | AWS Global Accelerator / Azure LB Global tier / GCP external proxy NLB (cite vault page) |
| LB cost estimation | Redirect: `cn_skill({ specialist: "cn_price", skill: "lb-pricing" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical LB selection — per-cloud decision trees, cross-cloud matrix, common mistakes, quick CLI | [[Load-Balancer-Selection]] | `cn_vault_page({ page: "Load-Balancer-Selection" })` |
| Azure Front Door (global L7) | [[Front-Door]] | `cn_vault_page({ page: "Front-Door" })` |
| AWS Application Load Balancer | [[AWS-Application-Load-Balancer]] | `cn_vault_page({ page: "AWS-Application-Load-Balancer" })` |
| AWS Network Load Balancer | [[AWS-Network-Load-Balancer]] | `cn_vault_page({ page: "AWS-Network-Load-Balancer" })` |
| GCP Cloud Load Balancing | [[Cloud-Load-Balancing]] | `cn_vault_page({ page: "Cloud-Load-Balancing" })` |
| Health probe design (almost always paired) | [[Health-Probe-Design]] | `cn_vault_page({ page: "Health-Probe-Design" })` |

Row #1 is mandatory. Rows #2–5 are mandatory when the specific service is in scope. Row #6 is mandatory whenever an LB is being deployed.

---

## Required inputs — collect before answering (the "5 decision inputs")

1. **Protocol layer** — L4 (TCP/UDP) vs. L7 (HTTP/HTTPS/gRPC).
2. **Traffic direction** — public (internet-facing) vs. private (internal).
3. **Scope** — regional vs. global (multi-region).
4. **Special features** — WAF / WebSocket / gRPC / static IP / PrivateLink-provider / mTLS / Cognito-OIDC.
5. **Cost sensitivity** — dev/test low-traffic vs. high-throughput prod.

Refuse to recommend an LB if any of these is unknown. Most "wrong LB" mistakes come from skipping the intake.

---

## Workflow

1. **Collect the 5 inputs** above.
2. **Load `Load-Balancer-Selection`**.
3. **Run the per-cloud decision tree** for the cloud(s) in scope. Confirm the tree's "leaf" answer with the cross-cloud matrix before committing.
4. **Eliminate by special-feature requirements** — e.g. "need static IP and L7" → AppGW v2 / NLB-in-front-of-ALB / GCP external proxy NLB.
5. **Eliminate by deprecation** — Azure LB Basic, AppGW v1, Front Door Classic, AWS Classic LB are not options for new builds; surface the deprecation explicitly.
6. **Validate PrivateLink-provider eligibility** if user needs to publish a private service (Azure Std LB → PL Service; AWS NLB → PrivateLink; GCP Internal LB → Service Attachment / PSC).
7. **Validate cost model** — ALB LCU vs. NLB hourly vs. AppGW capacity unit vs. GCP forwarding-rule pricing; redirect cost detail to `cn_price`.
8. **Emit** in the format below.

---

## Output format

Every lb-selector answer should emit:

1. **Inputs assumed** — the 5 decision inputs, one line each.
2. **Recommendation** — one LB per cloud in scope (or one cross-cloud answer if requirements truly align).
3. **Decision trail** — which gate of the decision tree was used; cite the vault page section.
4. **Alternatives considered + rejected** — and why (deprecated, missing feature, wrong scope).
5. **Feature gaps to plan around** — e.g. "ALB has no static IP — front it with NLB or use Global Accelerator for whitelisting".
6. **Next-step handoffs** — health-probes / TLS / routing / troubleshoot / pricing.
7. **What this excludes** — probe design, TLS chain, path / host rules, ruleset specifics, cost figures.
8. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's "Common selection mistakes" list.

1. **Recommending an LB before collecting all 5 inputs.** Especially: assuming public when the user meant private, or assuming regional when the roadmap is multi-region.
2. **Recommending Azure LB Basic / AppGW v1 / Front Door Classic / AWS Classic LB.** All deprecated or retired. Never propose for new builds.
3. **Recommending Azure Front Door for global L4.** Front Door is L7 HTTP(S) only. For global L4 → Azure Standard LB Global tier (cite vault page).
4. **Forgetting that ALB has no static IP.** If the downstream firewall whitelists by IP, ALB alone is wrong — pair with NLB or Global Accelerator.
5. **Recommending Cloud CDN over a regional Application LB without checking backend support.** Cloud CDN only works with specific external Application LB / backend-bucket patterns.
6. **Quoting GCP product names from memory.** GCP renamed/regrouped the load-balancing products; always pull current names from the vault page (e.g. "Global external Application LB", not "Global HTTP(S) LB").
7. **Forgetting WAF on public L7.** Every public-facing L7 endpoint should have a WAF; if the LB doesn't include one, add it in front.
8. **Confusing Traffic Manager / Route 53 / Cloud DNS routing with a load balancer.** They're DNS-based steering (TTL-based failover, no proxy) — do not recommend them as a substitute for an actual LB when the user wants inline proxying.
9. **Recommending GLB as a general-purpose LB.** AWS Gateway Load Balancer is for inspection-appliance insertion only — not a generic L4/L7 LB.

**Analysis only — verify against vendor documentation before applying.**
