# Skill: Private Endpoint Security Review (`pl_security_review`)

Review and harden an existing private-endpoint deployment. Drives a structured checklist across PE-subnet network policies, NSG/UDR, public-access disablement on the PaaS resource, service-firewall exceptions, endpoint policies (AWS), VPC Service Controls (GCP), DNS, connection state, and logging.

The single most common finding: **a PE is in place but public access is still allowed** on the PaaS resource.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the review methodology, the order of checks, the output (a checklist with status + evidence), and the "what counts as a finding" judgements. The exact NSG / UDR / public-access / endpoint-policy commands and the full checklist live in the vault and **must be loaded with `cn_vault_page` before issuing the review** — do not paraphrase commands from memory.

Mandatory steps every time you use this skill:

1. Identify which cloud(s) and which PaaS service(s) the PE fronts.
2. Call `cn_vault_page({ page: "Private-Endpoint-Security-Review" })` for the canonical checklist + commands.
3. Load the per-service / per-cloud reference page if a specific service detail is needed (Storage, SQL, Key Vault, Cosmos, S3, BigQuery, etc.).
4. Build the review around the loaded page(s); cite the page name in each finding.

If the user asks about a service or control plane not in the table below, fall back to `cn_search({ query: "<keywords>", specialist: "cn_pl" })` or `cn_search({ query: "<keywords>", specialist: "cn_nsec" })`, identify the right page, then load it.

---

## When to use security review

| Scenario | Behaviour |
|---|---|
| "We have private endpoints in place — can you check we did this right?" | Run the full checklist |
| "We're enabling Private Link for service X — what hardening steps are mandatory?" | Run the relevant subset (mostly: public access off, network policies on, NSGs scoped, logging on) |
| Compliance / audit prep (CIS, NIST, customer security questionnaire) | Run full checklist + emit findings in pass/fail/gap format |
| The user wants to **design** the PE (subnet, groupId) | Redirect: `cn_skill({ specialist: "cn_pl", skill: "endpoint-design" })` |
| The user wants to **expose** their own service | Redirect: `cn_skill({ specialist: "cn_pl", skill: "service-exposure" })` |
| Resolution is broken | Redirect: `cn_skill({ specialist: "cn_pl", skill: "troubleshoot" })` |
| Broader network security posture (firewalls, segmentation, identity) | Redirect: `cn_role({ specialist: "cn_nsec" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical PE security-review checklist + per-cloud commands + common mistakes | [[Private-Endpoint-Security-Review]] | `cn_vault_page({ page: "Private-Endpoint-Security-Review" })` |
| Azure consumer page (subnet rules, network-policies states, groupId table) | [[Private-Endpoint]] | `cn_vault_page({ page: "Private-Endpoint" })` |
| Azure producer page (PLS NAT, source IP, visibility scope) | [[Private-Link-Service]] | `cn_vault_page({ page: "Private-Link-Service" })` |
| AWS consumer page (endpoint policies, security groups, `--private-dns-enabled`) | [[VPC-Endpoint]] | `cn_vault_page({ page: "VPC-Endpoint" })` |
| GCP consumer page (PSC firewall rules, IAM on the consumer side) | [[Private-Service-Connect]] | `cn_vault_page({ page: "Private-Service-Connect" })` |
| DNS hardening (rogue / split-horizon / zone hijacks) | [[Private-Endpoint-DNS-Integration]] | `cn_vault_page({ page: "Private-Endpoint-DNS-Integration" })` |

Call **only the row(s) relevant to the user's deployment**. The canonical checklist (row #1) is mandatory; the others are conditional.

---

## Review methodology (fixed order)

Walk the checks in this order — earlier failures change later guidance:

1. **Public access** — is it explicitly disabled on the PaaS resource? (PE does **not** disable public access; this is mistake #1.)
2. **Service-firewall exceptions** — are there `Allow public IP X.Y.Z.W` or `Allow all networks` rules that defeat the PE?
3. **Approval state** — is the PE connection state `Approved` / `Available` (not Pending / Rejected / Disconnected)?
4. **PE-subnet network policies** — for Azure, is `privateEndpointNetworkPolicies` set to `Enabled` (or `NetworkSecurityGroupEnabled` / `RouteTableEnabled`)? Without this, NSGs and UDRs are ignored for PE traffic.
5. **NSG / security group / firewall rules on the PE side** — least-privilege source ranges, deny-all default, port 443 (or service port).
6. **Egress controls (AWS endpoint policy / GCP VPC Service Controls)** — endpoint policy scoped to specific buckets / actions; VPC-SC perimeters in place; not the default `*:*` allow.
7. **DNS** — does the FQDN resolve to the private IP from inside the VNet/VPC? (If no, PE is bypassed even though it exists.)
8. **Logging** — VNet flow logs (Azure, preferred over NSG flow logs for new deployments), VPC flow logs (AWS), VPC Flow Logs (GCP), Activity Log / CloudTrail / Cloud Audit Logs for PE config changes.
9. **Tenant- / org-wide guardrails** — Azure Policy denying `publicNetworkAccess=Enabled` on the relevant resource types; AWS SCP denying public endpoint creation; GCP Org Policy `constraints/storage.publicAccessPrevention`.

---

## Output format

Every review answer should emit:

1. **Scope** restated in one line (cloud(s), services, PE count if known).
2. **Checklist with status** — one row per check from the methodology above, status one of `Pass` / `Fail` / `Gap (need info)`, plus the verification command (cited from the loaded vault page).
3. **Top 3 findings** — ranked by severity. Each finding cites the vault page section and the exact remediation command.
4. **Recommended guardrails** — Azure Policy / AWS SCP / GCP Org Policy entries to prevent regression.
5. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are **workflow** anti-patterns for security reviews — not a substitute for the vault page's "Common Security Mistakes" list. Always also surface the loaded vault page's mistake list.

1. **Reviewing PE config without checking the PaaS resource.** Most PE deployments fail security review because the PaaS resource still has public access on; the PE itself is fine.
2. **Trusting that NSGs apply because they exist.** On Azure, the NSG is ignored unless `privateEndpointNetworkPolicies` is `Enabled` on the subnet. Always check the subnet flag first; otherwise NSG findings are misleading.
3. **Forgetting service-firewall exception rules.** A storage account with a single `Allow IP 0.0.0.0/0` rule defeats the PE entirely; check the service's network-rule list, not only the PE.
4. **Recommending NSG flow logs for new Azure deployments.** Microsoft is migrating to VNet flow logs; recommend VNet flow logs for new work and call out NSG flow logs only when reviewing legacy deployments — cite the lifecycle note from the vault page.
5. **Defaulting to AWS endpoint policy = "Allow `*` on `*`".** This is the default and almost always over-permissive; review must scope endpoint policies down to specific actions / buckets / topics.
6. **Treating the PE as a substitute for IAM / authorisation.** PE changes the network path only; identity / RBAC / resource-policy still need to be correct. Always include one line in the review noting this.
7. **Issuing a "pass" without checking DNS resolution from inside the VNet.** A PE that exists but isn't resolved to is functionally absent — DNS is part of the security posture, not separate from it.

**Analysis only — verify against vendor documentation before applying.**
