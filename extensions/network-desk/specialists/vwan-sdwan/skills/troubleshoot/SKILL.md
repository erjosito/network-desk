# Skill: Virtual WAN Troubleshooting & Diagnostics (`vwan_skill_troubleshoot`)

Structured troubleshooting for Azure Virtual WAN — effective-route inspection, connection-state verification, routing-intent conflicts, BGP diagnostics, and resolutions for the five most common failure modes (spoke-to-spoke, internet breakout, ExR propagation, VPN tunnel, NVA traffic). Owns the *triage methodology* (always start with `az network vhub get-effective-routes`; layer in Network Watcher only after route plane is verified). The CLI snippets, per-failure decision tree, and full diagnostic-tool inventory live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the "effective routes first, always" triage discipline, the five-issue decision tree (spoke↔spoke / internet breakout / ExR propagation / VPN tunnel / NVA traffic), and the "BGP up ≠ traffic flowing" reminder. The exact `az network vhub get-effective-routes` / `bgpconnection list-learned-routes` / Network Watcher `test-ip-flow` CLI / per-issue resolution steps live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "VWAN-Troubleshooting" })` for canonical CLI + per-issue decision tree.
2. Cite the vault page when quoting CLI flags, BGP session-state values, or VPN connection-status semantics.
3. For routing-intent failure paths specifically, pair: `cn_vault_page({ page: "VWAN-Routing-Intent" })`.

If a failure mode isn't in the vault, fall back to `cn_search({ query: "<keywords>", specialist: "cn_vwan" })`.

---

## When to use troubleshoot

| Scenario | Behaviour |
|---|---|
| "Spoke A can't reach spoke B" | Issue 1 decision tree from vault |
| "Internet breakout broken after enabling routing intent" | Issue 2 — check `internetSecurity` + 0.0.0.0/0 in effective routes + firewall rule |
| "On-prem prefixes not visible in spoke route tables" | Issue 3 — ExR circuit state + private peering + filters |
| "VPN tunnel stuck in NotConnected / Connecting" | Issue 4 — PSK + IKE proposals + BGP ASN + branch firewall |
| "NVA in hub isn't getting traffic" | Issue 5 — routing-intent next-hop + BGP peering state + NVA health |
| Network Watcher IP Flow Verify / Next Hop / Connection Monitor | Quote vault Network Watcher inventory |
| "Why is BGP up but traffic still failing?" | Pair effective-routes export with synthetic probe |
| Designing a vWAN hub (NOT troubleshooting an existing one) | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "vwan-design" })` |
| Branch / VPN site design (NOT debugging) | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "branch-connectivity" })` |
| Routing-intent design / migration | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "routing-intent" })` |
| Secured hub firewall policy design | Redirect: `cn_skill({ specialist: "cn_vwan", skill: "secured-vhub-design" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical vWAN troubleshooting — effective-route CLI, connection state, routing-intent conflicts, BGP diagnostics, 5-issue decision tree, Network Watcher inventory | [[VWAN-Troubleshooting]] | `cn_vault_page({ page: "VWAN-Troubleshooting" })` |
| Routing intent (paired for intent-related failures) | [[VWAN-Routing-Intent]] | `cn_vault_page({ page: "VWAN-Routing-Intent" })` |
| Virtual WAN (paired for topology questions surfaced during triage) | [[Virtual-WAN]] | `cn_vault_page({ page: "Virtual-WAN" })` |

Row #1 is mandatory.

---

## Required inputs — collect before answering

1. **Reported symptom** — exact wording (helps map to one of the 5 issues).
2. **Affected resource(s)** — which spoke / branch / hub / connection.
3. **Recent changes** — routing intent toggled? new connection? firewall rule update? NVA upgrade?
4. **Effective-routes export available?** — if not, that's step 1.
5. **Connection provisioning states** — already known or to be checked?
6. **BGP / VPN tunnel state** if known.
7. **Time window** — when did it last work? aligns with change history.
8. **Authorisation** — operator must have Network Contributor / Reader to run the CLI.

---

## Workflow

1. **Collect inputs** above.
2. **Load `VWAN-Troubleshooting`** (and `VWAN-Routing-Intent` if intent changes are in play).
3. **Always start with effective routes** — `az network vhub get-effective-routes` on the affected hub or specific connection. This is non-negotiable; it eliminates half the failure space immediately.
4. **Verify connection state** — `Succeeded` provisioning state on the connection; non-`Idle/Active` BGP session; `Connected` VPN status. Most issues surface here.
5. **Map symptom → issue** using the 5-issue decision tree from the vault page.
6. **For each candidate root cause, run the resolution step** — never skip the validation CLI; "looks right" is not a verified state.
7. **If BGP is up but traffic still fails** — run Network Watcher `test-ip-flow` to validate NSG decisions; run Connection Monitor for end-to-end probe + latency.
8. **For NVA issues** — separately verify the NVA's own health (IP forwarding, interface state, BGP session) in addition to the vWAN-side BGP connection.
9. **Emit** the diagnosis + the exact remediation CLI/portal action + how to verify the fix.
10. **Recommend ongoing monitoring** for the failure mode — Connection Monitor for connectivity, Azure Monitor metrics for VPN gateway throughput, Azure Firewall logs for east-west drops.

---

## Output format

Every troubleshoot answer should emit:

1. **Diagnosis summary** — one line; which of the 5 issues this matches.
2. **What I'd check first** — the effective-routes / connection-state CLI sequence.
3. **Likely root cause** — narrowed list, ordered by probability.
4. **Resolution steps** — the exact CLI / portal action + the verification step that confirms the fix.
5. **Why this won't recur** — the monitoring or policy guard to put in place.
6. **CLI snippets** — quote the vault page; don't invent flags.
7. **Pointer to design skills** if the fix surfaces a design gap.
8. **What this excludes** — design (vwan-design), policy (routing-intent), branch config (branch-connectivity).
9. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Skipping `az network vhub get-effective-routes`.** It is the single most useful diagnostic. Without it you're guessing.
2. **Trusting "BGP up" as proof traffic flows.** BGP can be up while data plane drops everything. Pair with synthetic probe.
3. **Touching firewall rules before validating the route plane.** If the route doesn't reach the firewall, no rule change will help. Routes first, rules second.
4. **Forgetting `internetSecurity` on the connection.** "Routing intent is enabled but my spoke still goes out via Azure default" almost always means `internetSecurity=false` on that connection.
5. **Assuming the NVA's BGP session implies a healthy data plane.** Verify IP forwarding + interface state + NVA-internal route table separately.
6. **Quoting BGP timers / ASN limits from memory.** Hub router uses AS 65520; do not configure NVAs with that ASN. Cite the vault page.
7. **Running `test-ip-flow` without the correct source/destination semantics.** It tests NSGs only — not effective routes, not firewall rules. Use Connection Monitor for end-to-end.
8. **Treating "Issue 4 VPN not establishing" as Azure-side only.** Branch CPE IKE proposals / MTU / NAT-T traversal account for most VPN failures. Always validate both ends.
9. **No remediation verification step.** "I removed the static route" without re-exporting effective routes isn't a verified fix.
10. **Closing a ticket without a monitor.** The same misconfig will recur. Add a Connection Monitor + alert before closing.

**Analysis only — verify against vendor documentation before applying.**
