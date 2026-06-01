#!/usr/bin/env node
// One-shot stub generator for B1 — emits ~17 lean Services/AWS|GCP/*.md stub pages.
// Each stub is a valid wikilink target (frontmatter + summary + when-to-use + cross-refs).
// Pure LF line endings. Skips files that already exist (idempotent — won't clobber canonical pages).
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const VAULT = "extensions/network-desk/vault";

const TODAY = "2026-06-01";

const STUBS = [
  // AWS
  {
    path: "Services/AWS/Transit-Gateway.md",
    name: "AWS Transit Gateway",
    cloud: "aws",
    category: "networking",
    specialists: ["cn_hyb", "cn_vnet"],
    aliases: ["Transit Gateway", "TGW"],
    tags: ["transit-gateway", "tgw", "hub", "vpc-routing"],
    summary: "Regional hub that interconnects VPCs, VPN connections, [[Direct-Connect|Direct Connect Gateways]], and other Transit Gateways through a single attachment model and shared route tables.",
    whenToUse: [
      "Interconnecting many VPCs at scale (>5) without n×(n-1)/2 peerings.",
      "Centralizing on-premises connectivity ([[Direct-Connect|DX]] / [[Site-to-Site-VPN|S2S VPN]]) and steering traffic via shared route tables.",
      "Multi-account hub-and-spoke designs using Resource Access Manager (RAM) sharing.",
    ],
    avoidWhen: [
      "Two VPCs in the same region with stable, low-volume traffic — direct VPC peering is cheaper.",
      "Global multi-region hub — use [[Cloud-WAN|Cloud WAN]] or stitched per-region TGWs with TGW peering.",
    ],
    crossRefs: [
      "Cloud equivalents: [[Virtual-WAN|Azure Virtual WAN]] · [[Network-Connectivity-Center|GCP Network Connectivity Center]]",
      "Pairs with: [[Direct-Connect]] · [[Site-to-Site-VPN]] · [[Cloud-WAN]] · [[Hub-and-Spoke]] · [[Transit-Hub]]",
    ],
  },
  {
    path: "Services/AWS/Site-to-Site-VPN.md",
    name: "AWS Site-to-Site VPN",
    cloud: "aws",
    category: "networking",
    specialists: ["cn_hyb"],
    aliases: ["Site-to-Site VPN", "AWS VPN", "S2S VPN"],
    tags: ["s2s-vpn", "ipsec", "bgp", "hybrid"],
    summary: "IPsec/IKEv2 VPN service that terminates on a Virtual Private Gateway (VGW) or [[Transit-Gateway|Transit Gateway]] with two redundant tunnels per connection, BGP-capable, supporting active-active or active-passive failover.",
    whenToUse: [
      "Hybrid connectivity to on-premises without [[Direct-Connect|Direct Connect]].",
      "Backup path for [[Direct-Connect|DX]] circuits ([[Hybrid-Failover-Design|active/standby failover]] via BGP).",
      "Quick interim connectivity while [[Direct-Connect|DX]] is being provisioned.",
    ],
    avoidWhen: [
      "Latency- or bandwidth-sensitive workloads at scale — use [[Direct-Connect]] instead.",
      "Single-tunnel reliance — both tunnels are always provisioned; use BGP for automatic failover.",
    ],
    crossRefs: [
      "Cloud equivalents: [[VPN-Gateway|Azure VPN Gateway]] · [[HA-VPN|GCP HA VPN]]",
      "Pairs with: [[BGP-Design]] · [[Direct-Connect]] · [[Transit-Gateway]] · [[Hybrid-Failover-Design]]",
    ],
  },
  {
    path: "Services/AWS/Cloud-WAN.md",
    name: "AWS Cloud WAN",
    cloud: "aws",
    category: "networking",
    specialists: ["cn_mcn", "cn_hyb"],
    aliases: ["Cloud WAN", "AWS Cloud WAN"],
    tags: ["cloud-wan", "global", "core-network", "segmentation"],
    summary: "Managed global WAN service that builds a unified core network across Regions with [[Network-Segmentation|segmentation policies]], replacing manual mesh of TGW peerings.",
    whenToUse: [
      "Multi-region AWS footprints where TGW peering meshes become unmanageable.",
      "Global SaaS / enterprise with declarative segmentation requirements (prod/dev/shared).",
      "Replacing third-party SD-WAN overlays for AWS-to-AWS routing.",
    ],
    avoidWhen: [
      "Single-region or 2–3 region deployments — [[Transit-Gateway|TGW]] + peering is cheaper.",
      "Heavy SD-WAN integration with non-AWS branches — combine with vendor SD-WAN ([[FortiGate]], [[Cisco-ASA-FTD|Cisco]], etc.).",
    ],
    crossRefs: [
      "Cloud equivalents: [[Virtual-WAN|Azure Virtual WAN]] · [[Network-Connectivity-Center|GCP NCC]]",
      "Pairs with: [[Transit-Gateway]] · [[Direct-Connect]] · [[Network-Segmentation]] · [[Cloud-Network-Service-Mapping]]",
    ],
  },
  {
    path: "Services/AWS/Route-53.md",
    name: "AWS Route 53",
    cloud: "aws",
    category: "networking",
    specialists: ["cn_dns"],
    aliases: ["Route 53", "Route53", "R53"],
    tags: ["dns", "route53", "private-hosted-zone", "resolver"],
    summary: "Managed authoritative DNS, recursive resolver (Route 53 Resolver), and traffic-management service with public / private hosted zones, health-checked routing policies, and DNSSEC for public zones.",
    whenToUse: [
      "Authoritative DNS for public domains hosted in AWS.",
      "Private DNS for VPCs (private hosted zones) with [[VPC-Endpoint|VPC Endpoint]] integration.",
      "Hybrid DNS forwarding to/from on-premises via Route 53 Resolver Inbound/Outbound endpoints.",
    ],
    avoidWhen: [
      "Non-AWS-centric DNS estate — keep authority where it lives (often a third-party registrar / on-premises AD).",
    ],
    crossRefs: [
      "Cloud equivalents: [[Azure-Private-DNS-Zones]] · [[Cloud-DNS|GCP Cloud DNS]]",
      "Pairs with: [[DNS-Resolver-Design]] · [[VPC-Endpoint]] · [[PrivateLink]]",
    ],
  },
  {
    path: "Services/AWS/CloudFront.md",
    name: "AWS CloudFront",
    cloud: "aws",
    category: "delivery",
    specialists: ["cn_cdn"],
    aliases: ["CloudFront", "AWS CDN"],
    tags: ["cdn", "edge", "tls", "waf"],
    summary: "Global CDN with edge locations and Regional Edge Caches, origin failover, [[AWS-WAF|AWS WAF]] integration, signed URLs/cookies, and Lambda@Edge / CloudFront Functions for edge compute.",
    whenToUse: [
      "Public web / API delivery with low-latency edge caching.",
      "Origin shielding for S3 / [[AWS-Application-Load-Balancer|ALB]] / [[AWS-Network-Load-Balancer|NLB]] / custom origins.",
      "Edge security ([[AWS-WAF|WAF]] + Shield) for internet-facing endpoints.",
    ],
    avoidWhen: [
      "Internal-only traffic — use private endpoints and internal load balancers.",
    ],
    crossRefs: [
      "Cloud equivalents: [[CDN-Architecture-Design|Azure Front Door / CDN]] · [[Cloud-CDN|GCP Cloud CDN]]",
      "Pairs with: [[CDN-Cache-Optimization]] · [[AWS-WAF]] · [[Route-53]] · [[TLS-Certificate-Management]]",
    ],
  },
  {
    path: "Services/AWS/AWS-Network-Load-Balancer.md",
    name: "AWS Network Load Balancer",
    cloud: "aws",
    category: "networking",
    specialists: ["cn_lb"],
    aliases: ["AWS NLB"],
    tags: ["nlb", "layer4", "tcp", "udp", "tls"],
    summary: "Layer-4 load balancer for TCP / UDP / TLS, with ultra-low latency, preserved source IP (with target-type IP or instance), zonal isolation, and the only LB type that fronts an [[PrivateLink|AWS PrivateLink endpoint service]].",
    whenToUse: [
      "High-throughput, low-latency TCP/UDP workloads (databases, gaming, real-time).",
      "Source-IP preservation for backend logging / firewall rules.",
      "Fronting an [[PrivateLink|AWS PrivateLink]] endpoint service.",
    ],
    avoidWhen: [
      "HTTP/HTTPS path/host routing — use [[AWS-Application-Load-Balancer|Application Load Balancer]].",
    ],
    crossRefs: [
      "Cloud equivalents: Azure Standard Load Balancer · [[Cloud-Load-Balancing|GCP TCP/UDP Network LB]]",
      "Pairs with: [[PrivateLink]] · [[AWS-Application-Load-Balancer]] · [[Health-Probe-Design]]",
    ],
  },
  {
    path: "Services/AWS/AWS-Application-Load-Balancer.md",
    name: "AWS Application Load Balancer",
    cloud: "aws",
    category: "networking",
    specialists: ["cn_lb"],
    aliases: ["AWS ALB"],
    tags: ["alb", "layer7", "http", "https", "tls"],
    summary: "Layer-7 load balancer for HTTP / HTTPS with path-based and host-based routing, [[AWS-WAF|WAF]] integration, OIDC / Cognito authentication, gRPC support, and per-request routing rules.",
    whenToUse: [
      "Public or internal web apps and REST/gRPC APIs needing host / path routing.",
      "[[AWS-WAF|WAF]] termination point for L7 attacks.",
      "Centralised TLS termination with [[TLS-Certificate-Management|ACM-managed certs]].",
    ],
    avoidWhen: [
      "Raw TCP/UDP, source-IP preservation, or PrivateLink producer — use [[AWS-Network-Load-Balancer|NLB]].",
    ],
    crossRefs: [
      "Cloud equivalents: Azure Application Gateway · [[Cloud-Load-Balancing|GCP HTTPS Load Balancer]]",
      "Pairs with: [[AWS-WAF]] · [[AWS-Network-Load-Balancer]] · [[TLS-Certificate-Management]] · [[WAF-Rules-Configuration]]",
    ],
  },
  {
    path: "Services/AWS/AWS-NAT-Gateway.md",
    name: "AWS NAT Gateway",
    cloud: "aws",
    category: "networking",
    specialists: ["cn_vnet", "cn_price"],
    aliases: ["AWS NAT GW"],
    tags: ["nat", "egress", "vpc", "ipv4"],
    summary: "Managed AZ-scoped NAT for IPv4 egress from private subnets to the internet, billed per-hour and per-GB; one NAT Gateway per AZ for HA.",
    whenToUse: [
      "Internet-bound egress from private subnets without exposing instances.",
      "Centralised egress points that simplify [[Egress-Cost-Architecture|cost auditing]].",
    ],
    avoidWhen: [
      "Egress to AWS service endpoints — prefer [[VPC-Endpoint|VPC endpoints]] (gateway endpoints are free).",
      "High-volume same-region S3/DynamoDB traffic — gateway endpoint avoids per-GB NAT charges.",
    ],
    crossRefs: [
      "Cloud equivalents: Azure NAT Gateway · [[Cloud-NAT|GCP Cloud NAT]]",
      "Pairs with: [[Egress-Cost-Architecture]] · [[VPC-Endpoint]] · [[Transit-Gateway]]",
    ],
  },
  {
    path: "Services/AWS/AWS-WAF.md",
    name: "AWS WAF",
    cloud: "aws",
    category: "security",
    specialists: ["cn_nsec", "cn_cdn"],
    aliases: ["AWS WAF", "WAFv2"],
    tags: ["waf", "edge-security", "cloudfront", "alb"],
    summary: "Web Application Firewall that attaches to [[CloudFront]], [[AWS-Application-Load-Balancer|ALB]], API Gateway, AppSync, or Cognito, with managed rule groups, custom rules, rate-based rules, and Bot Control / Fraud Control add-ons.",
    whenToUse: [
      "Edge L7 protection for public web apps and APIs.",
      "Bot mitigation and rate limiting at the edge.",
    ],
    avoidWhen: [
      "Internal apps — use SG / NACL / firewall ([[AWS-Network-Firewall|NFW]]) instead.",
    ],
    crossRefs: [
      "Cloud equivalents: Azure Web Application Firewall (Front Door / App Gateway) · [[Cloud-Armor|GCP Cloud Armor]]",
      "Pairs with: [[WAF-Rules-Configuration]] · [[WAF-Policy-Design]] · [[CloudFront]] · [[AWS-Application-Load-Balancer]]",
    ],
  },
  // GCP
  {
    path: "Services/GCP/HA-VPN.md",
    name: "GCP HA VPN",
    cloud: "gcp",
    category: "networking",
    specialists: ["cn_hyb"],
    aliases: ["HA VPN", "GCP HA VPN", "Cloud VPN HA"],
    tags: ["ha-vpn", "ipsec", "bgp", "hybrid"],
    summary: "Highly available IPsec VPN with a 99.99% SLA when configured per the HA topology patterns — two interfaces with separate public IPs, BGP via [[Cloud-Router|Cloud Router]], active-active tunnel pairs.",
    whenToUse: [
      "Hybrid connectivity to on-premises without [[Cloud-Interconnect|Cloud Interconnect]].",
      "Backup path for [[Cloud-Interconnect|Cloud Interconnect]] using BGP weighting / MED.",
      "Multi-cloud connectivity to AWS / Azure via IPsec.",
    ],
    avoidWhen: [
      "Latency- / throughput-sensitive workloads — use [[Cloud-Interconnect|Cloud Interconnect]].",
      "Legacy Classic VPN — HA VPN supersedes it; do not deploy new Classic VPN.",
    ],
    crossRefs: [
      "Cloud equivalents: [[VPN-Gateway|Azure VPN Gateway]] · [[Site-to-Site-VPN|AWS S2S VPN]]",
      "Pairs with: [[Cloud-Router]] · [[Cloud-Interconnect]] · [[BGP-Design]] · [[Hybrid-Failover-Design]]",
    ],
  },
  {
    path: "Services/GCP/Network-Connectivity-Center.md",
    name: "GCP Network Connectivity Center",
    cloud: "gcp",
    category: "networking",
    specialists: ["cn_mcn", "cn_hyb"],
    aliases: ["Network Connectivity Center", "NCC"],
    tags: ["ncc", "hub", "spokes", "transit"],
    summary: "Hub-and-spoke transit service that interconnects VPCs, [[HA-VPN|HA VPN]] tunnels, [[Cloud-Interconnect|Interconnect]] attachments, and third-party SD-WAN appliances under a single managed hub.",
    whenToUse: [
      "Centralising hybrid + multi-VPC routing in GCP without manual mesh.",
      "Integrating third-party SD-WAN appliances (Cisco SD-WAN, Versa, etc.) as router appliance spokes.",
      "Cross-region GCP backbones replacing custom Cloud Router stitching.",
    ],
    avoidWhen: [
      "Single-VPC or 2-VPC deployments — direct VPC peering is simpler.",
    ],
    crossRefs: [
      "Cloud equivalents: [[Virtual-WAN|Azure Virtual WAN]] · [[Cloud-WAN|AWS Cloud WAN]]",
      "Pairs with: [[Cloud-Interconnect]] · [[HA-VPN]] · [[Cloud-Router]] · [[Hub-and-Spoke]] · [[Transit-Hub]]",
    ],
  },
  {
    path: "Services/GCP/Cloud-Router.md",
    name: "GCP Cloud Router",
    cloud: "gcp",
    category: "networking",
    specialists: ["cn_hyb"],
    aliases: ["Cloud Router"],
    tags: ["bgp", "dynamic-routing", "ha-vpn", "interconnect"],
    summary: "Managed BGP speaker that terminates dynamic routing for [[HA-VPN|HA VPN]] and [[Cloud-Interconnect|Cloud Interconnect]] attachments, with regional or global dynamic-routing modes and per-peer custom advertisements.",
    whenToUse: [
      "Anywhere BGP is required for hybrid connectivity in GCP.",
      "Controlling route propagation between hybrid attachments and VPCs via custom advertisements.",
    ],
    avoidWhen: [
      "Static routing only — Cloud Router still needs to exist for the attachment but advertisements are minimal.",
    ],
    crossRefs: [
      "Cloud equivalents: ExpressRoute Gateway BGP · [[Site-to-Site-VPN|AWS VPN]] / [[Direct-Connect|DX]] BGP",
      "Pairs with: [[BGP-Design]] · [[Cloud-Interconnect]] · [[HA-VPN]] · [[Network-Connectivity-Center]]",
    ],
  },
  {
    path: "Services/GCP/Cloud-NAT.md",
    name: "GCP Cloud NAT",
    cloud: "gcp",
    category: "networking",
    specialists: ["cn_vnet", "cn_price"],
    aliases: ["Cloud NAT"],
    tags: ["nat", "egress", "vpc", "ipv4"],
    summary: "Regional managed NAT for IPv4 egress from private VM instances, GKE pods, and Cloud Run / Cloud Functions; provides per-VM port allocation tunable for predictable scale.",
    whenToUse: [
      "Internet egress from private GKE clusters and VMs without public IPs.",
      "Centralised egress IP pool for allow-listing on partner endpoints.",
    ],
    avoidWhen: [
      "Egress to Google APIs — prefer [[Private-Service-Connect|PSC]] or Private Google Access.",
    ],
    crossRefs: [
      "Cloud equivalents: Azure NAT Gateway · [[NAT-Gateway|AWS NAT Gateway]]",
      "Pairs with: [[Egress-Cost-Architecture]] · [[Private-Service-Connect]]",
    ],
  },
  {
    path: "Services/GCP/Cloud-DNS.md",
    name: "GCP Cloud DNS",
    cloud: "gcp",
    category: "networking",
    specialists: ["cn_dns"],
    aliases: ["Cloud DNS"],
    tags: ["dns", "private-zone", "forwarding", "dnssec"],
    summary: "Managed authoritative DNS with public, private, forwarding, and peering zones; DNSSEC for public zones; inbound / outbound DNS server policies for hybrid forwarding.",
    whenToUse: [
      "Authoritative DNS for GCP-hosted domains and VPCs.",
      "Private DNS for VPCs ([[Private-Service-Connect|PSC]] FQDN overlay).",
      "Hybrid DNS forwarding to/from on-premises via DNS server policies.",
    ],
    avoidWhen: [
      "Non-GCP-centric estate — keep authority on existing DNS providers.",
    ],
    crossRefs: [
      "Cloud equivalents: [[Azure-Private-DNS-Zones]] · [[Route-53|AWS Route 53]]",
      "Pairs with: [[DNS-Resolver-Design]] · [[Private-Service-Connect]]",
    ],
  },
  {
    path: "Services/GCP/Cloud-Load-Balancing.md",
    name: "GCP Cloud Load Balancing",
    cloud: "gcp",
    category: "networking",
    specialists: ["cn_lb"],
    aliases: ["Cloud Load Balancing", "GCLB"],
    tags: ["load-balancer", "external", "internal", "global", "regional"],
    summary: "Family of managed load balancers: global external HTTPS (Application LB), regional external / internal HTTPS, external / internal TCP-UDP (Network LB), and proxy-based variants — choice depends on protocol, scope, and IP-preservation needs.",
    whenToUse: [
      "Global anycast HTTPS for public web apps (External Application LB).",
      "Regional internal HTTP / TCP load balancing for internal services and [[Service-Attachment|PSC producers]].",
      "Ultra-low-latency L4 TCP/UDP with the Network Load Balancer family.",
    ],
    avoidWhen: [
      "Don't mix global and regional LBs for the same workload without a clear traffic policy — document which entry point serves which traffic class.",
    ],
    crossRefs: [
      "Cloud equivalents: Azure Application Gateway / Standard LB · [[AWS-Application-Load-Balancer|AWS ALB]] / [[AWS-Network-Load-Balancer|NLB]]",
      "Pairs with: [[Service-Attachment]] · [[Cloud-Armor]] · [[Cloud-CDN]] · [[Health-Probe-Design]]",
    ],
  },
  {
    path: "Services/GCP/Cloud-CDN.md",
    name: "GCP Cloud CDN",
    cloud: "gcp",
    category: "delivery",
    specialists: ["cn_cdn"],
    aliases: ["Cloud CDN"],
    tags: ["cdn", "edge", "cache", "load-balancer"],
    summary: "Edge cache fronting the global external [[Cloud-Load-Balancing|HTTPS Load Balancer]], with cache modes (USE_ORIGIN_HEADERS / FORCE_CACHE_ALL / CACHE_ALL_STATIC), signed URLs / cookies, and negative caching policies.",
    whenToUse: [
      "Public HTTPS workloads behind GCP global HTTPS LB needing edge acceleration.",
      "Origin shielding for Cloud Storage, GKE Ingress, Compute Engine backends.",
    ],
    avoidWhen: [
      "Non-HTTPS or non-GCP-LB origins — use third-party CDN.",
    ],
    crossRefs: [
      "Cloud equivalents: [[CDN-Architecture-Design|Azure Front Door / CDN]] · [[CloudFront|AWS CloudFront]]",
      "Pairs with: [[Cloud-Load-Balancing]] · [[Cloud-Armor]] · [[CDN-Cache-Optimization]] · [[TLS-Certificate-Management]]",
    ],
  },
  {
    path: "Services/GCP/Cloud-Armor.md",
    name: "GCP Cloud Armor",
    cloud: "gcp",
    category: "security",
    specialists: ["cn_nsec", "cn_cdn"],
    aliases: ["Cloud Armor"],
    tags: ["waf", "edge-security", "ddos", "load-balancer"],
    summary: "Edge WAF + DDoS protection for the global / regional external HTTPS [[Cloud-Load-Balancing|Load Balancers]], with preconfigured OWASP rule sets, rate-based rules, bot management (reCAPTCHA Enterprise integration), and adaptive protection.",
    whenToUse: [
      "Edge L7 protection for public HTTPS workloads behind GCP external LBs.",
      "DDoS Protection Plus for internet-facing services.",
    ],
    avoidWhen: [
      "Internal apps — use VPC firewall rules / [[GCP-Cloud-Firewall|Cloud Firewall]] instead.",
    ],
    crossRefs: [
      "Cloud equivalents: Azure Web Application Firewall · [[AWS-WAF]]",
      "Pairs with: [[WAF-Rules-Configuration]] · [[WAF-Policy-Design]] · [[Cloud-Load-Balancing]] · [[Cloud-CDN]]",
    ],
  },
];

function fm(s) {
  const aliases = s.aliases.map((a) => `"${a}"`).join(", ");
  const specialists = s.specialists.map((a) => `"${a}"`).join(", ");
  const tags = s.tags.map((a) => `"${a}"`).join(", ");
  return [
    "---",
    "type: service",
    `name: ${s.name}`,
    `cloud: ${s.cloud}`,
    `category: ${s.category}`,
    `specialists: [${specialists}]`,
    `aliases: [${aliases}]`,
    `tags: [${tags}]`,
    "status: stub",
    `updated: ${TODAY}`,
    "---",
  ].join("\n");
}

function bullets(items) {
  return items.map((i) => `- ${i}`).join("\n");
}

function body(s) {
  const sections = [];
  sections.push(`# ${s.name}`);
  sections.push("");
  sections.push(s.summary);
  sections.push("");
  sections.push("## When to use");
  sections.push("");
  sections.push(bullets(s.whenToUse));
  if (s.avoidWhen && s.avoidWhen.length) {
    sections.push("");
    sections.push("## When to avoid");
    sections.push("");
    sections.push(bullets(s.avoidWhen));
  }
  sections.push("");
  sections.push("## Cross-references");
  sections.push("");
  sections.push(bullets(s.crossRefs));
  sections.push("");
  sections.push("**Analysis only — verify against vendor documentation before applying.**");
  return sections.join("\n");
}

let created = 0;
let skipped = 0;
for (const s of STUBS) {
  const full = join(VAULT, s.path);
  if (existsSync(full)) {
    console.log(`skip (exists): ${s.path}`);
    skipped++;
    continue;
  }
  mkdirSync(dirname(full), { recursive: true });
  const content = `${fm(s)}\n${body(s)}\n`;
  writeFileSync(full, content, { encoding: "utf8" });
  console.log(`created: ${s.path}  (${content.length} B)`);
  created++;
}
console.log(`\nDone. created=${created} skipped=${skipped} total=${STUBS.length}`);
