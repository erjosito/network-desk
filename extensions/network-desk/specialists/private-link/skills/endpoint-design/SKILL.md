# Skill: Private Endpoint Design (`pl_endpoint_design`)

Design the **consumer side** of private connectivity: private endpoint subnet placement, IP planning, sub-resource / groupId selection, gateway-vs-interface endpoint decisions, approval workflow handling, and multi-region strategy across Azure Private Endpoints, AWS VPC endpoints, and GCP Private Service Connect endpoints.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the workflow, output shape, and consumer-side guardrails. The per-service requirements, sub-resource / groupId tables, deployment commands, and pitfalls live in the vault and **must be loaded with `cn_vault_page` before answering** — do not paraphrase or recall them from memory.

Mandatory steps every time you use this skill:

1. Identify the consumer cloud(s) and the target service(s).
2. Call `cn_vault_page` for each consumer-side page in the **Reference pages** table below.
3. Build the answer around the loaded page(s); cite the page name when you state a requirement (subnet sizing, groupId, approval mode, etc.).

If the user asks about a service or pattern not in the table, fall back to `cn_search({ query: "<keywords>", specialist: "cn_pl", cloud: "<azure|aws|gcp>" })`, identify the right page, then load it.

---

## When to use endpoint design

| Scenario | Consumer pattern |
|---|---|
| Consume an Azure PaaS service privately (storage, SQL, Key Vault, …) | Azure Private Endpoint with the right groupId |
| Consume an AWS service privately (S3, SQS, KMS, …) or a partner PrivateLink service | AWS interface endpoint (or gateway endpoint for S3 / DynamoDB) |
| Consume a published GCP service or Google APIs privately | GCP PSC endpoint (service attachment or `all-apis` bundle) |
| Centralised PE pattern (hub) vs distributed PE per spoke | Topology decision — covered in the workflow below |

**Not this skill — use the sibling skill instead:**

- Producer side (exposing your service via PLS / endpoint service / service attachment) → `cn_skill({ specialist: "cn_pl", skill: "service-exposure" })`
- Private DNS zones, conditional forwarders, cross-VNet DNS → `cn_skill({ specialist: "cn_pl", skill: "dns-integration" })`
- Reviewing an existing endpoint setup for hardening → `cn_skill({ specialist: "cn_pl", skill: "security-review" })`
- "It's broken" on an existing endpoint → `cn_skill({ specialist: "cn_pl", skill: "troubleshoot" })`

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Azure consumer — Private Endpoint (groupIds, subnet sizing, approval, mistakes) | [[Private-Endpoint]] | `cn_vault_page({ page: "Private-Endpoint" })` |
| AWS consumer — Interface endpoint, Gateway endpoint, S3 trade-off | [[VPC-Endpoint]] | `cn_vault_page({ page: "VPC-Endpoint" })` |
| GCP consumer — PSC endpoint (Google APIs bundle vs published service) | [[Private-Service-Connect]] | `cn_vault_page({ page: "Private-Service-Connect" })` |
| Producer-side context (when consumer asks "what's on the other side?") | [[Private-Link-Service]] · [[PrivateLink]] · [[Service-Attachment]] | `cn_vault_page({ page: "<slug>" })` |

Load **only the row(s) for the consumer cloud(s) the user asked about**. The producer-side rows are only needed when the user is bridging a producer/consumer conversation.

---

## Workflow

1. **Disambiguate the consumer cloud and the target service** — e.g. "Azure consumer reaching storage blob" vs "AWS consumer reaching SQS" vs "GCP consumer reaching Google APIs". If unclear, ask.
2. **Load the consumer-side vault page** for that cloud (table above).
3. **Pick the endpoint type** (cloud-specific decision — defer to the vault page):
   - Azure: always Private Endpoint, **must** specify the right `groupId` (one PE per groupId; storage typically needs `blob` + `dfs` + `file` + … separately).
   - AWS: Interface endpoint by default; **Gateway endpoint only for S3 and DynamoDB** when the consumer is in-VPC (no cross-VPC / on-prem reach).
   - GCP: PSC endpoint with `all-apis` bundle for Google APIs, or a service-attachment URI for a published service.
4. **Decide centralised vs distributed PE placement**:
   - **Centralised (hub)**: single Private DNS zone, hub firewall inspection, extra peering hop / latency.
   - **Distributed (per spoke)**: lower latency, requires Private DNS zone links per VNet, more zone management.
5. **Size the PE subnet** per the vault page (Azure: 1 IP per PE; AWS interface endpoint: 1 ENI per AZ; GCP PSC: 1 forwarding-rule IP). Plan for ≥2× current usage. Never put PEs in `GatewaySubnet` / `AzureFirewallSubnet` / equivalents.
6. **Surface the approval mode** the consumer will hit (auto / manual / cross-tenant) — table in the vault page.
7. **Call out public-access lockdown**: the PE alone does not block the public path. The producer must also disable public network access (e.g. Azure `publicNetworkAccess: Disabled`, AWS bucket policies that deny non-VPC access, GCP service-level controls).
8. **Emit the output** in the shape below.

---

## Output format

Every endpoint-design answer should include, in this order:

1. **Endpoint type recommendation** — exact resource type for the user's cloud and service (Azure PE with groupId X, AWS interface endpoint vs gateway endpoint, GCP PSC endpoint variant).
2. **Subnet plan** — dedicated vs shared, size, naming, NSG/SG stance — cite the vault page's sizing table.
3. **GroupId / sub-resource / service name** — for Azure: the exact `groupId` and corresponding Private DNS zone; for AWS: `com.amazonaws.<region>.<service>`; for GCP: the `target-google-apis-bundle` or service-attachment URI. **Cite the vault page** — do not recall from memory.
4. **Placement decision** — centralised hub vs distributed spoke, with the latency / DNS-mgmt trade-off stated.
5. **Approval-mode expectation** — what the consumer should expect (auto-approved / waiting on producer manual approval / cross-tenant flow).
6. **Lockdown reminder** — explicitly note that public access must be disabled at the producer service for the PE to be the only path.
7. **DNS pointer** — one-sentence pointer to `dns-integration` if the consumer also needs Private DNS zones / forwarders.
8. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are **workflow** anti-patterns specific to this skill — they are not a substitute for the vault page's pitfall list. Always also surface the loaded vault page's "Common pitfalls" / "Common PE Design Mistakes" section.

1. **Answering without loading the vault page.** The `groupId` table, subnet rules, and approval matrices change over time; recall from memory is unreliable. Load first, then answer.
2. **One PE for a multi-sub-resource Azure service.** Storage has `blob`, `file`, `table`, `queue`, `dfs` — each needs its own PE if you use that sub-resource. Recommending "one PE for storage" is wrong.
3. **Recommending Gateway endpoint for cross-VPC / on-prem S3 access.** Gateway endpoints are free but VPC-local; cross-VPC or on-prem reach requires an Interface endpoint. Decide based on the consumer's reach pattern.
4. **Skipping the public-access lockdown step.** A PE without disabling the producer's public path is a hardening illusion — public DNS and public IP still work. Always pair the PE recommendation with the producer-side public-network-access disable.
5. **Undersizing the PE subnet.** A `/28` looks fine for "we have 5 PEs today" but breaks the next time the team adds a service. Default to ≥2× current count, and document the planned ceiling.
6. **Putting PEs in a multi-purpose subnet.** Mixed NSG / route requirements between workload VMs and PEs lead to silent breakage. Default to a dedicated PE subnet for production.
7. **Forgetting multi-region.** PEs are regional. Multi-region consumers need PEs in each region (and either per-region zones or a regional DNS strategy) — covered in `dns-integration`.

**Analysis only — verify against vendor documentation before applying.**
