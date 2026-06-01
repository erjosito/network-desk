# Skill: Private Endpoint Troubleshooting (`pl_troubleshoot`)

Diagnose private-endpoint connectivity failures across Azure, AWS, and GCP. Owns the **diagnostic order** (DNS first, always) and the symptom→root-cause decision tree. The exact `dig`, `nslookup`, `az`, `aws`, and `gcloud` commands live in the vault.

**~80% of PE failures are DNS.** Resist the urge to start with NSGs or routes — they almost never explain the symptom.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the methodology, the issue taxonomy, the symptom → which-issue mapping, and the format of the answer (always with a clear next diagnostic step). The exact CLI / API commands per cloud and per failure mode live in the vault and **must be loaded with `cn_vault_page` before issuing diagnostic commands** — do not paraphrase commands from memory.

Mandatory steps every time you use this skill:

1. Get the user to state the symptom precisely (timeout / connection refused / 403 / authentication failure / DNS returns public IP) and which cloud.
2. Map the symptom to the issue number in the taxonomy below.
3. Call `cn_vault_page({ page: "Private-Endpoint-Troubleshooting" })` for the canonical command catalogue and fix matrices.
4. Issue commands and remediations citing the loaded vault page.

If the user describes a symptom that doesn't fit the taxonomy, fall back to `cn_search({ query: "<symptom keywords>", specialist: "cn_pl" })` and load whatever page surfaces.

---

## When to use troubleshooting

| Scenario | Behaviour |
|---|---|
| "I created a PE and the client still hits the public endpoint" | Issue 1 (DNS) — load the vault page, walk the DNS chain |
| "Client times out / connection refused against the private IP" | Issue 3 (NSG / SG / firewall) **after** confirming Issue 1 is clean |
| "PE shows Pending / Rejected / Disconnected" | Issue 2 (connection state) |
| "Works in source VNet, not in peered VNet / other region / on-prem" | Issue 4 (cross-region / cross-VNet) — almost always DNS-zone link or peering missing |
| "DNS and network look fine but I get 403 / 401 / 500" | Issue 5 (application / authorisation) — service firewall or IP-based access control |
| "Should we even use a PE for this?" / "How do I design this?" | Redirect: `cn_skill({ specialist: "cn_pl", skill: "endpoint-design" })` |
| "How do I set up DNS for a PE I'm about to create?" | Redirect: `cn_skill({ specialist: "cn_pl", skill: "dns-integration" })` |
| Generic DNS resolution failure not specific to PE | Redirect: `cn_skill({ specialist: "cn_dns", skill: "troubleshoot" })` |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical PE troubleshooting — issue-by-issue commands, fix matrices, quick-reference table | [[Private-Endpoint-Troubleshooting]] | `cn_vault_page({ page: "Private-Endpoint-Troubleshooting" })` |
| DNS chain explanation + zone names + custom-DNS forwarding | [[Private-Endpoint-DNS-Integration]] | `cn_vault_page({ page: "Private-Endpoint-DNS-Integration" })` |
| Azure consumer (PE network-policies, subnet rules, groupId-to-zone map) | [[Private-Endpoint]] | `cn_vault_page({ page: "Private-Endpoint" })` |
| AWS consumer (interface vs gateway, `--private-dns-enabled` semantics, per-AZ ENI behaviour) | [[VPC-Endpoint]] | `cn_vault_page({ page: "VPC-Endpoint" })` |
| GCP consumer (PSC connection states, regional scope) | [[Private-Service-Connect]] | `cn_vault_page({ page: "Private-Service-Connect" })` |
| General DNS troubleshooting (resolver chain, caching, `dig` patterns) | [[DNS-Troubleshooting]] | `cn_vault_page({ page: "DNS-Troubleshooting" })` |

Call **only the row(s) relevant to the user's symptom and cloud**. The canonical troubleshooting page (row #1) is mandatory.

---

## Diagnostic methodology — fixed order

Never skip a step or change the order — earlier failures invalidate later checks.

```
Symptom: PE not working
├── Step 1: DNS — does the FQDN resolve to the private IP from inside the VNet/VPC?
│           (~80% of cases stop here)
├── Step 2: Connection state — is the PE/VPCe/PSC endpoint Approved/Available?
├── Step 3: Network — is the path open? (NSG on PE subnet only matters if
│           network-policies are Enabled; SG on AWS endpoint; GCP firewall)
├── Step 4: Topology — same VNet/VPC, peered, cross-region, on-prem?
│           Did the zone-link / RAM share / forwarder follow?
└── Step 5: Service / application — service firewall, IP-based ACL, RBAC,
            connection string, identity authorisation
```

---

## Issue taxonomy

Each issue has a canonical entry on [[Private-Endpoint-Troubleshooting]] — load that page first, then walk the user through.

| # | Symptom signature | Issue |
|---|---|---|
| 1 | `nslookup` returns the **public** IP from inside the VNet/VPC | DNS — zone missing, zone not linked, A record missing, custom DNS not forwarding, stale cache, or `--private-dns-enabled=false` (AWS) |
| 2 | `az network private-endpoint show` shows `Pending` / `Rejected` / `Disconnected`; AWS shows `pendingAcceptance` / `rejected`; GCP shows non-`ACCEPTED` PSC state | Connection state — manual approval pending, provider rejected, or PaaS resource was deleted/moved |
| 3 | DNS resolves to the **private** IP, but TCP times out or is refused | NSG / SG / firewall — for Azure, almost always `privateEndpointNetworkPolicies=Disabled` so NSG is ignored; or default-deny rules without an `Allow 443` exception |
| 4 | Works in source VNet/VPC but fails from a peered / different-region / on-prem network | Topology — VNet peering missing, DNS zone not linked to the second VNet, Transit Gateway route missing, or on-prem forwarder not pointing at the Private Resolver inbound endpoint |
| 5 | DNS correct, TCP connects, but app returns 403 / 401 / 500 / auth failure | Application / authorisation — service firewall denies the private subnet, IP-based ACL still expects the public NAT IP, RBAC role missing, or connection string still hardcoded to public FQDN |

---

## Output format

Every troubleshooting answer should include:

1. **Symptom restatement** in one line, plus the issue # mapped to from the taxonomy.
2. **Next diagnostic command** to run — exactly one — cited from the loaded vault page. (Do not dump every possible command; pick the one that confirms or rules out the current hypothesis.)
3. **Expected output** — what "good" looks like vs. what the user's symptom would show.
4. **If-then branch** — "If the output shows X, the root cause is Y; if it shows Z, jump to issue #N". This is the value of the specialist: turning a flat fix matrix into a conditional walk.
5. **Fix command** (only after the user has confirmed which branch they're on) — cited from the vault.
6. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are **workflow** anti-patterns for troubleshooting — not a substitute for the vault page's "Common Mistakes" section.

1. **Starting with NSGs.** If DNS is wrong, the NSG is irrelevant — traffic isn't even arriving at the PE. Always confirm Issue 1 first, even when the user is certain it's "definitely a firewall problem".
2. **Running `dig` from a developer laptop on the public internet.** The answer will always be the public IP. Diagnostic commands must run from inside the VNet/VPC, or via the Private Resolver inbound endpoint.
3. **Dumping every command from the vault page at once.** The vault page has ~6 issue catalogues with 4–6 commands each; the user will not run 30 commands. Pick the single highest-information command per turn.
4. **Forgetting the network-policies flag (Azure).** Don't recommend NSG changes until you've confirmed `privateEndpointNetworkPolicies` is `Enabled` (or NSG-only mode). Otherwise the fix doesn't take effect and the user thinks PE is broken.
5. **Confusing AWS interface vs gateway endpoints.** Gateway endpoints (S3, DynamoDB) use route-table prefix lists, not ENIs and not security groups — different diagnostic path. Confirm endpoint type before walking Issue 3.
6. **Treating cross-region as a routing problem.** Almost always it's DNS — the zone is linked to one VNet, not the other. Check zone links / RAM shares / hosted-zone associations before touching peering or Transit Gateway.
7. **Closing the case at "connection works".** A working TCP connection does not prove the PE is in the path — verify the **resolved IP** in the `curl -v` output is the PE's private IP (10.x), not the public NAT IP (20.x / 52.x).

**Analysis only — verify against vendor documentation before applying.**
