# Skill: Failover and Redundancy Design (`hyb_failover-design`)

Design high-availability hybrid connectivity with automatic failover, fast convergence, and tested recovery procedures. Owns the convergence-time methodology, the BGP attribute conventions for primary/secondary path selection, the BFD-timer trade-off framing, and the testing protocol. The exact per-cloud CLI for setting connection weight, active-active gateways, and BFD timers lives in the vault.

**Without BFD and without BGP, failover is ~90 seconds.** Most operational outage tickets come from "failover took too long" — design BFD + BGP into the topology, don't bolt them on later.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the convergence-time table (what's achievable with vs. without BFD), the testing protocol (pre-test prep, scenarios, post-test validation), the BGP attribute conventions (LP / weight / MED) that span all three clouds, and the "what failure modes did we forget?" review discipline. Per-cloud commands, exact BFD timer values, and active-active gateway specifics live in the vault.

Mandatory steps every time you use this skill:

1. Identify the cloud(s), circuit / VPN topology, and the user's target RTO.
2. Call `cn_vault_page({ page: "Hybrid-Failover-Design" })` for the canonical convergence table + CLI.
3. Call `cn_vault_page({ page: "BGP-Design" })` for BGP attribute manipulation specifics.
4. Cite the vault page when stating CLI, convergence numbers, or BFD timer recommendations.

If the user asks about a failover pattern not in the vault page (e.g. SD-WAN-driven failover, specific NVA HA), fall back to `cn_search({ query: "<keywords>", specialist: "cn_hyb" })`.

---

## When to use failover design

| Scenario | Behaviour |
|---|---|
| "Make our ExpressRoute / DX / Interconnect redundant" | Run dual-circuit pattern |
| "We have one circuit — what's the cheapest reasonable backup?" | Recommend circuit + VPN backup pattern |
| "Target RTO is < 10 seconds" | Pair BFD + BGP, document timer trade-offs |
| "Failover is taking 90+ seconds" | Diagnose: BFD on/off, BGP scan interval, route table size |
| "How do we test failover safely?" | Run testing-protocol workflow |
| Question is about the active circuit design (not failover) | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "expressroute-design" })` |
| Question is about BGP attribute design generally | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "bgp-design" })` |
| Question is about VPN-only HA (no dedicated circuit) | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "vpn-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical failover patterns — dual circuits, VPN backup, active-active gateways, BFD, convergence table, testing | [[Hybrid-Failover-Design]] | `cn_vault_page({ page: "Hybrid-Failover-Design" })` |
| BGP attribute design (LP / MED / weight / AS path) — required for any primary/secondary topology | [[BGP-Design]] | `cn_vault_page({ page: "BGP-Design" })` |
| Azure ExpressRoute service detail (gateway SKU + weight semantics) | [[ExpressRoute]] | `cn_vault_page({ page: "ExpressRoute" })` |
| AWS Direct Connect service detail (DXGW path preference) | [[Direct-Connect]] | `cn_vault_page({ page: "Direct-Connect" })` |
| GCP Cloud Interconnect service detail (recommended HA topology) | [[Cloud-Interconnect]] | `cn_vault_page({ page: "Cloud-Interconnect" })` |
| Troubleshooting (used for "failover is broken" diagnostics) | [[Hybrid-Connectivity-Troubleshooting]] | `cn_vault_page({ page: "Hybrid-Connectivity-Troubleshooting" })` |

Rows #1 and #2 are mandatory for almost every answer. Per-cloud service pages are conditional on the user's cloud(s).

---

## Required inputs — collect before answering

1. **Cloud(s)**.
2. **Current topology** — single circuit / dual circuit (same or different PoPs) / circuit + VPN backup / VPN only.
3. **Target RTO** — < 10s (requires BFD + BGP), < 90s (BGP hold timer is fine), < 5min (loose acceptable).
4. **Failure modes to cover** — single circuit, peering-location, provider, VPN gateway, region, on-prem CE router?
5. **BGP attribute strategy** — local preference vs. weight vs. MED — and whether on-prem device supports each.
6. **BFD support** — both ends must support it; ask before designing aggressive timers.
7. **Test window availability** — required to validate the design; if no window exists, recommend deferring.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Hybrid-Failover-Design`** + `BGP-Design`.
3. **Pick the redundancy pattern** matching the user's circuit + budget:
   - Dual circuits, same provider, diverse PoPs (highest cost, highest availability)
   - Dual circuits, diverse providers (highest cost + complexity; protects against provider outage)
   - Single circuit + VPN backup (most common; encryption + cheap, but VPN bandwidth ceiling on failover)
   - Active-active VPN (Azure / GCP HA VPN) — preferred for VPN-only HA
4. **Plan BGP attributes** — LP 200 primary, LP 100 backup on-prem; corresponding weight/MED on the cloud side. Cite `BGP-Design` for the attribute semantics.
5. **Plan BFD** — recommend 300ms/3x as production-standard from the vault page's BFD table; warn against < 100ms on cloud peering.
6. **Compute expected convergence time** from the vault page's table (with BFD vs. without). Surface the number — users care about RTO numbers, not feature lists.
7. **Plan the failover test** — pre-test state capture, scenario list (shut interface / clear BGP / cloud-side disable), post-test validation. Use the vault's testing-procedures section.
8. **Emit** in the format below.

---

## Output format

Every failover-design answer should emit:

1. **Inputs assumed** — one line each.
2. **Redundancy pattern chosen** — name + justification (matches RTO + failure modes).
3. **Primary / backup path attributes** — BGP LP, weight, MED — for both sides — cited from `BGP-Design`.
4. **BFD configuration** — TX / RX / multiplier; expected detection time — cited from `Hybrid-Failover-Design`.
5. **Expected convergence time** — bold number (e.g. "**3–8 seconds** with BFD, ~95 seconds without"). Cited from vault.
6. **Throughput on backup path** — explicit statement of capacity loss when failing over (e.g. "VPN gateway caps at 1.25 Gbps vs. 10 Gbps ER — expect application degradation during outage").
7. **Test plan** — pre-test capture, 3 scenarios with expected outcome, post-test validation.
8. **Provisioning commands** — pointer to vault page section, not inline duplication.
9. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are workflow anti-patterns specific to this skill — not a substitute for the vault page's pitfall list.

1. **Designing without BGP.** Static-route failover requires manual intervention or polling — fails the RTO target every time. BGP is mandatory for any auto-failover design.
2. **Designing without BFD.** Without BFD, failover is 90+ seconds (BGP hold timer). If the user has an aggressive RTO, BFD on both ends is not optional.
3. **Recommending sub-100ms BFD on cloud peering.** Cloud edge routers may not support or may flap. The vault page's recommendation (300ms / 3x = 900ms) is the prod-standard floor.
4. **Forgetting throughput drop on failover.** A 10 Gbps ER → 1.25 Gbps VPN backup is an 8× capacity loss; the app will suffer. Call this out so the user can size the VPN backup appropriately (or accept degradation).
5. **Skipping the test plan.** A failover design that has never been tested has a near-100% probability of failing in production. Always include the test scenarios.
6. **Mixing LP and weight without explaining.** Cisco's "weight" is router-local and not propagated; LP is iBGP-propagated. Recommending both without explaining the precedence (weight > LP) confuses operators.
7. **Treating "Direct Connect prefers over VPN" as automatic everywhere.** AWS does prefer DX by default via AS-path, but Transit Gateway path selection requires explicit route-table preference — cite `Direct-Connect` for the TGW case.
8. **Forgetting application-layer session state.** Failover may break long-lived TCP/TLS sessions, NAT-tracked flows, and stateful firewall sessions. Call this out so the app team plans for retries.

**Analysis only — verify against vendor documentation before applying.**
