# Skill: BGP Design for Cloud Hybrid Connectivity (`hyb_skill_bgp_design`)

Architect BGP for hybrid and multi-cloud. Owns the topology decision tree (single-region / multi-region / active-active / active-passive), the route-filtering discipline (default-deny + explicit permits, both directions), and the convergence-tuning posture (BFD where available; BGP timers where not; graceful restart). The ASN allowance ranges, per-cloud prefix limits, the BGP path-selection order, per-cloud gotchas, and Cisco / Juniper / FRR snippets live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the topology decision tree, the route-filter discipline (both directions, prefix + AS-PATH, max-prefix cap), the loop-prevention belt-and-braces list, and the convergence design posture. The ASN tables, per-cloud prefix limits, Cisco / Juniper / FRR examples, attribute-manipulation samples, and per-cloud gotchas live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "BGP-Design" })` for canonical ASN allocation tables, per-cloud prefix limits, attribute examples, multi-circuit failover patterns, convergence tuning, and per-cloud gotchas.
2. Cite the vault page when stating prefix limits, ASN reserved values, BFD parameters, or per-cloud gotchas.
3. For routing-policy syntax (AS-PATH manipulation, community design, MED, default-route injection), pair-load: `cn_vault_page({ page: "BGP-Routing-Policies" })` — those are also exposed through `cn_skill({ specialist: "cn_hyb", skill: "routing-design" })`.

If a vendor / scenario isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_hyb" })`.

---

## When to use bgp-design

| Scenario | Behaviour |
|---|---|
| "Design BGP for our ExpressRoute / DX / Interconnect" | Topology decision tree + route filters + convergence plan |
| "How do I do active-active across two regions?" | Symmetric-design pattern + ECMP + AS-PATH prepend pattern |
| Prefix-limit / ASN allocation question | Quote vault tables; never quote from memory |
| BFD vs. BGP timers — which? | BFD where supported (ExR/DX/Interconnect); BGP `timers 10 30` on VPN |
| AS-PATH manipulation, communities, MED, default-route injection | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "routing-design" })` |
| ExpressRoute peering / SKU choice / Global Reach | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "expressroute-design" })` |
| VPN tunnel / IPsec / IKE policy | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "vpn-design" })` |
| Multi-circuit primary/backup failover behaviour | Redirect: `cn_skill({ specialist: "cn_hyb", skill: "failover-design" })` |
| Virtual WAN routing intent | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "routing-intent" })` |
| Monitoring BGP sessions / prefix counts | Redirect: `cn_skill({ specialist: "cn_nmon", skill: "dashboard-build" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical BGP design — ASN allocation, cloud prefix limits, decision tree, route filters, attribute manipulation, multi-circuit patterns, BFD, gotchas | [[BGP-Design]] | `cn_vault_page({ page: "BGP-Design" })` |
| Routing-policy companion (AS-PATH, communities, MED, default-route, route summarisation) | [[BGP-Routing-Policies]] | `cn_vault_page({ page: "BGP-Routing-Policies" })` |
| Hybrid failover patterns (when BGP design includes primary/backup) | [[Hybrid-Failover-Design]] | `cn_vault_page({ page: "Hybrid-Failover-Design" })` |

Row #1 is mandatory.

---

## Required inputs — collect before answering

1. **Cloud(s)** in scope — Azure / AWS / GCP / multi.
2. **Circuit types** — ExpressRoute / Direct Connect / Cloud Interconnect / VPN / mix.
3. **Number of regions and sites** — drives single-region vs. multi-region pattern.
4. **Active-active vs. active-passive** intent.
5. **CE vendor(s)** — Cisco / Juniper / Arista / FRR / MikroTik (affects snippet style).
6. **Filter intent** — what should be advertised to cloud, what accepted from cloud.
7. **Convergence target** — sub-second (BFD-eligible circuits) or 30-90 s (VPN tunnels).
8. **Loop / leak risk tolerance** — drives belt-and-braces depth.

---

## Workflow

1. **Collect inputs** above.
2. **Load `BGP-Design`** (and `BGP-Routing-Policies` if attribute manipulation is in scope).
3. **Pick the topology** from the decision tree — single-region primary/backup, multi-region active-passive, or multi-region active-active.
4. **Allocate ASNs** — single private ASN per organisation reused per CE *or* unique private ASN per site (recommended for AS-PATH-based steering). Never use reserved ASNs (AS 65515 for Azure, AS 7224 for AWS DX, AS 16550 for GCP Partner Interconnect).
5. **Plan prefix counts** against the per-cloud limits in the vault — keep ≥25% safety margin; aggregate where possible.
6. **Design filters both directions** — `permit` only the prefixes you intend; `deny` rest; mirror with AS-PATH ACL; cap with `maximum-prefix … restart` for every neighbour.
7. **Plan attribute manipulation** — Local-Pref for inbound (egress from your AS), AS-PATH prepend for cloud-side path selection, MED only when proven needed. Detailed syntax: `routing-design` skill.
8. **Plan convergence** — BFD on ExR/DX/Interconnect; BGP `timers 10 30` on VPN tunnels; Graceful Restart on both sides.
9. **Belt-and-braces against leaks** — own-ASN AS-PATH filter inbound, community-based hairpin filter, maximum-prefix limit, no transit between two cloud circuits unless designed.
10. **Surface per-cloud gotchas** — Azure ExR no transit by default (need Global Reach or NVA); AWS DX BGP MD5 mandatory on private VIFs; GCP Cloud Router Custom Mode for explicit advertisements.
11. **Emit** in the format below.

---

## Output format

Every bgp-design answer should emit:

1. **Inputs assumed** — one line each.
2. **Topology choice** — single/multi-region, A-A or A-P + rationale.
3. **ASN plan** — customer side per site, plus what to expect from cloud side.
4. **Prefix-count plan** — # advertised, # accepted, against vault limit per cloud + safety margin.
5. **Filter plan** — directions, prefix-list + AS-PATH + max-prefix cap settings.
6. **Attribute manipulation plan** — Local-Pref / AS-PATH prepend / community tags + pointer to `routing-design` for syntax.
7. **Convergence plan** — BFD on which circuits + BGP timers on which tunnels + GR posture.
8. **Per-cloud gotchas** that apply to this design.
9. **Verification checklist** — pointer to the vault page checklist.
10. **What this excludes** — circuit SKU choice (expressroute-design), VPN policy (vpn-design), monitoring dashboards (cn_nmon).
11. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Filtering only outbound.** Many leaks come *from* the cloud side (re-advertised internet routes, accidental defaults). Always filter both directions.
2. **No max-prefix cap.** A misconfigured CE can dump 800k internet routes at the cloud gateway, killing the session. Always set `maximum-prefix … restart`.
3. **Using AS 65515 / 7224 / 16550 on the CE.** Those are reserved by the clouds (Azure / AWS DX / GCP Partner Interconnect). Will conflict.
4. **AS-PATH prepend ≥4x.** Diminishing returns + risk of provider filtering. Three is the practical cap.
5. **Active-active design without ECMP + symmetric attributes.** Asymmetric flows + stateful firewalls = dropped packets. Local-Pref / MED / AS-PATH must match.
6. **Assuming two ExR circuits transit each other by default.** They don't. Need ExR Global Reach or a customer NVA between them.
7. **Default route advertised to cloud "to test forced tunnelling".** This forces *all* internet egress through your DC — surprise outage at scale. Only do this when explicitly intended.
8. **BGP timers below 5/15.** Looks like fast failover, behaves like a flap detector. Sub-second goals belong on BFD, not timer tightening.
9. **Forgetting BGP MD5 on AWS DX private VIFs.** It's mandatory. The session won't come up otherwise.
10. **Not tagging routes with communities.** Without communities, downstream policy depends on prefix matching — fragile when the prefix list grows.
11. **No monitoring on prefix-count vs. cap.** Silent approach to a limit, then session drops at 100%. Alert at 80% and 95%.

**Analysis only — verify against vendor documentation before applying.**
