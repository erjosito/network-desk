# Skill: BGP Routing Policies (`hyb_skill_routing_design`)

Design BGP routing *policies* for hybrid cloud — AS-PATH manipulation, prefix filtering, BGP communities, Local-Preference, MED, BFD, route summarisation, and default-route injection (forced tunnelling). Pairs with `bgp-design` (which owns topology). Owns the policy-by-intent methodology: what to filter, what to summarise, when to use communities vs. attribute manipulation, and the forced-tunnelling decision. The Cisco / Juniper / FRR syntax samples, cloud-specific community values, and per-cloud BFD parameter tables live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the policy-by-intent reasoning, the summarisation discipline (always advertise the smallest viable set to cloud), the community-naming convention (`AS:purpose`), and the forced-tunnelling trade-off framing. The actual prepend / prefix-list / community / BFD / aggregate-address syntax lives in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "BGP-Routing-Policies" })` for canonical AS-PATH, prefix-list, community, Local-Pref, MED, BFD, summarisation, default-route syntax + per-cloud community tables.
2. Cite the vault page when stating community values, BFD parameter defaults, prefix-limit numbers, or BGP path-selection order.
3. For topology / multi-circuit failover decisions, pair-load: `cn_vault_page({ page: "BGP-Design" })` — also exposed via `cn_skill({ specialist: "cn_hyb", skill: "bgp-design" })`.

---

## When to use routing-design

| Scenario | Behaviour |
|---|---|
| "Make ExR primary, VPN backup" | Local-Pref pattern (vault page) + matching cloud-side weight |
| "Influence inbound traffic from cloud" | AS-PATH prepend on the backup advertisement |
| "Use BGP communities for region steering" | Community-based Local-Pref pattern + AS:purpose naming |
| "Summarise our routes to stay under cloud limits" | Aggregate-address + summary-only |
| "Implement forced tunnelling" | Default-route advertisement + scalability/latency warning |
| "Lower failover time to sub-second" | BFD parameters; warn it isn't available on VPN |
| MED — should I set it? | Only when proven needed; many providers ignore it |
| Topology — single vs. multi-region, A-A vs. A-P, prefix-limit planning | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "bgp-design" })` |
| Multi-circuit failover behaviour / RTO calculation | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "failover-design" })` |
| ExpressRoute peering choice / Global Reach | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "expressroute-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical routing-policy reference — AS-PATH, prefix filters, communities, Local-Pref, MED, BFD, summarisation, default-route | [[BGP-Routing-Policies]] | `cn_vault_page({ page: "BGP-Routing-Policies" })` |
| BGP design (topology + filters + convergence — paired) | [[BGP-Design]] | `cn_vault_page({ page: "BGP-Design" })` |

Row #1 is mandatory. Row #2 is mandatory when topology or filter direction is in scope.

---

## Required inputs — collect before answering

1. **Desired path selection** — which circuit is primary, which is backup, per region.
2. **Direction of influence** — inbound (cloud → on-prem) needs AS-PATH prepend / MED; outbound (on-prem → cloud) needs Local-Pref / weight.
3. **CE vendor** — drives syntax flavour.
4. **Cloud community usage** — is the customer already tagging routes? Does the cloud honour customer-set communities?
5. **Forced tunnelling intent** — yes/no/partial; split-tunnel exceptions (Microsoft 365, SaaS).
6. **Convergence target** — sub-second (BFD) or 30-90 s (BGP timers).
7. **Prefix counts** — to decide if summarisation is required against cloud limits.

---

## Workflow

1. **Collect inputs** above.
2. **Load `BGP-Routing-Policies`** (and `BGP-Design` if topology is also in scope).
3. **Express intent as attribute table** — for each pair (prefix, direction), assign Local-Pref / AS-PATH prepend / community / MED with rationale.
4. **Write filters** — prefix-list + AS-PATH ACL both directions; cite vault page snippets.
5. **Decide community scheme** — `AS:purpose`; reuse the buckets in the vault page (`:100` prod, `:200` non-prod, `:300` DMZ, `:999` blackhole).
6. **Plan summarisation** — `aggregate-address … summary-only`; ensure totals stay below cloud per-session limits with ≥25% margin.
7. **Decide forced tunnelling** — only with split-tunnel exceptions for Microsoft 365 / SaaS; surface latency + bottleneck cost.
8. **Configure BFD** — on ExR / DX / Interconnect with `interval 300 min_rx 300 multiplier 3` per the vault; never on VPN tunnels (use `timers 10 30` instead).
9. **Verify path symmetry** — for stateful firewalls, ensure forward and return take the same circuit; mismatched Local-Pref vs. MED is the usual cause.
10. **Emit** in the format below.

---

## Output format

Every routing-design answer should emit:

1. **Inputs assumed** — one line each.
2. **Intent table** — per (prefix, direction), the attributes set + rationale.
3. **Filter list** — what's allowed in/out per neighbour.
4. **Community plan** — values + their semantic meaning.
5. **Summarisation plan** — aggregates vs. specifics; expected advertised count vs. cloud limit.
6. **Default-route decision** — if forced tunnelling, the split-tunnel exception list.
7. **Convergence plan** — BFD where, timers where, GR.
8. **Verification** — traceroute symmetry check + per-cloud monitoring (vault page).
9. **What this excludes** — topology design / circuit type selection / VPN crypto policy.
10. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Setting Local-Pref on the cloud side.** Local-Pref is *inside* your AS only — it does nothing once the route is announced to the cloud. To influence cloud-side path, use AS-PATH prepend (on outbound) or community (if cloud honours it).
2. **Advertising every /24 to the cloud.** Cloud accepts limited prefixes per BGP session (AWS DX private VIF = 100). Summarise; reserve specifics for failover signalling.
3. **`summary-only` on the only path.** If the aggregate fails, traffic to specifics is lost. Use `summary-only` per circuit, not globally.
4. **Setting MED across different ASes by default.** Many ASes ignore MED unless `bgp always-compare-med` is set; the BGP tiebreaker order goes Local-Pref → AS-PATH → Origin → MED, so MED rarely wins.
5. **Forced tunnelling without split-tunnel exceptions.** Microsoft 365 / SaaS go through the DC, adding 100+ ms and saturating the DC egress. Always plan exceptions.
6. **BFD on VPN tunnels.** Most cloud VPN endpoints don't support BFD on the tunnel. Use BGP timers `10 30` instead.
7. **Skipping `maximum-prefix … restart`.** Without it, a leak storm burns the CE control plane.
8. **Communities with no documentation.** Six months later nobody remembers what `65001:42` means. Document the scheme in the runbook.
9. **Asymmetric Local-Pref on A-A circuits.** Forward path picks circuit A, return path picks circuit B → stateful firewall drops the response. Mirror attributes.
10. **Treating "BGP up" as "service working".** BGP can be up while the underlying tunnel drops traffic. Pair with synthetic monitoring (`cn_nmon`).

**Analysis only — verify against vendor documentation before applying.**
