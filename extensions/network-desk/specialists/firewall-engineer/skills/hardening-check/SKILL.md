# Skill: Firewall Hardening Check (`fw_skill_hardening_check`)

Audit and harden firewall management-plane + data-plane configuration across all 14 supported platforms. Owns the *separate-management-and-data-plane* mandate (mgmt access must not traverse the protected network), the *mandatory-mgmt-access-controls* (MFA, RBAC, allow-listed source IPs, no default credentials, no default ports), the *encrypted-protocols-only* rule (TLS / SSH / IKEv2 — never Telnet / SNMPv1/v2c / clear HTTP), the *least-privilege-RBAC* mandate (no global admin for daily ops), the *audit-log-to-immutable-store* mandate (separate SIEM, retention per compliance), the *signature-up-to-date-with-auto-update* rule (IDS/IPS / threat / URL DB), the *implicit-deny-at-end + no-any/any/allow* policy hygiene, and the *factory-reset-defaults-changed* baseline check (default community strings, default admin, default certificate). Per-vendor hardening specifics, CIS / NIST / vendor benchmark IDs, and the checklist output format live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *mgmt-vs-data-plane-separation*, the *MFA-+-RBAC-+-source-IP-restriction* on mgmt access, the *encrypted-protocols-only* rule, the *least-privilege-RBAC* mandate, the *immutable-audit-log* mandate, the *auto-update-signatures* rule, the *no-any/any/allow* + *implicit-deny-at-end* hygiene, and the *factory-defaults-changed* baseline. Per-vendor hardening checklists, CIS / NIST mappings, and the audit-report output template live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Firewall-Hardening" })` for universal hardening items (management plane + data plane) + per-vendor hardening specifics + checklist output format.
2. For ongoing audit of rules in production (hit counts, unused, shadowed), redirect to `rule-audit`.
3. For policy *design* (zone taxonomy, transition matrix), redirect to `policy-design`.

If a vendor / control isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_fw" })`.

---

## When to use hardening-check

| Scenario | Behaviour |
|---|---|
| "Audit our firewall against CIS / NIST" | Apply universal + per-vendor checklist from vault → score → remediation plan |
| "Production firewall mgmt accessible from any IP" | Universal: mgmt-source-IP-restriction missing |
| "We still use SNMPv2c" | Universal: encrypted-protocols-only — replace with SNMPv3 |
| "What's the minimum hardening for a new PAN-OS deployment?" | Apply universal + PAN-OS specifics from vault |
| "Audit cloud-native firewall (Azure FW / AWS NFW / GCP Cloud FW)" | Different scope — service-managed; focus on RBAC + diagnostic settings + policy hygiene |
| Rule-set audit (orphans, shadows, hit counts) | Redirect: `cn_skill({ specialist: "cn_fw", skill: "rule-audit" })` |
| Generate hardened config from scratch | Redirect: `cn_skill({ specialist: "cn_fw", skill: "config-gen" })` |
| Policy design (zones, transition matrix) | Redirect: `cn_skill({ specialist: "cn_fw", skill: "policy-design" })` |
| HA hardening specifics (HA1/HA2, fence, preempt) | Redirect: `cn_skill({ specialist: "cn_fw", skill: "ha-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical firewall-hardening reference — universal hardening items (management plane: MFA, RBAC, source IP restriction, no default credentials, encrypted protocols, audit logging; data plane: deny-by-default, no-any/any/allow, implicit-deny-at-end, signature auto-update, zone hygiene), per-vendor hardening specifics (PAN-OS, FortiGate, Check Point, Cisco ASA, SRX, Azure FW, AWS NFW, GCP Cloud FW, Sophos, OPNsense, pfSense, VyOS, iptables, Zscaler), checklist output format | [[Firewall-Hardening]] | `cn_vault_page({ page: "Firewall-Hardening" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Vendor + version**.
2. **Deployment model** — cloud-native managed / NVA in cloud / on-prem appliance.
3. **Mgmt access channel** — direct IP / jumphost / PAM / cloud portal / API.
4. **Compliance target** — CIS / NIST 800-53 / PCI-DSS / ISO 27001 / SOC2.
5. **Existing IdP** for SSO + MFA (Entra ID / Okta / AWS IAM IdC / GCP IAM).
6. **Existing SIEM** for audit-log destination.
7. **Operational team scope** — who needs admin vs read-only vs operator.
8. **Existing baseline** — has this firewall ever been hardened before? Output is delta if so, full checklist if not.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Firewall-Hardening`**.
3. **Apply the universal mgmt-plane checklist**:
   - MFA on every admin account
   - RBAC with least privilege (no daily-driver global admin)
   - Source-IP restriction on mgmt interface (jumphost / PAM CIDR)
   - No default credentials / no default community / no default cert
   - Encrypted protocols only (TLS 1.2+, SSH, SNMPv3, IKEv2)
   - Audit log to immutable SIEM with retention per compliance
   - Mgmt interface NOT in data-plane subnet
4. **Apply the universal data-plane checklist**:
   - Deny-by-default + implicit deny at end
   - No any/any/allow rules
   - All rules have descriptions
   - Logging enabled on all rules
   - IDS/IPS + URL + threat DB auto-update enabled
   - Signature subscription valid + not expired
   - Zone hygiene (no rule spans more zones than required)
5. **Apply per-vendor specifics** from vault (PAN-OS panorama posture, FortiGate `set strong-crypto enable`, Check Point Identity Awareness, ASA fixup, etc.).
6. **Score per CIS / NIST control mapping** from vault.
7. **Produce remediation plan** — fix critical (mgmt-plane exposure, default creds) first, then high (no MFA / no audit log), then medium (data-plane hygiene), then low (cosmetic).
8. **For cloud-native firewalls** — scope shifts: RBAC on policy / diagnostic settings / firewall policy versioning / no-any-allow / log destination.
9. **Surface anti-patterns** — mgmt accessible from data plane, no MFA, default credentials, SNMPv2c, expired threat DB, audit log to same firewall's local store, daily ops with global admin, no break-glass account.
10. **Plan re-audit cadence** — at least quarterly + after every major version upgrade.
11. **Emit** in the output format below.

---

## Output format

Every hardening-check answer should emit:

1. **Inputs assumed** — vendor + version, deployment model, compliance target.
2. **Universal mgmt-plane checklist** — pass / fail per item with remediation command if fail.
3. **Universal data-plane checklist** — pass / fail per item with remediation.
4. **Per-vendor specifics checklist** — citing vault.
5. **Cloud-native scope adjustments** if Azure FW / AWS NFW / GCP Cloud FW.
6. **Compliance mapping** — CIS / NIST control IDs covered.
7. **Risk-ranked remediation plan** — critical / high / medium / low.
8. **Re-audit cadence + ownership.**
9. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
10. **What this excludes** — rule-set audit (`rule-audit`), policy design (`policy-design`), HA design (`ha-design`), troubleshooting (`troubleshoot`).
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Mgmt interface in a data-plane subnet.** Internet-facing or lateral attacker reaches mgmt = total compromise.
2. **No MFA on admin accounts.** Phished password = full compromise.
3. **Daily-driver admin = global admin.** Mistake or compromise has blast radius of everything.
4. **No source-IP restriction on mgmt.** Mgmt API reachable from anywhere = ransomware in.
5. **Default credentials / default community strings / default cert.** Trivial to exploit.
6. **SNMPv1/v2c, Telnet, clear HTTP enabled.** Credentials in cleartext on the wire.
7. **Audit log local-only.** Attacker wipes it after compromise; SOC blind.
8. **Audit log not in immutable SIEM** with WORM retention.
9. **Expired signature subscription.** IDS / URL / threat DB stops updating; new attacks miss.
10. **No break-glass account** stored in PAM. MFA service outage locks ops out of firewall.
11. **No periodic re-audit.** Hardening drifts within months.
12. **Recommending hardening for Azure FW / AWS NFW / GCP Cloud FW using NVA checklist.** Wrong scope — service-managed; check RBAC + diagnostic settings + policy hygiene instead.

**Analysis only — verify against vendor documentation before applying.**
