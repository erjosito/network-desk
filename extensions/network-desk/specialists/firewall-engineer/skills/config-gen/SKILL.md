# Skill: Firewall Configuration Generation (`fw_skill_config_gen`)

Generate vendor-specific firewall configuration snippets from a high-level policy intent, across all 14 supported platforms (Azure Firewall, AWS Network Firewall, GCP Cloud Firewall, PAN-OS, FortiGate, Check Point, Cisco ASA, Juniper SRX, Zscaler ZIA, Sophos XG/XGS, OPNsense, pfSense, VyOS, iptables/nftables). Owns the *intent-to-config translation discipline* — always **named objects** (never inline IPs), always **comments / descriptions**, always **logging** (session for allow, packet for deny), always **rollback commands** alongside add commands, always **dry-run / test-policy-match** before apply, always **atomic commit with auto-rollback timer** where supported (Junos / VyOS / PAN-OS). Per-vendor templates for the canonical "DMZ web → DB MySQL TCP/3306" policy intent live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *named-objects-not-IPs* rule, the *log-always* rule (allow=session, deny=packet), the *include-rollback-commands* rule, the *dry-run-before-apply* rule, the *atomic-commit-with-confirm* preference on vendors that support it, and the *input-checklist-before-generating* discipline. Per-vendor templates (Bicep / CloudFormation / gcloud / PAN-OS set / FortiOS / mgmt_cli / ASA / SRX / ZIA / Sophos / OPNsense REST / pfSense / VyOS / iptables / nftables) live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Firewall-Config-Generation" })` for input requirements + per-vendor configuration templates for all 14 platforms + best-practices.
2. For policy *design* (zones, transition matrix, L3/L4 vs L7) before generating config, redirect to `policy-design`.
3. For *testing* the generated config before deploy, redirect to `policy-test`.

If a vendor isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_fw" })`.

---

## When to use config-gen

| Scenario | Behaviour |
|---|---|
| "Generate the Azure Firewall rule for DMZ → DB on 3306" | Collect inputs → cite Bicep + CLI from vault → emit + rollback + log |
| "Translate this PAN-OS rule to FortiGate" | Cite both templates from vault; flag named-object name preservation |
| "I need iptables / nftables for east-west DMZ → DB" | Cite vault templates; flag chain ordering + default-drop |
| "OPNsense REST call for this rule" | Cite vault; include alias creation + apply step |
| Designing the *policy* (zone taxonomy, transition matrix) before config | Redirect: `cn_skill({ specialist: "cn_fw", skill: "policy-design" })` |
| Testing generated rules before deploy | Redirect: `cn_skill({ specialist: "cn_fw", skill: "policy-test" })` |
| Hardening the firewall management plane | Redirect: `cn_skill({ specialist: "cn_fw", skill: "hardening-check" })` |
| Migrating from one vendor to another | Redirect: `cn_skill({ specialist: "cn_fw", skill: "vendor-migrate" })` |
| Auditing existing rules / hit counts | Redirect: `cn_skill({ specialist: "cn_fw", skill: "rule-audit" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical config-generation reference — input requirements, 14 per-vendor templates (Azure FW Bicep+CLI, AWS NFW CFN+CLI, GCP gcloud, PAN-OS set, FortiOS, mgmt_cli, ASA, SRX, ZIA, Sophos, OPNsense REST, pfSense, VyOS, iptables, nftables), best practices | [[Firewall-Config-Generation]] | `cn_vault_page({ page: "Firewall-Config-Generation" })` |

Mandatory.

---

## Required inputs — collect before generating

1. **Source zone** + **source address** (named object preferred, IP/CIDR/FQDN otherwise).
2. **Destination zone** + **destination address**.
3. **Service / port** (protocol + port range).
4. **Action** (allow / deny / drop / reject).
5. **Logging** preference (session for allow, packet for deny, none).
6. **Description** (human-readable rule purpose).
7. **Target vendor + version** (vendor-specific syntax varies by major version, especially VyOS 1.3 vs 1.4/1.5, PAN-OS 10 vs 11, FortiOS 6 vs 7).
8. **Insertion point** — top / bottom / specific priority.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Firewall-Config-Generation`**.
3. **Apply named-object discipline** — never inline IPs in rules; define address and service objects first.
4. **Emit the config snippet** from vault for the target vendor + version.
5. **Emit the rollback command** alongside the add command.
6. **Enable logging** explicitly per vendor (session for allow, packet for deny).
7. **Include the dry-run / test-policy-match** command for the vendor — Azure Firewall test, PAN-OS test-policy-match, FortiGate policy lookup, AWS NFW test, Juniper test policy, ASA packet-tracer, OPNsense apply with rollback timer.
8. **Use commit/confirm + auto-rollback timer** where supported (Junos `commit confirmed 10`, PAN-OS `commit-confirmed`, VyOS `commit confirm 10`).
9. **For Zscaler ZIA** — recommend ZIA Admin Portal or current API docs over copy-pasted brittle endpoints (ZIA fields evolve frequently); flag ZIA is internet-bound, not east-west — recommend ZPA / local FW for DMZ→DB.
10. **For multi-vendor environments** — keep object names IDENTICAL across vendors so audits/migrations are deterministic.
11. **Surface anti-patterns** — inline IPs, no description, no logging, no rollback command, applying without dry-run, no commit-confirm on supported vendors.
12. **Emit** in the output format below.

---

## Output format

Every config-gen answer should emit:

1. **Inputs assumed** — vendor + version, src/dst zones + addresses, service, action, logging, insertion point.
2. **Object definitions** — address objects + service objects, named consistently.
3. **Rule snippet** — the actual config citing vault for the vendor.
4. **Rollback snippet** — delete/remove commands for the same rule.
5. **Validation command** — vendor-specific dry-run / test-policy-match / packet-tracer.
6. **Commit strategy** — commit-confirm with auto-rollback timer if supported.
7. **Logging confirmation** — session for allow, packet for deny enabled in snippet.
8. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
9. **What this excludes** — policy design (`policy-design`), policy testing pre-deploy (`policy-test`), hardening (`hardening-check`).
10. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Inline IPs / CIDRs in rules.** Future audit + change becomes a regex-replace nightmare. Always named objects.
2. **No description / comment.** SOC can't tell why a rule exists; rules age into orphans.
3. **No logging.** Hit-count audit (`rule-audit`) and SOC hunting both fail.
4. **Allow rules without session logging.** Lose flow visibility for any allowed traffic.
5. **Deny rules without packet logging.** Lose attack-pattern visibility.
6. **No rollback command.** Day-of-incident, rollback is a guess.
7. **Apply without dry-run / test-policy-match.** Misordered rules silently shadow each other.
8. **No commit-confirm with auto-rollback timer** on vendors that support it. Locked out of management plane = truck roll.
9. **Vendor-version mismatch** — VyOS 1.3 `set firewall name` vs 1.4/1.5 `set firewall ipv4 name`; confirm the target version before generating.
10. **Inconsistent object names across vendors** in mixed environments. Audits / migrations explode in complexity.
11. **Recommending Zscaler ZIA for east-west DMZ → DB.** ZIA is internet-bound; use ZPA / local FW for east-west.
12. **No "any/any" guard.** Forgetting that the implicit-deny-at-end depends on the platform — some default to allow.

**Analysis only — verify against vendor documentation before applying.**
