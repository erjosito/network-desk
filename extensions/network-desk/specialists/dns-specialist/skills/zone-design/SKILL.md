# Skill: DNS Zone Design (`dns_skill_zone_design`)

Design public and private DNS zone architectures across Azure DNS / AWS Route 53 / GCP Cloud DNS. Owns the *zone-type decision* (public / private / split-horizon / delegated sub-zone), the *Azure Private DNS `privatelink.*` centralisation pattern* (one shared-services RG, every VNet linked, Azure Policy auto-registration), the *cross-account VPC association protocol* (Route 53 authorise + associate), the *most-specific-zone-wins rule* (AWS overlapping zones), the *delegation strategy* (parent owned by platform; sub-zones delegated to teams; IaC mandatory), the *split-horizon precedence rule* (private zone wins for linked VNets), and the *DNSSEC scope rule* (public-only — private zones aren't part of the public hierarchy). Per-cloud CLI for public + private zones, the PaaS `privatelink.*` zone catalogue, AWS Profiles, GCP response policies, and DNSSEC enablement live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *zone-type decision*, the *centralise-privatelink-zones* pattern, the *cross-account-VPC-association* protocol, the *most-specific-zone-wins* rule, the *delegate-don't-share-edit-rights* model, the *IaC-mandatory* discipline, the *split-horizon-precedence* rule, and the *DNSSEC-public-only* awareness. Per-cloud CLI, the PaaS `privatelink.*` zone catalogue, Profiles, response policies, peering, and DNSSEC CLI live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "DNS-Zone-Design" })` for canonical zone-type table, Azure Public + Private zone CLI + PaaS `privatelink.*` zone catalogue + split-horizon example, AWS Route 53 public + private hosted zone CLI + cross-account association, GCP Cloud DNS public + private + peering zones + response policies, zone delegation strategy, and DNSSEC considerations per cloud.
2. For resolver topology (forwarding + endpoints), redirect to `resolver-design`.
3. For DNSSEC operational depth, also `cn_vault_page({ page: "DNSSEC" })`.

If a vendor / pattern isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_dns" })`.

---

## When to use zone-design

| Scenario | Behaviour |
|---|---|
| "Design DNS zones for our enterprise across Azure + AWS + GCP" | Apply zone-type table; centralise per cloud; delegate sub-zones to teams |
| "How do we expose the same FQDN internally and externally with different IPs?" | Split-horizon — separate public + private zones with same name |
| "How do we make Azure PaaS resolvable via private endpoint enterprise-wide?" | Centralise `privatelink.*` zones in shared-services RG; link every VNet; Azure Policy `Deploy-DNSPE-*` |
| "We have many AWS accounts and want one private zone everywhere" | Cross-account VPC association (authorise + associate) OR Route 53 Profiles |
| "DNS overlap between `api.internal.contoso.com` and `internal.contoso.com`" | Most-specific-zone wins rule (Route 53) |
| "Should we enable DNSSEC?" | Yes for public zones; not applicable for private zones; plan KSK rotation |
| "How do we delegate dev.contoso.com to the dev team?" | NS delegation pattern + IaC-mandatory rule |
| Resolver topology (forwarding endpoints, inbound/outbound) | Redirect: `cn_skill({ specialist: "cn_dns", skill: "resolver-design" })` |
| DNS troubleshooting | Redirect: `cn_skill({ specialist: "cn_ntsh", skill: "dns-troubleshoot" })` |
| DNS migration between clouds / providers | Redirect: `cn_skill({ specialist: "cn_dns", skill: "migration" })` |
| DNS records audit / hygiene | Redirect: `cn_skill({ specialist: "cn_dns", skill: "record-audit" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical zone-design reference — zone-type table, Azure DNS public + private + PaaS `privatelink.*` catalogue + split-horizon CLI, AWS Route 53 public + private hosted zone CLI + cross-account association, GCP Cloud DNS public + private + peering + response policies, zone delegation strategy, DNSSEC per cloud | [[DNS-Zone-Design]] | `cn_vault_page({ page: "DNS-Zone-Design" })` |
| DNSSEC operational depth (KSK / ZSK / rotation / DS record submission) | [[DNSSEC]] | `cn_vault_page({ page: "DNSSEC" })` |

The first is mandatory; the second when DNSSEC is in scope.

---

## Required inputs — collect before answering

1. **Cloud(s) + provider mix** — single cloud / multi-cloud / hybrid with on-prem authoritative.
2. **Public vs private scope** — public for internet-resolvable, private for internal.
3. **Split-horizon need** — same FQDN external + internal?
4. **PaaS services** in scope (Azure private endpoints → `privatelink.*` catalogue).
5. **Multi-account / multi-VPC reach** — cross-account associations needed?
6. **Team / environment delegation** — who owns which sub-zone?
7. **DNSSEC requirement** — compliance / public-facing?
8. **IaC stack** — Bicep / Terraform / CloudFormation.

---

## Workflow

1. **Collect inputs** above.
2. **Load `DNS-Zone-Design`** (+ `DNSSEC` if DNSSEC in scope).
3. **Decide zone type per name** — public / private / split-horizon / delegated.
4. **For each cloud apply its CLI/IaC pattern** from vault.
5. **Centralise PaaS `privatelink.*` zones** — single shared-services RG, link every VNet, enforce via Azure Policy `Deploy-DNSPE-*`.
6. **For multi-VPC AWS** — choose between cross-account VPC association (small) and Route 53 Profiles (many accounts).
7. **For split-horizon** — separate public + private zones with same name; private wins inside linked VNets.
8. **Plan delegation** — parent owned by platform, sub-zones delegated to teams; IaC-mandatory; no portal edits.
9. **Apply naming convention** — `<service>.<environment>.<team>.contoso.com`.
10. **For DNSSEC** — enable on public zones, add DS at registrar, plan KSK rotation; explicitly note private zones are out of scope.
11. **Wire change control** — every record change via PR; CI plan/apply with diff in PR.
12. **Surface anti-patterns** — manual portal changes, missing `privatelink.*` zones, expecting DNSSEC on private zones, no most-specific-zone awareness for overlapping AWS zones, single-team owning every sub-zone.
13. **Emit** in the output format below.

---

## Output format

Every zone-design answer should emit:

1. **Inputs assumed** — clouds, public/private scope, delegation model, PaaS scope, DNSSEC scope.
2. **Zone inventory table** — name, type (public/private/split-horizon/delegated), cloud, owner, IaC location.
3. **CLI/IaC plan** citing vault — public + private zone create, vnet/vpc links, cross-account association if needed.
4. **PaaS `privatelink.*` centralisation plan** — RG, link list, Azure Policy.
5. **Split-horizon plan** (if applicable) — separate public + private zones with same name; private wins inside VNets.
6. **Delegation plan** — parent + sub-zone owners + NS records.
7. **Naming convention** — explicit pattern.
8. **DNSSEC plan** (public zones only) — enablement + DS submission + KSK rotation cadence.
9. **Change-control workflow** — PR-driven, no portal edits.
10. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
11. **What this excludes** — resolver design (`resolver-design`), troubleshooting (`ntsh/dns-troubleshoot`), migration (`dns/migration`), record audit (`dns/record-audit`).
12. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Manual portal changes to zones.** Loss of audit + drift from IaC. Always PR-driven.
2. **Missing centralised `privatelink.*` zones in Azure.** Each VNet creates its own; private endpoints resolve incorrectly; clients bypass private path.
3. **Expecting DNSSEC to apply to private zones.** Private zones aren't in the public DNS hierarchy; DNSSEC scope is public zones only.
4. **Ignoring the most-specific-zone rule in AWS.** Creating `internal.contoso.com` zone after `api.internal.contoso.com` exists doesn't shadow it — the more specific one still wins.
5. **Cross-account VPC association without authorisation step.** Operation fails; must `create-vpc-association-authorization` in the zone account first.
6. **Auto-registration enabled on multiple VNets for the same Azure Private DNS zone.** Only one VNet per zone can auto-register; others link for resolution only.
7. **Split-horizon without keeping public + private records in sync.** Internal and external answers drift; troubleshooting becomes guesswork.
8. **Delegating a sub-zone but leaving records in the parent.** Stale records in parent shadow the delegated child's authoritative answer.
9. **No naming convention.** Teams pick conflicting names; collisions everywhere.
10. **DNSSEC enabled without DS submission at registrar.** Resolvers return SERVFAIL; entire zone goes dark for validating resolvers.
11. **KSK never rotated.** Long-lived KSKs are a compliance and security finding; document rotation cadence.
12. **No CNAME-at-apex check.** Some providers disallow CNAME at the zone apex; use ALIAS / ANAME / A+AAAA equivalents.

**Analysis only — verify against vendor documentation before applying.**
