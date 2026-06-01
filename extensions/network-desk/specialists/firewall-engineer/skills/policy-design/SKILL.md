# Skill: Firewall Policy Design (`fw_skill_policy_design`)

Design enterprise firewall policy architecture across all 14 supported platforms. Owns the *deny-by-default core principle*, the *zone-based design discipline* (every interface in exactly one zone; every rule is a zone-transition allow with explicit src + dst + service; implicit deny at end), the *zone-transition policy matrix template* (rows = source zone, cols = destination zone, cells = what's allowed), the *L3/L4-vs-L7-policy decision* (L3/L4 fast + cheap; L7 only where needed — TLS inspection, content control, user-aware), the *per-rule-logging-mandate*, the *change-control + IaC-mandatory* discipline, the *no-temporary-allow-without-expiry-date* rule, the *no-shadow-rule-by-priority-misorder* check, and the *audit-trail-via-PR-review* requirement. Zone taxonomy library, per-vendor zone-mapping (PAN-OS / FortiGate / Check Point / ASA / SRX / Azure FW / AWS NFW / GCP / open-source), transition matrix template, logging / alerting strategy, and design deliverables checklist live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *deny-by-default* principle, the *zone-based design* discipline, the *transition-matrix-first* workflow, the *L3/L4-vs-L7* decision, the *log-every-rule* mandate, the *IaC-mandatory + PR-driven* change control, the *expiry-date-on-temporary-allows*, and the *no-shadow-rule* check. Zone taxonomy, per-vendor zone-mapping, matrix template, and deliverables list live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Firewall-Policy-Design" })` for core design principles, zone taxonomy library, transition matrix template, L3/L4 vs L7 policy guidance, per-vendor zone mapping, logging + alerting strategy, design deliverables.
2. For *generating* the actual config snippets after design is finalised, redirect to `config-gen`.
3. For *testing* the policy before deploying, redirect to `policy-test`.

If a vendor / pattern isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_fw" })`.

---

## When to use policy-design

| Scenario | Behaviour |
|---|---|
| "Design firewall policy for our new VNet/VPC" | Define zones → fill transition matrix → pick L3/L4 vs L7 per transition → output design doc |
| "We have rules but no zone discipline" | Reverse-engineer zones from existing rules → propose taxonomy → migrate |
| "When should we use L7?" | Apply L3/L4-fast / L7-where-content-matters decision; cite vault |
| "Multi-vendor — same zone taxonomy" | Use canonical taxonomy from vault; per-vendor mapping table |
| "Cloud-native firewall — same approach?" | Yes for the zone+matrix model; vendor-specific naming differs (cite vault) |
| Generating rule snippets from the design | Redirect: `cn_skill({ specialist: "cn_fw", skill: "config-gen" })` |
| Testing the policy pre-deploy | Redirect: `cn_skill({ specialist: "cn_fw", skill: "policy-test" })` |
| Auditing existing rules | Redirect: `cn_skill({ specialist: "cn_fw", skill: "rule-audit" })` |
| Hardening management plane | Redirect: `cn_skill({ specialist: "cn_fw", skill: "hardening-check" })` |
| WAF L7 policy (HTTP/S only) | Redirect: `cn_skill({ specialist: "cn_nsec", skill: "waf-policy-design" })` |
| Pricing comparison across firewall products | Redirect: `cn_skill({ specialist: "cn_price", skill: "firewall-pricing" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical firewall-policy-design reference — core principles (deny-by-default, zone-based, least privilege, log everything, explicit deny last, fail-closed, IaC), zone taxonomy library, transition matrix template, L3/L4 vs L7 guidance, per-vendor zone mapping (PAN-OS / FortiGate / Check Point / ASA / SRX / Azure FW / AWS NFW / GCP / open-source), logging + alerting strategy, design deliverables | [[Firewall-Policy-Design]] | `cn_vault_page({ page: "Firewall-Policy-Design" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Vendor + cloud + scope** — one firewall, pair, hub-spoke, multi-region, multi-cloud.
2. **Workloads + trust zones** in scope — DMZ, internal app tiers, mgmt, shared services, partner, on-prem-via-VPN, internet.
3. **Compliance** — PCI-DSS scope boundary, HIPAA, SOC2.
4. **L7 inspection requirement** — TLS inspection, content / URL filtering, user-aware policy, application identification.
5. **Logging destination + retention** — SIEM, retention period per compliance.
6. **Existing rule base** if any — for reverse-engineering / migration.
7. **IaC stack** — Bicep / Terraform / CloudFormation / Ansible.
8. **Change-control process** — PR-driven, CAB review cadence.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Firewall-Policy-Design`**.
3. **Define zones** from the vault taxonomy (Internet, DMZ, App, Data, Mgmt, Shared, Partner, OnPrem, etc.) — one interface = one zone.
4. **Build the transition matrix** — rows = source zone, cols = destination zone, cells = "deny" (default), "allow + service list", or "L7 inspect + service list".
5. **Decide L3/L4 vs L7 per transition** — L3/L4 for east-west between trusted tiers; L7 (App-ID / URL / TLS inspection) for internet egress, DMZ ingress, partner traffic.
6. **Document service / port / protocol** for every allow cell.
7. **Plan logging per rule** — session for allow, packet for deny — destination SIEM.
8. **Plan alerting** — deny spikes, allow-rule hit-count drops (rule may have become orphan), L7 high-severity threat hits.
9. **Map zones per vendor** from vault — PAN-OS zone, FortiGate interface alias, Check Point zone tag, ASA security level, SRX zone, Azure FW Application/Network/NAT collection, AWS NFW stateful/stateless rule group, GCP target tag, iptables chain.
10. **Plan change control** — IaC repo, PR template, CAB review threshold, emergency-change path with auto-expiry.
11. **Add temporary-allow expiry** — every break-glass rule has a calendar reminder + auto-disable date.
12. **Run the no-shadow-rule check** — rule priorities don't have a higher-priority more-general allow / deny that masks a more-specific rule below.
13. **Output deliverables** from vault: zone diagram, transition matrix, per-rule justification, IaC stub, runbook for adding / changing rules.
14. **Surface anti-patterns** — any/any/allow, missing description, no expiry on break-glass, mgmt rules in data-plane policy, no SIEM logging, shadow rules, mixed zone semantics across vendors.
15. **Emit** in the output format below.

---

## Output format

Every policy-design answer should emit:

1. **Inputs assumed** — vendor, cloud, scope, compliance, L7 requirement.
2. **Zone definitions** — name + interface mapping per vendor.
3. **Transition matrix** — full table or initial subset, cells = deny / allow+service / L7+service.
4. **L3/L4-vs-L7 decision per transition** with rationale.
5. **Per-rule logging + alerting plan.**
6. **Per-vendor zone mapping table** citing vault.
7. **IaC + PR-driven change control** — repo location, PR template, CAB threshold, break-glass path with auto-expiry.
8. **Shadow-rule check** — confirm no higher-priority rule shadows lower-priority specific rules.
9. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
10. **Deliverables** — zone diagram, transition matrix, per-rule justification, IaC stub, runbook.
11. **What this excludes** — config generation (`config-gen`), policy testing (`policy-test`), rule audit (`rule-audit`), hardening (`hardening-check`), WAF (`nsec/waf-policy-design`).
12. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Designing rules without zones.** Rule base becomes a spaghetti list; audits impossible.
2. **Any/any/allow** rules. Defeats the whole policy. Always specific src + dst + service.
3. **No implicit deny at end.** Some platforms default to permit; explicit deny rule required.
4. **L7 inspection on every transition.** Expensive and unnecessary east-west; reserve L7 for ingress / egress / partner.
5. **L3/L4 only for internet egress.** Missing URL / threat / user-aware = blind to content-based exfil / phishing.
6. **No expiry on break-glass rules.** "Temporary" rules become permanent within weeks.
7. **No description on rules.** Within months no one knows why a rule exists; rules age into orphans.
8. **No SIEM ingestion of logs.** Audit + SOC blind.
9. **Shadow rules** — broad allow at priority 100, specific deny at priority 200 — never fires.
10. **Mgmt rules in data-plane policy.** Mgmt-plane access should be in a separate policy / interface.
11. **No IaC + PR review.** Drift between docs and reality; audit nightmare.
12. **Inconsistent zone names across vendors** in a mixed environment. Audits + migrations break.

**Analysis only — verify against vendor documentation before applying.**
