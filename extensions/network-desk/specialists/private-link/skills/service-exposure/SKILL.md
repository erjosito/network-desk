# Skill: Service Exposure via Private Link (`pl_service_exposure`)

Expose your own services privately to consumers in other VNets/VPCs, subscriptions, accounts, tenants, or clouds — using Azure Private Link Service, AWS PrivateLink (interface endpoint service), or GCP Private Service Connect.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the workflow, output shape, and producer-side guardrails. The per-service requirements, deployment commands, and pitfalls live in the vault and **must be loaded with `cn_vault_page` before answering** — do not paraphrase or recall them from memory.

Mandatory steps every time you use this skill:

1. Identify the producer cloud(s).
2. Call `cn_vault_page` for each producer-side page in the **Reference pages** table below.
3. Build the answer around the loaded page(s); cite the page name when you state a requirement.

If the user asks about a producer service that is **not** in the table, fall back to `cn_search({ query: "<keywords>", specialist: "cn_pl", cloud: "<azure|aws|gcp>" })`, identify the right page, then load it with `cn_vault_page`.

---

## When to use service exposure

| Scenario | Producer pattern |
|---|---|
| SaaS provider sharing a service with customers privately | Private Link Service / PrivateLink endpoint service / PSC service attachment |
| Internal shared service consumed by multiple business units / subscriptions / accounts | Same as above, scoped to the org |
| Cross-cloud private API access | Producer-side private link + cross-cloud connectivity (VPN / ExpressRoute + Direct Connect / Interconnect) |
| Partner integration without public internet | Cross-tenant / cross-account Private Link with manual approval |

**Not this skill — use the sibling skill instead:**

- Designing the **consumer** side (private endpoints, DNS records consumers create) → `cn_skill({ specialist: "cn_pl", skill: "endpoint-design" })`
- Wiring **DNS** for the private endpoint (Private DNS zones, conditional forwarders) → `cn_skill({ specialist: "cn_pl", skill: "dns-integration" })`
- **Security review** of an existing producer/consumer setup → `cn_skill({ specialist: "cn_pl", skill: "security-review" })`
- **Troubleshooting** an existing private link → `cn_skill({ specialist: "cn_pl", skill: "troubleshoot" })`

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Azure producer — Private Link Service (PLS) | [[Private-Link-Service]] | `cn_vault_page({ page: "Private-Link-Service" })` |
| AWS producer — interface endpoint service (NLB-fronted) | [[PrivateLink]] | `cn_vault_page({ page: "PrivateLink" })` |
| GCP producer — PSC service attachment | [[Service-Attachment]] | `cn_vault_page({ page: "Service-Attachment" })` |
| AWS — Gateway Load Balancer endpoint service (appliance insertion, **not** application services) | search-then-load | `cn_search({ query: "Gateway Load Balancer endpoint service", cloud: "aws" })` then `cn_vault_page` |
| Consumer-side concept (for context) | [[Private-Endpoint]] · [[VPC-Endpoint]] · [[Private-Service-Connect]] | `cn_vault_page({ page: "<slug>" })` |

Call **only the row(s) for the producer cloud(s) the user asked about**. Loading every cloud's page when the user only mentioned Azure wastes context.

---

## Workflow

1. **Disambiguate the producer cloud** — Azure, AWS, GCP, or multi-cloud? If unclear, ask.
2. **Disambiguate the use case** — application service exposure (the default, this skill's scope) vs. appliance insertion (AWS GWLB, separate pattern — flag and redirect).
3. **Load the producer-side vault page(s)** for the chosen cloud(s) using the table above.
4. **Walk the user through the producer-side decisions**, citing the loaded page:
   - Front-end (LB type — Standard LB for Azure PLS, NLB for AWS interface endpoint service, Internal LB for GCP PSC).
   - NAT / endpoint subnet sizing and placement.
   - Visibility / consumer allow-list (tenants, subscriptions, accounts, projects).
   - Approval model (auto-approve vs. manual approval) — call this out explicitly; manual is the safe default for cross-tenant / cross-account.
   - Identification of the consumer on the producer side (e.g. Azure TCP proxy protocol v2 to preserve the consumer PE IP).
5. **Address cross-cloud exposure** if the consumer is in a different cloud — vault page covers this; producer-side stays the same, plus the cross-cloud network path and DNS forwarding strategy.
6. **Emit the output** in the shape below.

---

## Output format

Every service-exposure answer should include, in this order:

1. **One-line recommendation** — which producer pattern fits the user's cloud(s).
2. **Prerequisites** — bullet list pulled from the loaded vault page (LB type, NAT subnet, approval mode, …). Cite the page name.
3. **Deployment outline** — high-level steps (vault page has the commands; cite the page rather than restating the full CLI unless the user asked for it).
4. **Consumer-side note** — a one-sentence pointer to the consumer-side skill if the user will also build the consumer.
5. **Approval-model decision** — auto vs. manual; recommend manual for cross-tenant / cross-account / partner use cases.
6. **Cross-cloud caveat (if applicable)** — call out that Private Link is regional and cross-cloud requires VPN / ExpressRoute / Interconnect + DNS forwarding.
7. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are **workflow** anti-patterns specific to this skill — they are not a substitute for the vault page's per-service pitfall list. Always also surface the loaded vault page's "Common pitfalls" / "Common Service Exposure Mistakes" section.

1. **Answering without loading the vault page.** Produces stale or imprecise commands. The vault is the single source of truth for requirements — load it first.
2. **Mixing producer and consumer concerns.** This skill is producer-side only. Consumer-side (private endpoint creation, DNS records that consumers register) belongs to `endpoint-design`; routing both into one answer confuses ownership.
3. **Recommending Gateway Load Balancer endpoint service for an application-exposure question.** GWLB endpoint services are for appliance insertion (firewalls, IDS, security tools) — a different pattern, not a substitute for PrivateLink interface endpoint service. If the user wants GWLB, redirect to the appliance-insertion pattern.
4. **Skipping the approval-model question.** Auto-approval is convenient inside one org; it is the wrong default for cross-tenant / cross-account / partner integrations. Always make this an explicit decision.
5. **Treating Private Link as multi-region.** Each producer endpoint is regional. Multi-region consumers need per-region producer deployments and a regional routing strategy (DNS-based or app-layer).

**Analysis only — verify against vendor documentation before applying.**
