# Skill: Private Endpoint DNS Integration (`pl_dns_integration`)

Configure DNS so that PaaS / cross-cloud / partner FQDNs resolve to **private** endpoint IPs from inside the VNet/VPC — Azure Private DNS zones, AWS VPC endpoint private DNS, GCP PSC DNS, plus hub-spoke and on-prem forwarding.

**DNS is the #1 cause of private endpoint failures.** If DNS is wrong, the PE looks healthy and the network path is correct, and it still won't work.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the workflow, output shape, and DNS-specific guardrails. The per-cloud zone names, command-line steps, hub-spoke architecture, custom-DNS rules, and pitfalls live in the vault and **must be loaded with `cn_vault_page` before answering** — do not paraphrase or recall them from memory (zone names and `privatelink.*` suffixes change as new PaaS services ship — recall is unreliable).

Mandatory steps every time you use this skill:

1. Identify the consumer cloud(s) and whether the resolver is Azure-provided DNS, custom DNS in the VNet, or on-prem DNS.
2. Call `cn_vault_page` for the consumer cloud's DNS reference page from the table below.
3. Build the answer around the loaded page(s); cite the page name when you state a zone name, forwarder target, or required setting.

If the user asks about a service or DNS pattern not in the table, fall back to `cn_search({ query: "<keywords>", specialist: "cn_pl" })` or `cn_search({ query: "<keywords>", specialist: "cn_dns" })`, identify the right page, then load it.

---

## When to use DNS integration

| Scenario | DNS task |
|---|---|
| Consumer just created a private endpoint and the FQDN still resolves to the public IP | Wire up the Private DNS zone + VNet link (Azure) / enable `--private-dns-enabled` (AWS) / create the private managed zone (GCP) |
| On-prem clients need to resolve a PaaS FQDN to the private IP via ExpressRoute / VPN | Add a DNS Private Resolver inbound endpoint and conditional forwarders on the on-prem resolver |
| Hub-spoke topology with central PEs and many spoke VNets | Centralise the privatelink zones in the hub, link every spoke VNet to every zone |
| Custom DNS server (AD DCs, BIND, Unbound) inside the VNet | Forward `privatelink.*` queries to 168.63.129.16 (in-VNet) or the DNS Private Resolver inbound EP (on-prem) |
| Cross-account or cross-VPC shared endpoints (AWS) | Use Route 53 Private Hosted Zones shared via RAM |
| Multi-region PEs | Per-region zones / split-horizon strategy — pair with `endpoint-design` |

**Not this skill — use the sibling skill instead:**

- Designing the PE / endpoint itself (subnet, groupId, placement) → `cn_skill({ specialist: "cn_pl", skill: "endpoint-design" })`
- Producer-side (exposing your service) → `cn_skill({ specialist: "cn_pl", skill: "service-exposure" })`
- "Resolution is broken — what now?" → `cn_skill({ specialist: "cn_pl", skill: "troubleshoot" })` for PE-specific issues, or `cn_skill({ specialist: "cn_dns", skill: "troubleshoot" })` for general DNS

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Cross-cloud canonical reference — PE DNS, zone names, hub-spoke, custom DNS, validation, pitfalls | [[Private-Endpoint-DNS-Integration]] | `cn_vault_page({ page: "Private-Endpoint-DNS-Integration" })` |
| Azure consumer-side concept (groupId ↔ Private DNS zone mapping) | [[Private-Endpoint]] | `cn_vault_page({ page: "Private-Endpoint" })` |
| AWS consumer (interface endpoint `--private-dns-enabled` semantics, ENI per AZ) | [[VPC-Endpoint]] | `cn_vault_page({ page: "VPC-Endpoint" })` |
| GCP consumer (PSC DNS — Google APIs bundle vs published service) | [[Private-Service-Connect]] | `cn_vault_page({ page: "Private-Service-Connect" })` |
| Azure DNS Private Resolver design (inbound/outbound endpoints, rule sets) | [[DNS-Resolver-Design]] | `cn_vault_page({ page: "DNS-Resolver-Design" })` |
| Private DNS zone design (split-horizon, naming, multi-region) | [[DNS-Zone-Design]] | `cn_vault_page({ page: "DNS-Zone-Design" })` |

Call **only the row(s) relevant to the user's scenario**. The PE-DNS canonical page is almost always row #1; the other rows are conditional on cloud / advanced pattern.

---

## Workflow

1. **Disambiguate the resolver topology** — Azure-provided DNS / custom DNS in the VNet / on-prem-as-authoritative? If unclear, ask. The wiring is different in each case.
2. **Load the canonical PE-DNS vault page** ([[Private-Endpoint-DNS-Integration]]).
3. **Load the cloud-specific consumer page** for the target cloud (Azure / AWS / GCP).
4. **Walk the user through the DNS chain** for their cloud, citing the loaded page:
   - **Azure**: public FQDN → CNAME to `privatelink.*` (auto) → A record in the privatelink Private DNS zone (must exist; auto via DNS zone group, or via Azure Policy, or manually).
   - **AWS**: `--private-dns-enabled` on the interface endpoint creates a private hosted zone that overrides the service's public DNS inside the VPC (requires `enableDnsSupport=true` and `enableDnsHostnames=true`; only ONE endpoint per service per VPC can hold private DNS).
   - **GCP**: a private managed zone for the service domain (or `googleapis.com` for the all-apis bundle), with A / CNAME records pointing at the PSC endpoint IP.
5. **Address the spoke-VNet linking** if the topology is hub-spoke — every VNet that needs resolution must be linked to every relevant privatelink zone, with `registration-enabled=false`.
6. **Address on-prem resolution** if applicable — DNS Private Resolver inbound endpoint + conditional forwarder per `privatelink.*` zone on the on-prem resolver.
7. **Address custom DNS in the VNet** if applicable — forwarders to 168.63.129.16 (Azure) / forwarders to the Private Resolver inbound EP (on-prem custom DNS).
8. **Hand the user a validation checklist** (vault page's "Validation Checklist" section — `dig` / `nslookup` chain from inside the VNet).
9. **Emit the output** in the shape below.

---

## Output format

Every DNS-integration answer should include, in this order:

1. **Resolver topology** — restated in one line ("Azure-provided DNS, hub-spoke, on-prem via ExpressRoute" / "Custom AD DNS in the VNet" / etc.).
2. **Required zones / private hosted zones** — list, cited from the vault page. **Do not invent zone names.** If unsure, load the vault and cite the exact `privatelink.*` zone name (or AWS / GCP equivalent).
3. **Zone-to-VNet linkage plan** — which VNets / VPCs / projects must be linked to which zones, with `registration-enabled=false` (Azure) or RAM share (AWS) called out.
4. **A-record source** — auto via DNS zone group / auto via Azure Policy / via `--private-dns-enabled` / manual — name the mechanism and cite the page.
5. **On-prem forwarder list** — if on-prem clients need resolution, list the zones to forward and the forwarder target (Private Resolver inbound EP IP / equivalent).
6. **Custom-DNS adjustments** — if the VNet runs custom DNS, list the forward-zone entries required (e.g. `Add-DnsServerConditionalForwarderZone` with `168.63.129.16` for Azure, vault page has the exact commands).
7. **Validation checklist** — pointer to the vault page's `dig` / `nslookup` chain, run from inside the VNet (not from a developer laptop on the public internet).
8. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

These are **workflow** anti-patterns specific to this skill — they are not a substitute for the vault page's pitfall list. Always also surface the loaded vault page's "Common DNS Integration Mistakes" section.

1. **Answering without loading the vault page.** Zone names (e.g. `privatelink.openai.azure.com` vs `privatelink.cognitiveservices.azure.com`) and forwarder targets are exact strings; recall from memory is unreliable. Load first, then answer.
2. **Recommending auto-registration on a privatelink zone.** `registration-enabled=true` is for VM A records; on a privatelink zone it does nothing useful and clutters the zone. Always `false`.
3. **Forgetting the spoke links.** Centralising the zones in the hub but not linking spoke VNets means spokes resolve via public DNS → public IP → silent breakage on the path.
4. **Forgetting on-prem.** If clients on-prem (via ExpressRoute / VPN) need to resolve PaaS FQDNs to the private IP, they need both a Private Resolver inbound endpoint **and** a conditional forwarder per `privatelink.*` zone. Skipping either side fails.
5. **Testing from outside the VNet.** A `dig` from a developer laptop on the public internet will always return the public IP; the test must run from an in-VNet machine (or via the Private Resolver inbound EP).
6. **Forwarding `*.<service>` instead of `privatelink.<service>` (custom DNS).** On a custom DNS server, only the `privatelink.*` chain needs the forwarder; forwarding the parent zone breaks public-facing names.
7. **Assuming multi-region just works.** PE DNS is regional by zone-link scope; multi-region consumers need a deliberate strategy (per-region zones, split-horizon, or geo-DNS) — pair with `endpoint-design` and the vault zone-design page.

**Analysis only — verify against vendor documentation before applying.**
