# Skill: Firewall Policy Testing (`fw_skill_policy_test`)

Validate firewall policy before promoting to production across all 14 supported platforms. Owns the *test-mode decision tree* (vendor-native simulator → log-driven validation → automated test cases → staged rollout), the *test-before-deploy mandate* (never skip dry-run / test-policy-match), the *automated-test-cases-as-code* discipline (rules-as-code; pytest / Conftest / vendor SDK + golden allow + golden deny suites), the *log-driven-validation in production* loop (compare expected hit counts against actual + alert on divergence), the *common-bug-classes* coverage (shadow rules, missing implicit deny, asymmetric routing breaks, NAT-pre-routing surprises, FQDN-rule TTL flakiness, IPv6-not-considered, geo-block-too-broad, time-based-rule timezone drift), the *pre-deployment checklist* gate, and the *rollback-runbook-with-tested-revert* mandate. Vendor-native simulator CLI per platform, vendor-validation matrix, log-driven queries, automated test-case examples, and the pre-deployment checklist live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *test-mode decision tree*, the *test-before-deploy* mandate, the *rules-as-code + golden suites* discipline, the *log-driven validation loop*, the *common-bug-class coverage* requirement, and the *rollback-runbook-with-tested-revert* mandate. Vendor-native simulator CLI (PAN-OS test-policy-match, FortiGate policy lookup, Azure FW test, AWS NFW test, Junos test policy, ASA packet-tracer, Check Point dbedit / test-policy), vendor-validation matrix, log-driven queries, automated test-case examples, and the pre-deployment checklist live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Firewall-Policy-Testing" })` for the decision tree, vendor-native simulator CLI, vendor-validation matrix, log-driven queries, automated test-case examples, common-bug-class coverage, pre-deployment checklist, and references.
2. For *designing* the policy being tested, redirect to `policy-design`.
3. For *generating* the actual config, redirect to `config-gen`.

If a vendor / tool isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_fw" })`.

---

## When to use policy-test

| Scenario | Behaviour |
|---|---|
| "Test this rule change before deploy" | Vendor-native simulator → cited from vault |
| "Are there shadow rules in our policy?" | Run vendor shadow check + log-driven hit-count zero-or-low report |
| "We need a regression suite for our PAN-OS rule base" | Rules-as-code with golden-allow + golden-deny suites in pytest |
| "Our policy passes dry-run but breaks in prod" | Apply common-bug-classes coverage: NAT order, asymmetric routing, FQDN TTL, IPv6 |
| "How to test stateful rule changes safely" | Staged rollout: detect-only / allow-with-log / enforce; compare before/after hit counts |
| Pre-deployment policy *design* | Redirect: `cn_skill({ specialist: "cn_fw", skill: "policy-design" })` |
| Generating config snippets from a tested design | Redirect: `cn_skill({ specialist: "cn_fw", skill: "config-gen" })` |
| Auditing already-deployed rules | Redirect: `cn_skill({ specialist: "cn_fw", skill: "rule-audit" })` |
| Troubleshooting denied traffic post-deploy | Redirect: `cn_skill({ specialist: "cn_fw", skill: "troubleshoot" })` |
| Log analysis hunting | Redirect: `cn_skill({ specialist: "cn_fw", skill: "log-analysis" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical firewall-policy-testing reference — test-mode decision tree (vendor simulator → log validation → automated tests → staged rollout), vendor-native simulators (PAN-OS test-policy-match, FortiGate policy lookup, Azure FW test, AWS NFW test, Junos test policy, ASA packet-tracer, Check Point), vendor-validation matrix, log-driven validation, rules-as-code with pytest / Conftest, common bug classes (shadow rules, missing implicit deny, asymmetric routing, NAT order, FQDN TTL, IPv6, geo-block, time-based timezone), pre-deployment checklist, references | [[Firewall-Policy-Testing]] | `cn_vault_page({ page: "Firewall-Policy-Testing" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Vendor + version**.
2. **Change scope** — single rule add / rule reorder / rulebase replacement / vendor migration.
3. **Test stage available** — lab / staging / prod-with-detect-mode / prod-with-shadow-log / direct-prod.
4. **Traffic coverage** — synthetic only / real traffic mirror / production sample.
5. **Acceptance criteria** — exact src+dst+service allowed; exact deny set.
6. **IaC stack + test framework** — Terraform/Bicep + pytest/Conftest/vendor SDK.
7. **Rollback budget** — MTTR target if a rule change is wrong.
8. **Compliance constraints** — PCI / SOC2 require evidence of test for change records.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Firewall-Policy-Testing`**.
3. **Apply the decision tree**:
   - Single rule change → vendor-native simulator.
   - Rulebase replacement → simulator + automated golden test suite + staged rollout.
   - Vendor migration → simulator on both sides + golden test suite cross-vendor + staged cutover with parallel-run.
4. **Run vendor-native simulator** from vault — emit the exact CLI for the change.
5. **Build / extend automated test cases** if rulebase replacement or recurring change frequency — golden-allow suite + golden-deny suite + shadow-rule check.
6. **Stage the rollout** — detect-only → allow-with-log → enforce, with hit-count comparison gates.
7. **Run log-driven validation** in production — compare expected hit counts against actuals after 24-48h; alert on divergence.
8. **Cover the common-bug-class checklist** — shadow rules, missing implicit deny, asymmetric routing, NAT pre/post order, FQDN TTL flakiness, IPv6 path, geo-block too broad, time-based timezone drift.
9. **Document rollback** — exact revert commands; tested in lab/staging.
10. **Apply the pre-deployment checklist** from vault as a gate.
11. **For PCI / regulated changes** — capture test evidence (simulator output + test suite pass + staged rollout log) in the change record.
12. **Surface anti-patterns** — direct prod apply, no rollback test, no log-driven post-deploy validation, no IPv6 path, no shadow-rule check.
13. **Emit** in the output format below.

---

## Output format

Every policy-test answer should emit:

1. **Inputs assumed** — vendor + version, change scope, stages available, traffic coverage.
2. **Test plan** — decision-tree branch chosen + rationale.
3. **Vendor simulator command** — exact CLI citing vault.
4. **Automated test-case snippet** if rulebase replacement or migration — golden-allow + golden-deny + shadow check.
5. **Staged rollout plan** — detect / shadow / enforce with hit-count gate per stage.
6. **Log-driven validation queries** — expected vs actual per rule, 24-48h after deploy.
7. **Common-bug-class checklist** — explicit pass/fail per class.
8. **Rollback runbook** — exact commands + last tested date.
9. **Pre-deployment checklist** applied — every item checked.
10. **Evidence package** for change record (if regulated).
11. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
12. **What this excludes** — policy design (`policy-design`), config generation (`config-gen`), audit (`rule-audit`), troubleshooting (`troubleshoot`), log hunting (`log-analysis`).
13. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Direct production apply without simulator dry-run.** Misordered rules silently shadow each other; outage on first traffic.
2. **No rollback runbook + untested revert.** Day-of-incident, rollback is a guess.
3. **No log-driven post-deploy validation.** Bug surfaces hours later; SOC alert is the first signal.
4. **Skipping the shadow-rule check.** A higher-priority allow masks a more-specific deny below.
5. **No IPv6 path test.** IPv6 traffic bypasses the rule that only specified IPv4.
6. **No FQDN TTL test.** Rule using `*.example.com` works in lab; in prod the cloud's FQDN resolver TTL races your traffic.
7. **No NAT-order check.** Source NAT / destination NAT applied before vs after rule evaluation changes behaviour; test both orders.
8. **No asymmetric-routing test.** Stateful firewall sees only one direction of a flow; drops it.
9. **No time-based timezone test.** Rule "deny after 18:00" applies in firewall's TZ, not user's; off-by-hours.
10. **No geo-block test for legitimate users behind VPN / CDN.** Customers' VPN exit nodes get blocked.
11. **No regression suite for repeated change types.** Same bug repeats month after month.
12. **No staged rollout for rulebase replacement.** Big-bang cutover; no rollback option mid-traffic.

**Analysis only — verify against vendor documentation before applying.**
