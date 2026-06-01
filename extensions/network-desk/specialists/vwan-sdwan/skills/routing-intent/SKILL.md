# Skill: Routing Intent & Routing Policies (`vwan_skill_routing_intent`)

Design Azure Virtual WAN routing intent (declarative steering of internet + private traffic through Azure Firewall or NVA in the secured hub). Owns the policy-selection methodology (internet-only / private-only / both / neither), the multi-hub double-inspection trade-off, and the migration discipline (existing custom route tables → routing intent). Per-cloud CLI (`az network vhub routing-intent` create/show/update/delete), exact `internetSecurity` flag behaviour, and the per-spoke route-injection model live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the policy decision (when to enable internet, private, or both), the multi-hub double-inspection caveat, the firewall-capacity sizing reminder, and the route-validation discipline (always export effective routes before + after enabling intent). The CLI examples, route-injection model, exact `internetSecurity` flag mechanics, and `PrivateTraffic` destination semantics live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "VWAN-Routing-Intent" })` for canonical CLI / route-injection / `internetSecurity` mechanics / `PrivateTraffic` destination semantics / pitfalls.
2. Cite the vault page when stating CLI flags, default-route propagation behaviour, or per-cloud limits.

If a scenario / NVA vendor isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_vwan" })`.

---

## When to use routing-intent

| Scenario | Behaviour |
|---|---|
| "Steer internet egress through Azure Firewall in the secured hub" | Enable Internet Traffic Policy with the firewall as next hop |
| "Inspect spoke-to-spoke / branch-to-spoke / hybrid private traffic" | Enable Private Traffic Policy |
| "Zero-trust at the vWAN hub" | Enable both policies; warn on firewall capacity + cost |
| "Why isn't 0.0.0.0/0 reaching my spoke?" | Check `internetSecurity=true` on the connection |
| Multi-hub design — should inspect twice? | Surface double-inspection latency + cost; consider custom route tables for inter-hub flows |
| Migrating from custom route tables + static routes | Migration window + effective-routes validation discipline |
| Custom route tables / static UDR / inter-hub direct flows | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "vwan-design" })` |
| NVA-in-hub selection or sizing | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "vwan-design" })` |
| Secured hub design + firewall policy in vWAN context | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "secured-vhub-design" })` |
| Effective-routes / connection-state troubleshooting | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "troubleshoot" })` |
| Branch connectivity / VPN site config | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "branch-connectivity" })` |
| Firewall capacity / SKU choice | Redirect: `cn_skill({ specialist: "cn_fw", skill: "config-gen" })` and `cn_skill({ specialist: "cn_ncap", skill: "gateway-sizing" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical routing-intent — policy types, route injection, `internetSecurity` flag, `PrivateTraffic` semantics, inter-hub double inspection, CLI, pitfalls | [[VWAN-Routing-Intent]] | `cn_vault_page({ page: "VWAN-Routing-Intent" })` |
| Virtual WAN topology (paired when designing the surrounding hub) | [[Virtual-WAN]] | `cn_vault_page({ page: "Virtual-WAN" })` |
| Troubleshooting (paired when validating effective routes before/after) | [[VWAN-Troubleshooting]] | `cn_vault_page({ page: "VWAN-Troubleshooting" })` |

Row #1 is mandatory.

---

## Required inputs — collect before answering

1. **Policy intent** — internet-only / private-only / both / neither + zero-trust posture.
2. **Next-hop choice** — Azure Firewall (recommend default) or supported NVA.
3. **Number of hubs** — single or multi; if multi, accept double-inspection or not.
4. **Existing static / custom route tables** — will be overridden by intent; migration window needed.
5. **Non-RFC1918 private address space** — CGNAT, partner, public-owned private-use; validate that effective routes still steer correctly.
6. **Hybrid path** — ExpressRoute / VPN; consistent prefix advertisement from on-prem to avoid asymmetric flows.
7. **Firewall capacity** — sustained + peak; sized to absorb all east-west + north-south.

---

## Workflow

1. **Collect inputs** above.
2. **Load `VWAN-Routing-Intent`**.
3. **Pick the policy** — internet-only is uncommon; private-only when internet egress is local at spokes; both for zero-trust.
4. **Validate firewall capacity** — combined throughput of spoke-to-spoke + branch-to-spoke + internet must fit (≤30 Gbps Azure Firewall Premium). If not, redirect to `cn_ncap` for sizing.
5. **Plan migration** — before enabling, export effective routes with `az network vhub get-effective-routes`; remove conflicting static routes; pick a maintenance window.
6. **Verify `internetSecurity=true`** on every spoke that needs the default route; surface the per-spoke opt-out pattern when some spokes should keep local internet egress.
7. **For non-RFC1918 private address space** — explicitly validate effective routes; do not assume RFC1918-only steering.
8. **For multi-hub** — surface the double-inspection cost (latency + Azure Firewall data-processed charges) and offer the custom-route-table alternative for inter-hub inspection.
9. **For ExpressRoute coexistence** — ensure on-prem advertises consistent prefixes; warn on more-specific on-prem routes bypassing intent.
10. **Plan post-cutover validation** — re-export effective routes, check firewall logs for the expected flows, run synthetic spoke-to-spoke probes.
11. **Emit** in the format below.

---

## Output format

Every routing-intent answer should emit:

1. **Inputs assumed** — one line each.
2. **Policy choice** — internet / private / both + rationale.
3. **Next-hop** — Azure Firewall or NVA + resource ID pattern.
4. **`internetSecurity` plan** — per-spoke; flag opt-outs.
5. **Firewall capacity check** — required vs. SKU max; redirect to `cn_ncap` if undersized.
6. **Migration plan** — maintenance window + pre-cutover route export + static-route removal + post-cutover validation.
7. **Multi-hub stance** — single hub or accept double inspection / use custom route tables for inter-hub.
8. **Non-RFC1918 validation step** if applicable.
9. **CLI pointer** — the exact `az network vhub routing-intent create/update` snippet from the vault.
10. **What this excludes** — firewall rule design / NVA vendor selection / VPN site config / spoke peering.
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Enabling intent on a hub with custom static routes still present.** Intent overrides; the static routes are removed/ignored, often silently breaking traffic paths. Always export + remove first.
2. **Forgetting `internetSecurity=true`.** Spokes silently keep their original internet path; the firewall log doesn't show the flow and you assume "everything is going through the firewall". Validate per-spoke.
3. **Sizing the firewall for pre-intent throughput.** After intent, the firewall sees *all* east-west + north-south. Re-size against the new combined load.
4. **Promising RFC1918-only steering.** `PrivateTraffic` is "connected and learned private destinations", not a hard-coded RFC1918 trio. CGNAT / partner / public-owned private-use must be validated against effective routes.
5. **Multi-hub design with intent on both hubs and no double-inspection awareness.** Traffic between hubs is inspected twice → latency + cost spike. Surface the trade-off and offer the custom-route-table inter-hub alternative.
6. **Mixing next-hop types within a single policy.** Internet and Private must use the same next-hop resource type. Use one NVA that handles both, or chain via BGP.
7. **Skipping post-cutover validation.** Effective routes look right via CLI, but a missing firewall rule silently drops east-west. Pair CLI validation with synthetic probes + firewall log inspection.
8. **Asymmetric returns on ExpressRoute.** When on-prem advertises more specific prefixes than the hub's policy-generated private routes, return traffic bypasses the firewall. Standardise prefix lengths.
9. **No rollback plan.** Intent is a single resource — but the routing change ripples to every spoke. Keep the pre-cutover effective-routes export so you can compare on rollback.

**Analysis only — verify against vendor documentation before applying.**
