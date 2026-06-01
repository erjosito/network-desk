# Network-desk: PSKB vs CKB — retrieval benchmark

Generated 2026-06-01T12:05:59.312Z

- **PSKB** = *Per-Skill Knowledge Base* — the upstream `dmauser/network-desk` design (5 parameterized loader tools, one folder of `SKILL.md` files per specialist).
- **CKB**  = *Consolidated Knowledge Base* — this fork (PSKB + an Obsidian-style cross-cutting vault + a 6th `cn_search` BM25 tool).

- Query set: `benchmarks/queries.json` (49 labeled queries)
- PSKB triggers loaded: 19
- CKB triggers loaded:     19

- Trigger regex drift between PSKB and CKB: **0** (0 = byte-identical routing).

## Methodology

`cn_route` is a regex-based router: the prompt is matched against each specialist's `trigger:` regex in the `REGISTRY`. PSKB and CKB share a byte-identical `REGISTRY` (verified in Tier 1), so cn_route accuracy is the same by construction — the column appears here as a sanity check, not a comparison.

`cn_search` is new in CKB — it BM25-indexes the 162-page Obsidian vault (`Services/`, `Topics/`, `Patterns/`, `Vendors/`) with field boosts (name ×3, aliases ×2.5, tags ×2, body ×1). PSKB has no equivalent: it can only load full SKILL.md files via `cn_skill` after `cn_route` selects a specialist.

Per query we measure:
- `cn_route` hit — did the routed specialists ∩ expected_specialists ≠ ∅
- `cn_search` any@5 — did at least one expected page appear in top-5
- precision@5, recall@5, MRR — standard IR metrics on the page-level retrieval
- end-to-end answerable — query is covered by EITHER cn_route OR (for CKB) cn_search any@5

Labels were authored by hand from the vault. `expected_pages` is the set of pages a knowledgeable user would consider relevant; it's intentionally conservative (2–4 pages per query) so the metric is honest. Recall@5 rewards depth of coverage; precision@5 is naturally low when only 2 pages are expected and 5 are returned.

## Headline numbers

| Metric | PSKB | CKB | Δ |
|---|---:|---:|---:|
| **cn_route specialist accuracy** (top match includes expected) | 83.7% (41/49) | 83.7% (41/49) | +0 |
| **cn_search any-hit@5** (≥1 expected page in top-5) | — | 98.0% (48/49) | new |
| **cn_search mean precision@5** | — | 0.322 | new |
| **cn_search mean recall@5** | — | 0.879 | new |
| **cn_search mean MRR** | — | 0.869 | new |
| **End-to-end "answerable"** (cn_route OR cn_search hit) | 83.7% (41/49) | 98.0% (48/49) | +7 |

## Breakdown by query category

| category         | n  | cn_route OK | cn_search any@5 | PSKB answerable | CKB answerable | Δ answerable |
| ---------------- | -- | ----------- | --------------- | ------------------- | --------------- | ------------ |
| cloud-service    | 9  | 77.8%       | 100.0%          | 77.8%               | 100.0%          | 2            |
| cross-specialist | 2  | 100.0%      | 100.0%          | 100.0%              | 100.0%          | 0            |
| regex-easy       | 29 | 82.8%       | 100.0%          | 82.8%               | 100.0%          | 5            |
| vague            | 3  | 66.7%       | 66.7%           | 66.7%               | 66.7%           | 0            |
| vendor-specific  | 6  | 100.0%      | 100.0%          | 100.0%              | 100.0%          | 0            |

Interpretation: the rightmost column is the number of queries in each category where **CKB** can answer (via route OR search) and **PSKB** cannot. The biggest wins should be in `vendor-specific` and `cloud-service` (where PSKB has no granular vault page to load).

## Per-query detail

| query id                  | category         | PSKB route | CKB route | search hits@5 | p@5  | r@5  | MRR  | top-1 vault page                     |
| ------------------------- | ---------------- | -------- | ---------- | ------------- | ---- | ---- | ---- | ------------------------------------ |
| vnet-hub-spoke            | regex-easy       | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 0.50 | Secured-Virtual-Hub                  |
| vnet-ip-planning          | regex-easy       | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 0.50 | Network-Configuration-Testing        |
| vnet-subnet-math          | regex-easy       | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 0.50 | ZTNA-Design                          |
| vnet-peering-transitivity | regex-easy       | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 1.00 | VNet-VPC-Peering                     |
| fw-rule-audit             | regex-easy       | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 1.00 | Firewall-Rule-Audit                  |
| fw-ha                     | regex-easy       | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 1.00 | Firewall-HA-Design                   |
| fw-vendor-palo            | vendor-specific  | ✓        | ✓          | 2/5           | 0.40 | 0.67 | 1.00 | Firewall-HA-Design                   |
| fw-vendor-fortigate       | vendor-specific  | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 1.00 | Firewall-HA-Design                   |
| fw-vendor-zscaler         | vendor-specific  | ✓        | ✓          | 2/5           | 0.40 | 0.67 | 1.00 | Zscaler                              |
| fw-vendor-opnsense        | vendor-specific  | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 1.00 | OPNsense                             |
| fw-vendor-cisco           | vendor-specific  | ✓        | ✓          | 2/5           | 0.40 | 0.67 | 1.00 | Cisco-ASA-FTD                        |
| fw-vendor-vyos            | vendor-specific  | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 1.00 | BGP-Design                           |
| lb-l4-vs-l7               | cloud-service    | ✓        | ✓          | 1/5           | 0.20 | 0.33 | 0.50 | Container-Networking-Troubleshooting |
| lb-snat-exhaustion        | regex-easy       | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 1.00 | Load-Balancer-Troubleshooting        |
| lb-tls-cert               | regex-easy       | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 1.00 | TLS-Certificate-Management           |
| dns-private-resolver      | regex-easy       | ✓        | ✓          | 1/5           | 0.20 | 0.50 | 1.00 | DNS-Resolver-Design                  |
| dns-dnssec                | regex-easy       | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 1.00 | DNSSEC                               |
| dns-cloud-svc-r53         | cloud-service    | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 1.00 | Route-53                             |
| pl-endpoint-dns           | regex-easy       | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 1.00 | Private-Endpoint-DNS-Integration     |
| pl-aws-equiv              | cloud-service    | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 1.00 | VPC-Endpoint                         |
| pl-gcp-equiv              | cloud-service    | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 1.00 | Private-Service-Connect              |
| hyb-er-fastpath           | cloud-service    | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 1.00 | ExpressRoute                         |
| hyb-bgp-design            | regex-easy       | ✓        | ✓          | 2/5           | 0.40 | 0.67 | 0.50 | ExpressRoute                         |
| hyb-dx-macsec             | cloud-service    | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 1.00 | Direct-Connect                       |
| hyb-gcp-interconnect      | cloud-service    | ✗        | ✗          | 3/5           | 0.60 | 1.00 | 1.00 | HA-VPN                               |
| nsec-ddos                 | regex-easy       | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 1.00 | DDoS-Protection-Design               |
| nsec-nsg-audit            | regex-easy       | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 1.00 | NSG-and-Security-Group-Audit         |
| nsec-waf                  | regex-easy       | ✗        | ✗          | 2/5           | 0.40 | 1.00 | 1.00 | WAF-Policy-Design                    |
| ntsh-asymmetric           | vague            | ✗        | ✗          | 0             | 0.00 | 0.00 | 0.14 | VWAN-Routing-Intent                  |
| ntsh-mtu                  | regex-easy       | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 1.00 | MTU-and-PMTUD                        |
| ntsh-pcap                 | regex-easy       | ✗        | ✗          | 2/5           | 0.40 | 1.00 | 1.00 | PCAP-Analysis                        |
| vwan-routing-intent       | regex-easy       | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 1.00 | VWAN-Routing-Intent                  |
| vwan-branch               | regex-easy       | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 0.33 | VWAN-NVA-Integration                 |
| vwan-aws-equiv            | cloud-service    | ✗        | ✗          | 2/5           | 0.40 | 1.00 | 1.00 | Transit-Gateway                      |
| price-egress              | vague            | ✓        | ✓          | 1/5           | 0.20 | 0.33 | 1.00 | Egress-Cost-Architecture             |
| price-nat-egress          | cross-specialist | ✓        | ✓          | 3/5           | 0.60 | 0.75 | 1.00 | AWS-NAT-Gateway                      |
| price-er-vs-vpn           | cross-specialist | ✓        | ✓          | 1/5           | 0.20 | 0.50 | 0.50 | Gateway-Sizing                       |
| iac-terraform-hub         | regex-easy       | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 0.25 | Secured-Virtual-Hub                  |
| iac-bicep                 | regex-easy       | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 1.00 | Dual-Stack-Networking                |
| cnet-cni                  | regex-easy       | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 1.00 | CNI-Plugin-Selection                 |
| cnet-mesh                 | regex-easy       | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 1.00 | Multi-Cluster-Networking             |
| cdn-cloudfront            | cloud-service    | ✓        | ✓          | 1/5           | 0.20 | 0.50 | 1.00 | CDN-Cache-Optimization               |
| sase-ztna                 | regex-easy       | ✗        | ✗          | 2/5           | 0.40 | 1.00 | 1.00 | ZTNA-Design                          |
| mon-flow-logs             | regex-easy       | ✓        | ✓          | 3/5           | 0.60 | 1.00 | 1.00 | Flow-Log-Setup                       |
| ipv6-migration            | regex-easy       | ✓        | ✓          | 2/5           | 0.40 | 1.00 | 0.33 | IP-Address-Space-Planning            |
| mcn-service-mapping       | vague            | ✓        | ✓          | 2/5           | 0.40 | 0.50 | 1.00 | PrivateLink                          |
| cap-throughput            | regex-easy       | ✗        | ✗          | 2/5           | 0.40 | 1.00 | 1.00 | Gateway-Sizing                       |
| nauto-drift               | regex-easy       | ✗        | ✗          | 1/5           | 0.20 | 1.00 | 1.00 | Configuration-Drift-Detection        |
| doc-xlsx-report           | regex-easy       | ✓        | ✓          | 1/5           | 0.20 | 1.00 | 0.50 | Network-Dashboard-Build              |

## Coverage gap — queries PSKB misses but CKB answers

**7** queries where cn_route failed AND cn_search succeeded:

| id                   | category      | query                                                                | top-3 search results                                                            |
| -------------------- | ------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| hyb-gcp-interconnect | cloud-service | `GCP Dedicated Interconnect with HA VPN failover`                    | HA-VPN, Cloud-Interconnect, Hybrid-Failover-Design                              |
| nsec-waf             | regex-easy    | `WAF policy design for OWASP top 10 with custom exclusions`          | WAF-Policy-Design, Edge-WAF-and-DDoS, WAF-Rules-Configuration                   |
| ntsh-pcap            | regex-easy    | `capture packets on an Azure VM and analyze with Wireshark`          | PCAP-Analysis, Packet-Capture, Traffic-Analytics                                |
| vwan-aws-equiv       | cloud-service | `AWS Cloud WAN segments and policy versus AWS Transit Gateway`       | Transit-Gateway, Cloud-WAN, Transit-Hub                                         |
| sase-ztna            | regex-easy    | `ZTNA design for replacing a legacy VPN concentrator`                | ZTNA-Design, SASE-SSE-Vendor-Comparison, SASE-SSE-Architecture                  |
| cap-throughput       | regex-easy    | `size an Azure VPN gateway for 300 Mbps sustained throughput`        | Gateway-Sizing, VPN-Gateway-Pricing, VPN-Gateway                                |
| nauto-drift          | regex-easy    | `detect and remediate configuration drift across firewall rule sets` | Configuration-Drift-Detection, Firewall-Policy-Testing, WAF-Rules-Configuration |

---
Analysis only — verify against vendor documentation before applying.
