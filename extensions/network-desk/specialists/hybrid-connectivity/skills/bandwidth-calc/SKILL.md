# Skill: Bandwidth Calculation and Planning (`hyb_skill_bandwidth_calc`)

Size hybrid-connectivity circuits (ExpressRoute / Direct Connect / Cloud Interconnect / VPN). Owns the sizing methodology — 95th-percentile baseline, growth + utilisation headroom, protocol-overhead allowance, QoS class plan, and the upgrade trigger criteria. The actual measurement CLI snippets, DSCP code-point table, per-cloud DSCP preservation behaviour, and per-cloud pricing tiers live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the sizing-formula reasoning, the headroom defaults (60% target utilisation, 25% growth, 95th-percentile baseline), the QoS class plan, and the upgrade-vs-add-circuit framing. The Azure / AWS / GCP measurement CLI commands, the full DSCP marking table, per-cloud DSCP preservation behaviour, and the per-cloud circuit pricing live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Hybrid-Bandwidth-Planning" })` for measurement CLI / DSCP class table / cloud preservation behaviour / pricing per circuit.
2. Cite the vault page when stating bandwidth metrics, DSCP code points, or circuit pricing.

If pricing detail beyond the vault is needed, redirect: `cn_skill({ specialist: "cn_price", skill: "circuit-pricing" })`.

---

## When to use bandwidth-calc

| Scenario | Behaviour |
|---|---|
| "How big should my ExpressRoute / DX / Interconnect be?" | Sizing workflow — baseline → growth → headroom → tier selection |
| "Should we upgrade the circuit?" | Apply upgrade trigger criteria (95p > 60%, peak > 80%, loss > 0.01%) |
| "Plan QoS for the link" | DSCP class plan from vault table; warn on cross-cloud preservation |
| "Aggregate sites onto a single circuit" | Concurrency-factor sizing |
| Indicative cost figure for a circuit | Quote the vault tier; for full TCO redirect to `cn_skill({ specialist: "cn_price", skill: "circuit-pricing" })` |
| VPN-vs-ExpressRoute economic break-even | Redirect: `cn_skill({ specialist: "cn_price", skill: "vpn-pricing" })` or `circuit-pricing` |
| ExpressRoute SKU / peering topology | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "expressroute-design" })` |
| VPN gateway / IPsec policy selection | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "vpn-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical hybrid bandwidth planning — metrics, formulas, DSCP, cloud preservation, pricing tiers, upgrade triggers | [[Hybrid-Bandwidth-Planning]] | `cn_vault_page({ page: "Hybrid-Bandwidth-Planning" })` |

Mandatory.

---

## Required inputs — collect before answering

1. **Current sustained throughput (95p)** over a representative billing period; if absent, surface the gap and recommend a measurement window first.
2. **Peak throughput** observed.
3. **Growth assumption** — % over the planning horizon (default 25% / 2 yr if unstated).
4. **Target utilisation** — default 60%; lower for latency-sensitive flows.
5. **Workload mix** — sustained data transfer vs. bursty office traffic (drives concurrency factor when aggregating sites).
6. **VPN vs. dedicated circuit** — drives protocol-overhead allowance (~7% for IPsec on standard MTU).
7. **QoS in scope** — voice / video / business-critical / best-effort split.
8. **Cloud(s)** — affects DSCP preservation and tier pricing.

---

## Workflow

1. **Collect inputs** above; if 95p is missing, recommend collecting it first.
2. **Load `Hybrid-Bandwidth-Planning`**.
3. **Apply the sizing formula** — `Required = 95p × (1 + growth) / target_utilisation` from the vault.
4. **Add protocol overhead** for VPN (~7% on 1500-byte MTU; up to ~50% on small packets — surface as a risk for VoIP / DNS / RTP).
5. **Round up to the next vendor tier** from the vault tier table; pick the cheapest tier that fits the 24-month horizon.
6. **Plan QoS** — assign each workload class to a DSCP from the vault table; warn that cross-cloud DSCP preservation varies (Azure preserves on ExR Private Peering; AWS preserves on the DX link but strips at the VPC boundary; GCP doesn't guarantee internal DSCP).
7. **Decide upgrade vs. add a parallel circuit** — for production, prefer adding a diverse circuit (resilience plus capacity); for non-production, upgrade in place.
8. **Quote indicative cost** from the vault tier table; for deal-level pricing redirect to `cn_price` skills.
9. **Emit** in the format below.

---

## Output format

Every bandwidth-calc answer should emit:

1. **Inputs assumed** — one line each, flagging any that the user didn't provide.
2. **Sized circuit tier** — value + formula trace.
3. **Headroom check** — months of headroom at current growth before re-evaluation.
4. **QoS plan** — workload → DSCP class table.
5. **DSCP preservation caveat** — cloud-specific behaviour the customer must know.
6. **Upgrade triggers** — when to re-evaluate.
7. **Indicative monthly cost** + pointer to `cn_price` for deal-level.
8. **What this excludes** — circuit topology / SKU selection / peering design / pricing negotiation.
9. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Sizing from peak instead of 95p.** Peak is too aggressive — circuits are billed and dimensioned at 95p. Use peak only for burst-headroom checks.
2. **Skipping growth headroom.** A circuit sized to current utilisation will be re-procured in 6-12 months. Always apply ≥20% growth for a 2-year horizon.
3. **Sizing a VPN tunnel like a dedicated circuit.** IPsec overhead is ~7% on standard MTU and much worse on small packets — voice / DNS / RTP need explicit small-packet sizing.
4. **Promising DSCP preservation end-to-end on multi-cloud paths.** Different clouds behave differently; surface the caveats from the vault table.
5. **Recommending tier upgrade where resilience is the gap.** Single big circuit doesn't survive a fibre cut. For production, prefer a diverse parallel circuit.
6. **Quoting circuit price without flagging egress.** Circuit fee ≠ total cost. Always note that egress / port-hours / gateway are separate; redirect to `cn_price` for full TCO.
7. **Concurrency factor of 1.0 when aggregating sites.** Office traffic isn't simultaneous; using concurrency 0.3-0.5 avoids over-provisioning. Sustained data-transfer workloads do warrant 0.7-0.9.
8. **Sizing without a measurement window.** Estimating "I think we do about 300 Mbps" is a sign to measure first, then size.
9. **Treating "burstable" tiers as guaranteed.** Burstable circuits price-protect routine peaks, not sustained burst use. Size against the committed rate.

**Pricing is indicative — verify against current vendor pricing pages before budgeting.**

**Analysis only — verify against vendor documentation before applying.**
