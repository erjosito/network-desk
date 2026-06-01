# Skill: Zero Trust Network Architecture (`nsec_skill_zero_trust_architecture`)

Design the overall Zero Trust networking posture across Azure / AWS / GCP — pillars, identity-aware access, continuous verification, and mapping principles to concrete cloud controls. Owns the *three-principles discipline* (verify explicitly + least privilege + assume breach must ALL be satisfied per design choice), the *seven-pillars framing* (Networking owns one pillar; the others are dependencies), the *maturity progression* (Traditional → Initial → Advanced → Optimal with 12/24/36-month roadmap), and the *PDP/PEP separation* (every protected resource has a named PDP and PEP). Aligns with NIST SP 800-207, CISA Zero Trust Maturity Model v2.0, Microsoft Zero Trust pillars, and DoD Zero Trust Reference Architecture v2.0. The per-cloud PDP/PEP vendor catalogue, principle-to-cloud-control mapping, workload-identity per cloud, threat model coverage matrix, and verification checklist live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *three-principles-all-three-must-hold* gate, the *maturity-roadmap* discipline, the *PDP/PEP-named-for-every-resource* rule, and the *workload-identity-replaces-shared-secrets* mandate. The seven-pillar table (who owns what), the principle-to-cloud-control mapping, per-cloud PDP/PEP vendor catalogue, workload identity per cloud, threat-model coverage, anti-patterns, and verification checklist all live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Zero-Trust-Network-Architecture" })` for the canonical 3-principles, 7-pillars table, reference architecture, principle-to-control map, maturity progression, network-pillar design choices (1-7), workload-identity per cloud, threat-model coverage, anti-patterns, and verification checklist.
2. Cite the vault page when quoting principle mappings, vendor catalogues, or maturity progression milestones.

If a pillar / vendor isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_nsec" })`.

---

## When to use zero-trust-architecture

| Scenario | Behaviour |
|---|---|
| "Design a Zero Trust posture for our cloud estate" | Apply 3-principles → 7-pillars → reference architecture → maturity roadmap |
| "What does Zero Trust mean for networking specifically?" | Walk the network-pillar 7 design choices; redirect to other pillars for dependencies |
| "We bought ZTNA; are we Zero Trust?" | Surface the "ZT ≠ ZTNA tool" anti-pattern; produce gap analysis |
| Maturity assessment | Place current state on Traditional/Initial/Advanced/Optimal; produce 12/24/36-month roadmap |
| PDP/PEP design | Map every protected resource to a named PDP and PEP |
| Microsegmentation specifics | Redirect: `cn_skill({ specialist: "cn_nsec", skill: "segmentation-design" })` |
| ZTNA broker design | Redirect: `cn_skill({ specialist: "cn_sase", skill: "ztna-design" })` |
| Private connectivity to PaaS | Redirect: `cn_skill({ specialist: "cn_pl", skill: "endpoint-design" })` |
| Kubernetes NetworkPolicy / Cilium | Redirect: `cn_skill({ specialist: "cn_cnet", skill: "network-policy" })` |
| DDoS protection | Redirect: `cn_skill({ specialist: "cn_nsec", skill: "ddos-design" })` |
| WAF policy | Redirect: `cn_skill({ specialist: "cn_nsec", skill: "waf-policy-design" })` |
| DNS as security | Redirect: `cn_skill({ specialist: "cn_dns", skill: "resolver-design" })` |
| Firewall policy design | Redirect: `cn_skill({ specialist: "cn_fw", skill: "policy-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical Zero Trust network architecture — three principles, seven pillars + ownership, reference architecture (PDP/PEP/signal sources), principle→cloud-control mapping, maturity progression, 7 network-pillar design choices, workload identity per cloud (Azure MI / IRSA / WIF / SPIFFE), threat-model coverage, common anti-patterns, verification checklist, NIST/CISA/DoD references | [[Zero-Trust-Network-Architecture]] | `cn_vault_page({ page: "Zero-Trust-Network-Architecture" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Current maturity** — flat VPCs + perimeter firewall (Traditional) / some MFA + segments (Initial) / per-app PEP + workload identity (Advanced) / continuous trust evaluation (Optimal).
2. **Cloud(s)** in scope.
3. **Crown-jewel apps** — prioritise these; ZT is a journey, not a switch.
4. **Existing identity-provider** — Entra ID / Okta / AWS IAM Identity Center / GCP Identity. Drives PDP choice.
5. **Existing EDR / MDM** — drives device-posture signal availability.
6. **Existing SIEM / XDR** — required for visibility pillar.
7. **Regulatory / framework target** — NIST 800-207 / CISA ZTMM / DoD ZT RA v2.0 / Microsoft / BeyondCorp.
8. **Roadmap horizon** — 12 / 24 / 36 months.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Zero-Trust-Network-Architecture`**.
3. **State the three principles** and confirm the proposed design satisfies all three (verify explicitly + least privilege + assume breach).
4. **Walk the seven pillars** — identify owner per pillar; networking owns "Networks"; capture the dependencies on Identity / Devices / Workloads / Data / Visibility / Automation.
5. **For Networking pillar specifically** — apply the 7 design choices in order:
   - **(1) Replace site VPN with ZTNA where possible.**
   - **(2) Microsegmentation** — default-deny + identity-keyed allows (ASG / SG-references / service-account-keyed firewall).
   - **(3) Private connectivity to PaaS** — eliminate public endpoints to managed services.
   - **(4) East-west encryption** — mTLS via service mesh; encrypted storage protocols; backbone encryption.
   - **(5) Egress control** — FQDN inspection through cloud-native FW or SSE; Kubernetes egress gateways.
   - **(6) DNS as a security control** — internal resolver + DNS firewall + logging.
   - **(7) Continuous verification** — CAE, AWS Verified Access policy refresh, mesh policy reconciliation.
6. **Map every protected resource** to a named PDP + PEP (reject "we'll figure it out later").
7. **Plan workload identity** to replace at least one previously-shared credential per cycle.
8. **Place current state on maturity progression** + emit 12/24/36-month roadmap.
9. **Pull threat-model coverage** — flag what ZT mitigates and what it doesn't (supply chain partial; insider partial; DDoS out-of-scope → pair with `ddos-design`).
10. **Surface anti-patterns** — Zero-Trust = ZTNA-tool; network-ZT without identity-ZT; PDP single point of failure; encrypt-everything-log-nothing; boil-the-ocean microsegmentation; mobile/unmanaged treated same as managed.
11. **Apply verification checklist** from vault.
12. **Emit** in the output format below.

---

## Output format

Every Zero-Trust answer should emit:

1. **Inputs assumed** — current maturity, cloud(s), crown-jewel apps, IdP / EDR / SIEM stack, framework target.
2. **Three principles applied** — explicitly state which design choices satisfy which principles.
3. **Seven-pillars ownership map** — table per pillar; networking owns Networks; named owners for other pillars.
4. **Reference architecture** — PDP + PEP + signal sources + telemetry destination (mermaid OK; cite vault).
5. **7 network-pillar design choices** with per-cloud control mapping.
6. **PDP/PEP register** — every protected resource → named PDP + PEP.
7. **Workload-identity plan** — which shared secret is being replaced this cycle.
8. **Maturity placement + 12/24/36-month roadmap.**
9. **Threat-model coverage matrix** — ZT mitigates / partial / out-of-scope.
10. **Anti-pattern check** — confirm none of the 6 workflow mistakes below apply.
11. **Verification checklist** — applied per the vault.
12. **What this excludes** — DDoS (`ddos-design`), WAF (`waf-policy-design`), segmentation detail (`segmentation-design`), ZTNA broker (`sase/ztna-design`), private-link (`pl/endpoint-design`), DNS (`dns/resolver-design`).
13. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **"We bought ZTNA — we're Zero Trust."** ZTNA is one PEP among many; the policy work, identity work, telemetry, and other PEPs are still required.
2. **Microsegmentation everywhere at once.** Boil-the-ocean projects fail. Start with one crown-jewel app set; expand quarterly.
3. **PDP single point of failure with fail-open PEPs.** If the PDP is down, fail-open is no defence. Plan PDP HA + a break-glass path that's still audited.
4. **Network ZT without identity ZT.** Segmenting by IP without identity-keyed policy reverts to traditional networking.
5. **Encrypt everything but log nothing.** mTLS without telemetry blinds the SOC; continuous verification needs signals.
6. **Treating unmanaged / mobile devices the same as managed.** Device-posture signal must differentiate in conditional access.
7. **Skipping workload identity.** If app credentials remain shared secrets, "verify explicitly" can't be done at workload layer.
8. **No continuous evaluation.** Authentication ≠ authorization for the full session; without CAE / equivalent, a compromised token lives until expiry.
9. **No egress control through FQDN-aware FW.** Outbound is the primary exfil vector; allowing any:any out makes assume-breach a paper exercise.
10. **DNS resolution from workload subnets to public resolvers.** Loses early-warning signal AND enables DNS-based exfil.
11. **No SIEM/XDR ingestion of network / DNS / L7 / EDR.** Visibility pillar fails; SOC operates blind.
12. **Treating "Zero Trust" as a project with an end date.** It's a discipline; the verification checklist runs forever, not just to ship the roadmap.

**Analysis only — verify against vendor documentation before applying.**
