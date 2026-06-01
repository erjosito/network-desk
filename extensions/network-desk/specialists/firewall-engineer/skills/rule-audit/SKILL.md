# Skill: Firewall Rule Audit (`fw_skill_rule_audit`)

Audit deployed firewall rule sets across all 14 supported platforms to surface security risk, operational debt, and compliance gaps. Owns the *audit-categories framework* (overly permissive rules, unused rules, shadowed rules, duplicate rules, no-logging rules, no-description rules, expired/temporary-without-expiry rules, any-service rules, broad-source rules, broad-destination rules), the *hit-count-driven prioritisation* (rule with 0 hits in 90d = orphan candidate; rule with millions of hits = re-evaluate for IDS impact), the *risk-summary template* (Critical / High / Medium / Low + impact + remediation), the *audit-cadence mandate* (at least quarterly + on major change + before compliance attestation), the *export-as-structured-data discipline* (JSON / CSV from the firewall API for diff-able + scriptable audits), and the *follow-the-PR-trail mandate* (every remediation goes through the same IaC + PR workflow, never portal). Per-vendor rule export + hit-count retrieval commands, audit-category checklists, risk summary template, and the procedure live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *audit-categories framework*, the *hit-count-driven prioritisation*, the *risk-summary template*, the *audit-cadence* mandate, the *export-as-structured-data* discipline, and the *PR-driven remediation* rule. Per-vendor rule export commands (PAN-OS API + show-running-config-security, FortiGate REST + diagnose firewall iprope, Check Point cpquery + mgmt_cli, ASA show access-list, SRX get-firewall-policies, Azure FW Resource Graph + diagnostic logs, AWS NFW list-rule-groups + log queries, GCP firewall-rules describe + insights, iptables/nftables list + counters), hit-count retrieval CLI, audit-category checklists, risk summary template, and the procedure live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Firewall-Rule-Audit" })` for audit categories, per-vendor rule export and hit-count CLI, audit output format, risk summary template, and procedure.
2. For deeper log-driven analysis (top denied, geo anomalies, port scans), redirect to `log-analysis`.
3. For *hardening* the firewall mgmt + data plane (not the rules themselves), redirect to `hardening-check`.

If a vendor isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_fw" })`.

---

## When to use rule-audit

| Scenario | Behaviour |
|---|---|
| "Quarterly firewall audit for compliance" | Apply categories + per-vendor export + hit-count + risk-rank + remediation plan |
| "Find unused rules in our PAN-OS" | Export rules + hit counts; rules with 0 hits in N days = orphan candidates |
| "Are any rules shadowed?" | Vendor analyser (PAN-OS expedition / Check Point SmartOptimize / FortiGate policy lookup) + manual cross-check |
| "We have rules with any/any source — find them" | Run the broad-source audit category from vault |
| "Reduce rule count before vendor migration" | Audit + dedupe + consolidate; ties to `vendor-migrate` |
| Hardening mgmt-plane (MFA / source IP / encrypted protocols) | Redirect: `cn_skill({ specialist: "cn_fw", skill: "hardening-check" })` |
| Log hunting (anomalies, top talkers, brute-force) | Redirect: `cn_skill({ specialist: "cn_fw", skill: "log-analysis" })` |
| Generating fixed rule snippets from audit findings | Redirect: `cn_skill({ specialist: "cn_fw", skill: "config-gen" })` |
| Testing the cleaned-up rule base | Redirect: `cn_skill({ specialist: "cn_fw", skill: "policy-test" })` |
| Migrating to another vendor after cleanup | Redirect: `cn_skill({ specialist: "cn_fw", skill: "vendor-migrate" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical firewall rule-audit reference — audit categories (overly permissive, unused, shadowed, duplicate, no-logging, no-description, expired, any-service, broad-source, broad-destination), per-vendor rule export + hit-count retrieval (PAN-OS, FortiGate, Check Point, ASA, SRX, Azure FW, AWS NFW, GCP, iptables/nftables, Sophos, OPNsense, pfSense, VyOS, Zscaler), output format, risk summary template, procedure | [[Firewall-Rule-Audit]] | `cn_vault_page({ page: "Firewall-Rule-Audit" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Vendor + version**.
2. **Scope** — single firewall / pair / panorama / multi-cloud / multi-vendor.
3. **Audit window** — 30 / 60 / 90 days for hit counts.
4. **Compliance trigger** — PCI / SOC2 / ISO / quarterly / pre-migration.
5. **Output format expected** — markdown report / CSV / JSON / dashboard.
6. **Existing PR + IaC workflow** for remediation.
7. **Tolerance for false positives** — 0-hit rule might be a low-frequency-but-needed rule (DR failover, quarterly batch).
8. **Stakeholders** — security, network ops, app teams; per-app-team review of "their" rules before deletion.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Firewall-Rule-Audit`**.
3. **Export rules** as structured data from vault — JSON or CSV per vendor; one row per rule with name, src, dst, service, action, hit count, last hit, log, description, owner, ticket.
4. **Run each audit category** from vault:
   - Overly permissive (any/any/allow)
   - Unused (0 hits in audit window)
   - Shadowed (higher-priority allow masks lower-priority specific rule)
   - Duplicate (identical except in name)
   - No-logging
   - No-description
   - Expired (date in description or tag passed)
   - Broad-source (`/0` or wildly large CIDR)
   - Broad-destination
   - Any-service (no port restriction)
5. **Risk-rank findings** — Critical (any/any/allow + no log + no description) / High (broad-source + no log) / Medium (no log OR no description) / Low (duplicate).
6. **For unused rules** — confirm with rule owner (app team) before recommending deletion; flag rules with seasonality (DR failover, quarterly batch) to NOT delete based on 90-day window.
7. **For shadowed rules** — propose reorder + delete shadowed; never just delete (the design intent might require the specific rule).
8. **Produce remediation plan** — IaC + PR with the change, NOT portal edits.
9. **Document evidence** for compliance — exported rule set + audit categories run + risk ranking + remediation plan = audit deliverable.
10. **Plan next audit cycle** — at least quarterly + after major change + before compliance attestation.
11. **Surface anti-patterns** — deleting 0-hit rules without owner confirmation, portal remediation, no evidence kept for compliance, audit window <30 days.
12. **Emit** in the output format below.

---

## Output format

Every rule-audit answer should emit:

1. **Inputs assumed** — vendor, scope, audit window, compliance trigger.
2. **Export commands** citing vault per vendor.
3. **Per-category findings** — overly permissive / unused / shadowed / duplicate / no-log / no-desc / expired / broad-src / broad-dst / any-service, with rule names + counts.
4. **Risk-ranked list** — Critical / High / Medium / Low with impact + recommended remediation per rule.
5. **Owner-confirmation list** — rules pending app-team review before deletion.
6. **Remediation plan** — PR-driven IaC changes, not portal edits.
7. **Evidence package** for compliance — exported ruleset + categorisation + risk-rank.
8. **Next audit date.**
9. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
10. **What this excludes** — hardening (`hardening-check`), log hunting (`log-analysis`), policy design (`policy-design`), config gen for remediation (`config-gen`), policy testing (`policy-test`).
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Deleting 0-hit rules without owner confirmation.** That rule may be DR failover / quarterly batch / seasonality.
2. **Audit window < 30 days.** Misses weekly / monthly traffic patterns; false-positive orphans.
3. **Portal remediation instead of PR.** Drift between IaC and reality; next audit shows the same finding plus new ones.
4. **No evidence kept** for compliance. Auditor asks "show me your last audit" → "I deleted it" → finding.
5. **Audit-by-screenshot.** Not diff-able, not scriptable, not repeatable. Always structured export.
6. **No app-team review of "their" rules** before deletion. Production outage when DR fails over.
7. **Shadowed rule deleted without reorder.** Original design intent lost.
8. **Treating broad-source / `/0` as automatic Critical** without considering legitimate cases (CDN edges, partner subnets). Risk-rank with context.
9. **No audit cadence.** Rules accumulate debt indefinitely; one-off audit is meaningless.
10. **No cross-vendor consistency** for organisations with mixed vendors. Different categories applied = inconsistent risk picture.
11. **Auditing rules but not hit-count metadata.** Hit counts are the operational signal; without them only structural findings.
12. **No correlation with `log-analysis`** for highest-hit and lowest-hit rules. Audit findings without log context are surface-level.

**Analysis only — verify against vendor documentation before applying.**
