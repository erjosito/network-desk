# Skill: Secured Virtual Hub Design (`vwan_skill_secured_vhub_design`)

Design Azure Virtual WAN hubs with integrated firewall inspection — Azure Firewall (Standard / Premium / Basic) or supported partner NVA (PAN, Check Point, Fortinet, Cisco, Versa, ZScaler). Owns the "secured vHub vs. classic hub-spoke + NVA" decision, the routing-intent selection (internet / private / both), the SKU sizing for cloud-native vs. partner NVAs, and the cross-region / DR pattern.

**Routing intent is the heart of the secured vHub.** Get the intent mode right (internet / private / both) and the rest of the design follows; get it wrong and traffic silently bypasses inspection.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the decision tree (secured vHub vs. alternatives), the routing-intent semantics, the SKU-selection methodology (Standard vs. Premium vs. Basic vs. partner NVA), the "minimum rule classes" framing for the firewall policy, the DR pattern, the verification checklist, and the design-review discipline. Exact provisioning commands, sizing tables, KQL queries, and pricing formula live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Secured-Virtual-Hub" })` for the canonical reference architecture, sizing tables, observability KQL, common pitfalls, and verification checklist.
2. Call `cn_vault_page({ page: "VWAN-Routing-Intent" })` for the intent-mode semantics.
3. Load partner-NVA pages if a specific vendor is in play.
4. Cite the vault page when stating SKU throughput, FW pricing inputs, or routing-intent behaviour.

If the user asks about a specific partner NVA in vWAN, fall back to `cn_search({ query: "<vendor> vwan", specialist: "cn_vwan" })`.

---

## When to use secured vHub design

| Scenario | Behaviour |
|---|---|
| "We need centralised inspection across regions" | Run secured-vHub design |
| "Should we use secured vHub or hub-spoke with NVA?" | Run the decision tree (vault page §When to choose) |
| "Which Azure Firewall SKU?" | SKU selection (Standard / Premium / Basic) using the vault's feature/throughput matrix |
| "Can we use Palo Alto / Fortinet / Check Point in vWAN?" | Partner-NVA design |
| "Inspect internet traffic only / private traffic only / both?" | Routing-intent mode selection (vault page §Routing intent) |
| "Force-tunnel some workloads on-prem and inspect others in cloud" | Forced-tunneling sub-workflow |
| Pure vWAN topology (no firewall) | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "vwan-design" })` |
| Routing intent specifics (intent across hubs) | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "routing-intent" })` |
| Branch / VPN / ER gateway design | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "branch-connectivity" })` |
| Detailed firewall rule design | Redirect: `cn_skill({ specialist: "cn_fw", skill: "policy-design" })` |
| Firewall cost estimation | Redirect: `cn_skill({ specialist: "cn_price", skill: "firewall-pricing" })` + `egress-architecture` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical secured-vHub reference architecture, SKU matrix, routing intent integration, observability, pitfalls, verification checklist | [[Secured-Virtual-Hub]] | `cn_vault_page({ page: "Secured-Virtual-Hub" })` |
| Routing intent semantics (internet / private / both modes; cross-hub behaviour) | [[VWAN-Routing-Intent]] | `cn_vault_page({ page: "VWAN-Routing-Intent" })` |
| NVA integration patterns (partner NVAs in vHub vs. spoke) | [[VWAN-NVA-Integration]] | `cn_vault_page({ page: "VWAN-NVA-Integration" })` |
| Branch / gateway specifics (S2S/P2S/ER inside the secured hub) | [[VWAN-Branch-Connectivity]] | `cn_vault_page({ page: "VWAN-Branch-Connectivity" })` |
| Troubleshooting (for verification + drift detection) | [[VWAN-Troubleshooting]] | `cn_vault_page({ page: "VWAN-Troubleshooting" })` |
| Virtual WAN core pattern (transit-hub framing) | [[Hub-and-Spoke]] | `cn_vault_page({ page: "Hub-and-Spoke" })` |

Rows #1 and #2 are mandatory. Row #3 is mandatory when partner NVA is in play.

---

## Required inputs — collect before answering

1. **Regions** — one secured hub per region usually; up to 30 hubs per vWAN.
2. **Workload count / spoke VNets** — drives hub HPU sizing.
3. **Firewall preference** — Azure FW (Standard / Premium / Basic) vs. partner NVA (which vendor).
4. **Inspection scope** — internet only / private only / both. (This is the **routing intent mode** — the most important decision.)
5. **Peak throughput** — Mbps or Gbps; gates SKU choice (Basic caps at 250 Mbps; Standard/Premium ~30 Gbps).
6. **TLS inspection / IDPS / URL filtering needed?** — gates Standard vs. Premium.
7. **Hub address space** — /22 or larger for Azure Firewall secured hubs (/24 only for non-firewall hubs).
8. **Cross-region transit** — hub-to-hub default? Selective via Custom Route Groups?
9. **Forced-tunnel on-prem** — yes / no / selective? Affects routing intent + on-prem advertised prefixes.
10. **Existing spoke peerings** — direct spoke-to-spoke peerings bypass the hub firewall silently; need to audit + remove.

---

## Workflow

1. **Collect inputs** above. Push back on vague "do we need this?" until the user confirms inspection scope.
2. **Load `Secured-Virtual-Hub`** and `VWAN-Routing-Intent`.
3. **Validate the decision** using the vault page's "When to choose" decision tree. If hub-spoke + NVA is the better fit, say so and redirect.
4. **Pick the firewall** — Azure FW SKU (Standard / Premium / Basic) using the SKU matrix on the vault page; if partner NVA, name the vendor + SKU + verify vWAN integration support.
5. **Pick the routing-intent mode** — Internet only / Private only / Both — using §Routing intent. Recommend "Both" as the default for new builds; document any exception.
6. **Size the hub** — address space (/22+ for FW-secured), HPU, connection units. Cite vault page.
7. **Design the rule set** — minimum classes from the vault page (spoke-to-spoke, spoke-to-internet, spoke-to-on-prem, on-prem-to-spoke, default deny). Hand off detailed rule generation to `cn_fw` skills.
8. **Plan forced tunnelling** if applicable (selective prefixes via Custom Route Groups; keep complexity minimal).
9. **Plan DR** — cross-region hub-to-hub peering; per-region FW vs. centralised; policy in Git + CI/CD.
10. **Plan observability** — Azure Firewall logs + vWAN diagnostic logs + daily `az network vhub get-effective-routes` snapshots for drift detection. Cite KQL sample on vault page.
11. **Run the verification checklist** from the vault page (routing-intent mode documented, deny + explicit allow ruleset, no rogue peerings, hub /22+, FW SKU sized, logging on, effective routes baseline, PE strategy, on-prem advertised prefixes filtered, DR plan, rollback).
12. **Emit** in the format below.

---

## Output format

Every secured-vHub design answer should emit:

1. **Inputs assumed** — one line each.
2. **Decision validation** — secured vHub is the right pattern (or it isn't, redirect).
3. **Architecture** — hub region(s), firewall (Azure FW SKU or partner NVA), routing intent mode, hub /22+, connection list.
4. **Routing intent mode + rationale** — internet / private / both, with the rule of thumb cited from the vault.
5. **Sizing** — FW SKU + expected throughput + headroom; HPU + connection units; cite vault page.
6. **Rule-set skeleton** — minimum classes (default deny + 3–5 allow classes); detailed rule generation handed off to `cn_fw`.
7. **DR plan** — hub-to-hub peering, per-region vs. centralised, policy in Git.
8. **Observability** — log categories to enable; daily effective-routes snapshot.
9. **Verification checklist** — short version, pointer to vault page for full list.
10. **What this excludes** — actual FW rule content (handed off to `cn_fw`), branch CPE config, pricing detail (handed off to `cn_price`).
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's "Common pitfalls" section. Always also surface the vault page's pitfalls.

1. **Designing without picking the routing-intent mode.** Without an explicit mode, the hub doesn't steer traffic to the FW; the design is a non-design.
2. **Forgetting rogue direct spoke peerings.** vWAN connections **and** native VNet peerings can both exist; the peering silently bypasses the firewall. Audit + remove unless explicitly intended.
3. **Recommending Basic for production.** Basic FW caps at 250 Mbps and lacks Premium features — it's dev/test-only.
4. **Sizing the FW for average, not peak.** Quote peak + 30% headroom. The vault page's per-SKU throughput is steady-state.
5. **Hub address space /24.** /24 is allowed only for non-firewall hubs; secured hubs need /22 or larger. Surface this early — changing it later means redeploying the hub.
6. **Promising TLS inspection on Standard.** TLS inspection / IDPS / URL filtering are Premium-only. Don't quote them for Standard.
7. **Forgetting Private Endpoint traffic.** PE traffic doesn't transit the FW by default; need PE network policies + explicit routes, or accept that PE is uninspected. Surface the trade-off — most customers want it inspected.
8. **Inheriting rules from a tenant policy without testing.** Hierarchical Firewall Policy is powerful but can deny critical flows from inherited rules; always test in non-prod.
9. **Forgetting policy-in-Git.** Portal-edited rules drift; recommend ARM/Bicep export + Git + CI/CD as part of the design, not as an afterthought.
10. **Treating "intent = both" as automatic east-west allow.** Routing intent steers traffic to the FW; the FW still needs explicit allow rules. Default deny + minimum rule classes are mandatory.

**Analysis only — verify against vendor documentation before applying.**
