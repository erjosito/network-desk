# Skill: Firewall Pricing (`price_skill_firewall_pricing`)

Compare firewall pricing across cloud-native services (Azure Firewall Basic/Standard/Premium, AWS Network Firewall, GCP Cloud Armor, GCP Cloud NGFW) and third-party NVAs (Palo Alto VM-Series, FortiGate, Check Point CloudGuard). Owns the cloud-native-vs-NVA cross-over decision at ~5 TB/month throughput, the SKU-feature-vs-need gate, and the BYOL-vs-PAYG break-even. The full per-SKU price tables, per-AZ multi-deployment math, throughput-tier comparison matrix, and CLI for checking SKU + metrics all live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *decision logic* (low traffic → cloud-native; high traffic → NVA; advanced L7 → Premium SKU or NVA; multi-cloud consistency → NVA) and the BYOL-vs-PAYG horizon rule. All per-SKU rates, per-AZ deployment math, throughput-tier matrix, and CLI for checking SKU/metrics live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Firewall-Pricing" })` for the canonical per-SKU rates (Azure FW Basic/Standard/Premium, AWS Network Firewall per-AZ, GCP Cloud Armor / Cloud NGFW), NVA pricing (PAN VM-Series, FortiGate, Check Point), throughput-tier comparison matrix (100 GB → 10 TB), and SKU-feature comparison.
2. Cite the vault page when quoting $/hr, $/GB, or $/month numbers.
3. For firewall *policy / config design*, redirect to `firewall-engineer`.

If a vendor isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_price" })`.

---

## When to use firewall-pricing

| Scenario | Behaviour |
|---|---|
| "Compare Azure Firewall SKUs" | Load vault; surface Basic/Standard/Premium with feature gating |
| "Cloud-native vs NVA at our scale" | Apply 5-TB/month cross-over rule + throughput-tier matrix |
| "Should we go Premium for IDPS?" | Feature-need gate; if no advanced L7 need → Standard |
| "AWS Network Firewall 3-AZ cost" | Per-AZ multiplier from vault |
| "GCP Cloud Armor or Cloud NGFW?" | Cloud Armor is WAF/DDoS, not full firewall; Cloud NGFW for L7 inspection — disambiguate, then price |
| "BYOL vs PAYG for FortiGate" | Break-even ~3-yr; BYOL wins for sustained 24×7 |
| Firewall policy / rule design | Redirect: `cn_skill({ specialist: "cn_fw", skill: "policy-design" })` |
| Firewall HA topology design | Redirect: `cn_skill({ specialist: "cn_fw", skill: "ha-design" })` |
| Firewall hardening checklist | Redirect: `cn_skill({ specialist: "cn_fw", skill: "hardening-check" })` |
| WAF policy specifically | Redirect: `cn_skill({ specialist: "cn_nsec", skill: "waf-policy-design" })` |
| Total network cost optimisation | Redirect: `cn_skill({ specialist: "cn_price", skill: "cost-optimizer" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical firewall pricing — Azure FW Basic/Standard/Premium SKU table + feature matrix + Firewall Manager / Secured Hub costs + CLI; AWS Network Firewall per-AZ pricing + CLI; GCP Cloud Armor / Cloud NGFW pricing; NVA pricing (PAN VM-Series, FortiGate, Check Point) PAYG vs BYOL; throughput-tier comparison matrix (100 GB → 10 TB); cloud-native vs NVA decision framework | [[Firewall-Pricing]] | `cn_vault_page({ page: "Firewall-Pricing" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Cloud(s)** in scope.
2. **Expected monthly data processed (GB or TB)** — drives the cloud-native-vs-NVA cross-over.
3. **Feature needs** — L3/L4 only? FQDN filtering? IDPS / TLS inspection? URL filtering / web categories?
4. **HA / multi-AZ requirement** — for AWS NFW, multiplies per-endpoint cost by AZ count.
5. **Operational model** — managed PaaS preferred vs willingness to patch/upgrade NVA.
6. **Multi-cloud consistency** — is the same policy plane needed across clouds? (drives NVA).
7. **Commitment horizon** — for BYOL break-even.
8. **Compliance / certification** — sometimes mandates specific vendor (e.g., FedRAMP-approved NVA).

---

## Workflow

1. **Collect inputs** above.
2. **Load `Firewall-Pricing`**.
3. **Disambiguate GCP early** — Cloud Armor is WAF/DDoS in front of LB; Cloud NGFW is L7 inspection inline. Don't confuse them.
4. **Apply the SKU-feature gate** — if user needs IDPS / TLS inspection / URL filtering → Azure FW Premium or NVA (Standard / Basic cannot meet).
5. **Apply the cloud-native-vs-NVA cross-over** — at ~5 TB/month, NVA flat cost ≈ cloud-native (fixed + per-GB). Below 5 TB → cloud-native wins; above → NVA wins.
6. **For AWS NFW** — multiply endpoint cost by AZ count (3 AZs is typical HA → $864/month just endpoints).
7. **For NVA** — break PAYG vs BYOL: BYOL typically 30-50% cheaper over 3 yrs; PAYG better for dev/test/PoC/burst.
8. **For Azure FW Basic** — flag the limit: only for small dev/test workloads with light traffic; lacks Standard's threat-intel deny.
9. **Produce 3-column comparison** — chosen cloud-native vs chosen NVA vs (if applicable) Azure FW Basic. Use throughput-tier matrix from vault.
10. **Surface anti-patterns** — Premium SKU for L3/L4 only; NVA at sub-1-TB scale; ignoring multi-AZ multiplier on AWS NFW; comparing list price without commit discount.
11. **Emit** in the output format below.

---

## Output format

Every firewall-pricing answer should emit:

1. **Inputs assumed** — cloud, expected throughput, feature needs, HA model.
2. **Required SKU tier (justification)** — feature-need-gate output.
3. **3-column comparison table** — cloud-native SKU vs NVA vs (optional) Azure FW Basic; columns: $/month fixed, $/GB, total at user's throughput, features included.
4. **Cross-over note** — at what throughput does the recommended option change.
5. **BYOL vs PAYG note** (if NVA) — break-even horizon for the user's commitment.
6. **Cited rates** — vault page reference + last-verified date if available.
7. **Anti-pattern check** — confirm none of the workflow mistakes below apply.
8. **What this excludes** — policy design (`cn_fw/policy-design`), HA topology (`cn_fw/ha-design`), egress redesign (`cn_price/egress-architecture`).
9. **Footer** — `Pricing is indicative — verify against current vendor pricing pages before budgeting.` then `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Recommending Azure FW Premium when only L3/L4 is needed.** Premium costs +40% over Standard for IDPS/TLS that won't be used.
2. **Recommending Azure FW Basic for prod.** Throughput-capped; lacks Standard's threat-intel deny; only suitable for small dev/test.
3. **Pricing AWS Network Firewall as a single endpoint.** Production deployments are 3-AZ → $864/month just for endpoints before any data.
4. **Confusing GCP Cloud Armor with a full network firewall.** Cloud Armor is WAF/DDoS in front of an LB. For inline inspection, recommend Cloud NGFW (Palo Alto-powered) or NVA.
5. **Recommending NVA at < 1 TB/month.** Cloud-native flat + per-GB is cheaper below the cross-over. Don't burden ops with NVA upgrades for marginal saving.
6. **Recommending cloud-native at 10+ TB/month** without showing that NVA flat cost wins.
7. **Quoting PAYG NVA pricing for a sustained 24×7 production load.** BYOL is 30-50% cheaper over 3 yrs.
8. **Ignoring Secured Virtual Hub price** when comparing vWAN with built-in Azure Firewall (additional $182.50/month per hub).
9. **Comparing list price** when the customer has EA / MAP / EDP discount — flag the % off.
10. **Conflating data-processing $/GB with egress $/GB.** They're separate meters; both apply.
11. **Forgetting to factor multi-vendor policy management overhead** — picking different vendors per cloud kills the "multi-cloud consistency" advantage.
12. **Pricing without an HA model.** Single-AZ FW in prod is a one-AZ outage from total inspection loss; always price the HA topology.

**Pricing is indicative — verify against current vendor pricing pages before budgeting.**
**Analysis only — verify against vendor documentation before applying.**
