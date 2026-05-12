// Extension: cloud-networking (standalone)
// Self-contained cloud networking agent that bundles all 11 specialist
// roles and skills. No external extension dependencies required.
//
// Specialists: vnet-architect, firewall-engineer, load-balancer,
// dns-specialist, private-link, hybrid-connectivity, network-security,
// network-troubleshooter, vwan-sdwan, network-monitor, multi-cloud-net

import { joinSession } from "@github/copilot-sdk/extension";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SPECIALISTS = join(HERE, "specialists");

// ── File loaders ───────────────────────────────────────────────────────

async function loadFile(path) {
    try {
        return await readFile(path, "utf8");
    } catch (err) {
        return { textResultForLlm: `Failed to load: ${err.message}`, resultType: "failure" };
    }
}

function roleLoader(specialist) {
    return async () => loadFile(join(SPECIALISTS, specialist, "agents", `${specialist}.md`));
}

function skillLoader(specialist, skillName) {
    return async () => loadFile(join(SPECIALISTS, specialist, "skills", skillName, "SKILL.md"));
}

// ── Tool builder helpers ───────────────────────────────────────────────

function roleTool(name, description, loader) {
    return { name, description, parameters: { type: "object", properties: {} }, skipPermission: true, handler: loader };
}

function orchestratorTool(name, description, prompt) {
    return { name, description, parameters: { type: "object", properties: {} }, skipPermission: true, handler: async () => prompt };
}

function skillTool(name, description, loader) {
    return { name, description, parameters: { type: "object", properties: {} }, skipPermission: true, handler: loader };
}

// ── Orchestrator prompts ───────────────────────────────────────────────

const ORCHESTRATORS = {
    vnet: `You are now operating as the **vnet-architect** agent.
Call \`vnet_role\` first, then use: vnet_skill_address_planner, vnet_skill_hub_spoke_design, vnet_skill_peering_advisor, vnet_skill_subnet_calculator, vnet_skill_network_diagram, vnet_skill_migration_planner.
Cover Azure VNets, AWS VPCs, and GCP VPCs. Cite cloud provider documentation.`,

    fw: `You are now operating as the **firewall-engineer** agent.
Call \`fw_role\` first, then use: fw_skill_rule_audit, fw_skill_policy_design, fw_skill_vendor_migrate, fw_skill_config_gen, fw_skill_hardening_check, fw_skill_ha_design, fw_skill_log_analysis, fw_skill_troubleshoot.
Covers 14 vendor platforms: Azure Firewall, AWS Network Firewall, GCP Cloud Firewall, Palo Alto, FortiGate, Check Point, Cisco ASA/FTD, Juniper SRX, Zscaler, Sophos XG, OPNsense, pfSense, VyOS, iptables/nftables. Analysis only — never apply changes without confirmation.`,

    lb: `You are now operating as the **load-balancer** agent.
Call \`lb_role\` first, then use: lb_skill_lb_selector, lb_skill_health_probe_design, lb_skill_ssl_offload, lb_skill_waf_rules, lb_skill_traffic_routing, lb_skill_troubleshoot.
Covers Azure LB/App Gateway/Front Door, AWS ALB/NLB/GLB, GCP LB.`,

    dns: `You are now operating as the **dns-specialist** agent.
Call \`dns_role\` first, then use: dns_skill_zone_design, dns_skill_resolver_design, dns_skill_record_audit, dns_skill_migration_plan, dns_skill_troubleshoot.
Covers Azure DNS, AWS Route 53, GCP Cloud DNS, and hybrid DNS resolution.`,

    pl: `You are now operating as the **private-link** agent.
Call \`pl_role\` first, then use: pl_skill_endpoint_design, pl_skill_dns_integration, pl_skill_service_exposure, pl_skill_security_review, pl_skill_troubleshoot.
Covers Azure Private Link/Endpoints, AWS PrivateLink, GCP Private Service Connect.`,

    hyb: `You are now operating as the **hybrid-connectivity** agent.
Call \`hyb_role\` first, then use: hyb_skill_vpn_design, hyb_skill_expressroute_design, hyb_skill_bandwidth_calc, hyb_skill_routing_design, hyb_skill_failover_design, hyb_skill_troubleshoot.
Covers ExpressRoute, VPN gateways, AWS Direct Connect, GCP Cloud Interconnect.`,

    nsec: `You are now operating as the **network-security** agent.
Call \`nsec_role\` first, then use: nsec_skill_nsg_audit, nsec_skill_segmentation_design, nsec_skill_ddos_design, nsec_skill_flow_analysis, nsec_skill_compliance_check, nsec_skill_troubleshoot.
Covers NSGs, security groups, DDoS protection, micro-segmentation across all clouds.`,

    ntsh: `You are now operating as the **network-troubleshooter** agent.
Call \`ntsh_role\` first, then use: ntsh_skill_connectivity_test, ntsh_skill_packet_capture, ntsh_skill_latency_analysis, ntsh_skill_routing_debug, ntsh_skill_nat_debug, ntsh_skill_mtu_path_discovery.
Uses Network Watcher, VPC Reachability Analyzer, and standard diagnostic tools.`,

    vwan: `You are now operating as the **vwan-sdwan** agent.
Call \`vwan_role\` first, then use: vwan_skill_vwan_design, vwan_skill_routing_intent, vwan_skill_nva_integration, vwan_skill_branch_connectivity, vwan_skill_troubleshoot.
Covers Azure Virtual WAN hubs, routing intent, and SD-WAN partner integrations.`,

    nmon: `You are now operating as the **network-monitor** agent.
Call \`nmon_role\` first, then use: nmon_skill_flow_log_setup, nmon_skill_traffic_analytics, nmon_skill_connection_monitor, nmon_skill_alert_design, nmon_skill_dashboard_build, nmon_skill_baseline_analysis.
Covers flow logs, traffic analytics, connection monitors, and alerting across all clouds.`,

    mcn: `You are now operating as the **multi-cloud-net** agent.
Call \`mcn_role\` first, then use: mcn_skill_transit_design, mcn_skill_addressing_plan, mcn_skill_service_mapping, mcn_skill_latency_optimization, mcn_skill_cost_comparison.
Covers cross-cloud connectivity architectures, service equivalency mapping, and cost analysis.`,
};

// ── Routing table ──────────────────────────────────────────────────────

const ROUTES = [
    { domain: "VNet/Subnet Architecture", prefix: "vnet", trigger: /\b(VNet|VPC|virtual\s+network|subnet|address\s+(space|plan)|CIDR|hub[-\s]?spoke|peering|network\s+(design|topology|diagram)|IP\s+plan)/i },
    { domain: "Firewall Engineering", prefix: "fw", trigger: /\b(firewall|FW\s+(rule|policy)|PAN[-\s]?OS|FortiGate|FortiOS|Check\s*Point|CloudGuard|ASA|FTD|Firepower|SRX|Zscaler|ZIA|ZPA|Sophos\s+XG|Azure\s+Firewall|AWS\s+Network\s+Firewall|Cloud\s+Armor|WAF\s+rule|rule\s+audit|firewall\s+policy|NGFW|network\s+virtual\s+appliance|NVA\s+firewall|OPNsense|pfSense|VyOS|iptables|nftables|netfilter)/i },
    { domain: "Load Balancing", prefix: "lb", trigger: /\b(load\s+balanc|ALB|NLB|GLB|App(lication)?\s+Gateway|Front\s+Door|Traffic\s+Manager|health\s+probe|backend\s+pool|SNAT\s+exhaust|SSL\s+offload|L[47]\s+balanc|ingress\s+controller)/i },
    { domain: "DNS", prefix: "dns", trigger: /\b(DNS|domain\s+name|name\s+resolution|Route\s*53|Cloud\s+DNS|Private\s+DNS|DNS\s+(zone|resolver|forward|record|migration)|split[-\s]?horizon|conditional\s+forward)/i },
    { domain: "Private Link / Endpoints", prefix: "pl", trigger: /\b(Private\s+(Link|Endpoint|Service\s+Connect)|PSC|service\s+endpoint|PE\s+(subnet|DNS)|PrivateLink)/i },
    { domain: "Hybrid Connectivity", prefix: "hyb", trigger: /\b(ExpressRoute|Direct\s+Connect|Cloud\s+Interconnect|S2S\s+VPN|P2S\s+VPN|site[-\s]?to[-\s]?site|point[-\s]?to[-\s]?site|VPN\s+gateway|IPsec|IKEv[12]|BGP\s+(peer|neighbor|session)|hybrid\s+(connect|network))/i },
    { domain: "Network Security", prefix: "nsec", trigger: /\b(NSG|network\s+security\s+group|security\s+group|ASG|DDoS|micro[-\s]?segment|zero[-\s]?trust\s+network|flow\s+log\s+(analys|secur)|network\s+compliance|CIS\s+bench|network\s+segmentation)/i },
    { domain: "Network Troubleshooting", prefix: "ntsh", trigger: /\b(troubleshoot|packet\s+capture|traceroute|Network\s+Watcher|IP\s+flow\s+verify|connection\s+troubleshoot|latency\s+(issue|analys|spike)|routing\s+(table|debug|issue)|MTU|SNAT\s+port|NAT\s+(gateway|debug|issue)|Reachability\s+Analyzer)/i },
    { domain: "Virtual WAN / SD-WAN", prefix: "vwan", trigger: /\b(Virtual\s+WAN|vWAN|VWAN|routing\s+intent|secured\s+hub|SD[-\s]?WAN|inter[-\s]?hub|vWAN\s+hub)/i },
    { domain: "Network Monitoring", prefix: "nmon", trigger: /\b(network\s+monitor|Connection\s+Monitor|traffic\s+analytics|flow\s+log|network\s+(alert|dashboard|baseline|observ)|NSG\s+flow|VPC\s+flow|network\s+metric)/i },
    { domain: "Multi-Cloud Networking", prefix: "mcn", trigger: /\b(multi[-\s]?cloud\s+(network|connect|transit)|cross[-\s]?cloud|cloud[-\s]?to[-\s]?cloud|transit\s+(architecture|design)|cloud\s+interconnect\s+design|service\s+mapping\s+(across|between)\s+cloud)/i },
];

// ── Build capabilities summary ─────────────────────────────────────────

function buildCapabilitiesSummary() {
    return `# Cloud Networking — Available Specialists

| # | Domain | Prefix | Role Tool | Orchestrator |
|---|--------|--------|-----------|-------------|
| 1 | VNet/Subnet Architecture | vnet_ | vnet_role | vnet_orchestrate |
| 2 | Firewall Engineering | fw_ | fw_role | fw_orchestrate |
| 3 | Load Balancing | lb_ | lb_role | lb_orchestrate |
| 4 | DNS | dns_ | dns_role | dns_orchestrate |
| 5 | Private Link / Endpoints | pl_ | pl_role | pl_orchestrate |
| 6 | Hybrid Connectivity | hyb_ | hyb_role | hyb_orchestrate |
| 7 | Network Security | nsec_ | nsec_role | nsec_orchestrate |
| 8 | Network Troubleshooting | ntsh_ | ntsh_role | ntsh_orchestrate |
| 9 | Virtual WAN / SD-WAN | vwan_ | vwan_role | vwan_orchestrate |
| 10 | Network Monitoring | nmon_ | nmon_role | nmon_orchestrate |
| 11 | Multi-Cloud Networking | mcn_ | mcn_role | mcn_orchestrate |

## Firewall Vendor Coverage
Azure Firewall, AWS Network Firewall, GCP Cloud Firewall/Cloud Armor, Palo Alto (PAN-OS/Panorama/VM-Series/Prisma), Fortinet FortiGate (FortiOS/FortiManager), Check Point (R81+/SmartConsole/CloudGuard), Cisco ASA/FTD, Juniper SRX/vSRX, Zscaler (ZIA/ZPA), Sophos XG/XGS, OPNsense, pfSense, VyOS, iptables/nftables

## How to use
1. Call the **role tool** (e.g. \`vnet_role\`) to load the specialist.
2. Call \`*_orchestrate\` for step-by-step guidance.
3. Call individual \`*_skill_*\` tools as you work.
Use \`cn_route\` to find the right specialist for a query.`;
}

function routeQuery(query) {
    const matches = ROUTES.filter((r) => r.trigger.test(query));
    if (matches.length === 0) {
        return "No specialist matched. Call `cn_capabilities` for the full map.\nAvailable: " +
            ROUTES.map((r) => r.domain).join(", ");
    }
    const lines = [`Matched ${matches.length} specialist(s):\n`];
    for (const m of matches) {
        lines.push(`### ${m.domain}`);
        lines.push(`- Role: \`${m.prefix}_role\`  |  Orchestrate: \`${m.prefix}_orchestrate\``);
        lines.push("");
    }
    lines.push("**Next:** Call the role tool, then follow the orchestrator workflow.");
    return lines.join("\n");
}

// ── Register ALL tools ─────────────────────────────────────────────────

const tools = [
    // ── Discovery tools ──
    {
        name: "cn_capabilities",
        description: "Returns a structured map of all 11 cloud networking specialist extensions, their role tools, and available skills. Use when you need to discover what networking capabilities are available.",
        parameters: { type: "object", properties: {} },
        skipPermission: true,
        handler: async () => buildCapabilitiesSummary(),
    },
    {
        name: "cn_route",
        description: "Given a cloud networking query, returns the recommended specialist extension(s) to use along with the tools to call. Use when unsure which specialist handles a request.",
        parameters: {
            type: "object",
            properties: { query: { type: "string", description: "The user's networking query or task description" } },
            required: ["query"],
        },
        skipPermission: true,
        handler: async (args) => routeQuery(args.query),
    },

    // ── 1. VNet/Subnet Architect ──
    roleTool("vnet_role",
        "Load the vnet-architect agent role and workflow for virtual network design across Azure, AWS, and GCP. Call this first when handling network architecture requests.",
        roleLoader("vnet-architect")),
    orchestratorTool("vnet_orchestrate",
        "Return the orchestration prompt for the VNet Architect agent. Use for VNet/VPC design, hub-spoke, peering, address planning.",
        ORCHESTRATORS.vnet),
    skillTool("vnet_skill_address_planner", "Skill: IP address space planning — CIDR allocation, subnet sizing, supernetting, overlap avoidance across environments.",
        skillLoader("vnet-architect", "address-planner")),
    skillTool("vnet_skill_hub_spoke_design", "Skill: Hub-spoke topology design with peering, transit, and shared services.",
        skillLoader("vnet-architect", "hub-spoke-design")),
    skillTool("vnet_skill_peering_advisor", "Skill: VNet/VPC peering configuration, transitive routing analysis, peering limits.",
        skillLoader("vnet-architect", "peering-advisor")),
    skillTool("vnet_skill_subnet_calculator", "Skill: Subnet math — CIDR splits, available IPs, reserved addresses per cloud provider.",
        skillLoader("vnet-architect", "subnet-calculator")),
    skillTool("vnet_skill_network_diagram", "Skill: Generate Mermaid network topology diagrams from infrastructure descriptions.",
        skillLoader("vnet-architect", "network-diagram")),
    skillTool("vnet_skill_migration_planner", "Skill: Plan network migrations — on-prem to cloud, cloud-to-cloud address space.",
        skillLoader("vnet-architect", "migration-planner")),

    // ── 2. Firewall Engineer ──
    roleTool("fw_role",
        "Load the firewall-engineer agent role for multi-vendor firewall analysis. Covers 14 platforms including OPNsense, pfSense, VyOS, iptables. Call this first for any firewall request.",
        roleLoader("firewall-engineer")),
    orchestratorTool("fw_orchestrate",
        "Return the orchestration prompt for the Firewall Engineer agent. Use for firewall rule analysis, policy design, vendor migration, config generation.",
        ORCHESTRATORS.fw),
    skillTool("fw_skill_rule_audit", "Skill: Audit firewall rules for shadow rules, overly permissive entries, unused rules, hit-count analysis. Multi-vendor.",
        skillLoader("firewall-engineer", "rule-audit")),
    skillTool("fw_skill_policy_design", "Skill: Design firewall policies from requirements — zone-based, app-aware, or L3/L4. Multi-vendor.",
        skillLoader("firewall-engineer", "policy-design")),
    skillTool("fw_skill_vendor_migrate", "Skill: Migrate firewall rules between vendor platforms (e.g., PAN-OS → FortiGate, ASA → Azure Firewall).",
        skillLoader("firewall-engineer", "vendor-migrate")),
    skillTool("fw_skill_config_gen", "Skill: Generate vendor-specific firewall configuration from a policy intent description.",
        skillLoader("firewall-engineer", "config-gen")),
    skillTool("fw_skill_hardening_check", "Skill: Security hardening checklist per vendor best practices.",
        skillLoader("firewall-engineer", "hardening-check")),
    skillTool("fw_skill_ha_design", "Skill: Firewall high-availability design per vendor — active/passive, active/active, clustering.",
        skillLoader("firewall-engineer", "ha-design")),
    skillTool("fw_skill_log_analysis", "Skill: Parse and analyze firewall logs (syslog, CEF, LEEF) for security events.",
        skillLoader("firewall-engineer", "log-analysis")),
    skillTool("fw_skill_troubleshoot", "Skill: Troubleshoot firewall connectivity — packet flow, NAT, routing, policy lookup. Multi-vendor.",
        skillLoader("firewall-engineer", "troubleshoot")),

    // ── 3. Load Balancer ──
    roleTool("lb_role",
        "Load the load-balancer agent role for traffic distribution across all three clouds. Call this first for LB requests.",
        roleLoader("load-balancer")),
    orchestratorTool("lb_orchestrate",
        "Return the orchestration prompt for the Load Balancer agent. Use for LB selection, health probes, SSL offload, WAF, traffic routing.",
        ORCHESTRATORS.lb),
    skillTool("lb_skill_lb_selector", "Skill: Recommend the right LB type (L4 vs L7, regional vs global, internal vs public) based on requirements.",
        skillLoader("load-balancer", "lb-selector")),
    skillTool("lb_skill_health_probe_design", "Skill: Design health probe strategies — intervals, thresholds, custom probes, grace periods.",
        skillLoader("load-balancer", "health-probe-design")),
    skillTool("lb_skill_ssl_offload", "Skill: TLS/SSL termination design — cert management, cipher suites, end-to-end encryption.",
        skillLoader("load-balancer", "ssl-offload")),
    skillTool("lb_skill_waf_rules", "Skill: WAF rule configuration — OWASP rulesets, custom rules, exclusions, tuning.",
        skillLoader("load-balancer", "waf-rules")),
    skillTool("lb_skill_traffic_routing", "Skill: Traffic routing methods — weighted, priority, geographic, latency-based, session affinity.",
        skillLoader("load-balancer", "traffic-routing")),
    skillTool("lb_skill_troubleshoot", "Skill: Troubleshoot LB issues — backend health, asymmetric routing, SNAT exhaustion, 502/504 errors.",
        skillLoader("load-balancer", "troubleshoot")),

    // ── 4. DNS Specialist ──
    roleTool("dns_role",
        "Load the dns-specialist agent role for DNS architecture across hybrid and multi-cloud environments. Call this first for DNS requests.",
        roleLoader("dns-specialist")),
    orchestratorTool("dns_orchestrate",
        "Return the orchestration prompt for the DNS Specialist agent. Use for DNS zone design, resolver config, record audits, migrations.",
        ORCHESTRATORS.dns),
    skillTool("dns_skill_zone_design", "Skill: DNS zone architecture — public vs private, split-horizon, zone delegation.",
        skillLoader("dns-specialist", "zone-design")),
    skillTool("dns_skill_resolver_design", "Skill: DNS resolver/forwarder topology — conditional forwarding, DNS Private Resolver, Route 53 Resolver.",
        skillLoader("dns-specialist", "resolver-design")),
    skillTool("dns_skill_record_audit", "Skill: Audit DNS records for stale entries, misconfigurations, TTL issues.",
        skillLoader("dns-specialist", "record-audit")),
    skillTool("dns_skill_migration_plan", "Skill: Plan DNS migrations — zone transfers, cutover strategies, TTL lowering.",
        skillLoader("dns-specialist", "migration-plan")),
    skillTool("dns_skill_troubleshoot", "Skill: Troubleshoot DNS resolution — nslookup/dig analysis, forwarding chain tracing.",
        skillLoader("dns-specialist", "troubleshoot")),

    // ── 5. Private Link Engineer ──
    roleTool("pl_role",
        "Load the private-link agent role for private connectivity to PaaS/SaaS services. Call this first for Private Link/Endpoint requests.",
        roleLoader("private-link")),
    orchestratorTool("pl_orchestrate",
        "Return the orchestration prompt for the Private Link Engineer agent. Use for private endpoint design, DNS integration, service exposure.",
        ORCHESTRATORS.pl),
    skillTool("pl_skill_endpoint_design", "Skill: Private endpoint architecture — subnet placement, DNS integration, approval workflows.",
        skillLoader("private-link", "endpoint-design")),
    skillTool("pl_skill_dns_integration", "Skill: Private DNS zone configuration for private endpoints — zone linking, A record management.",
        skillLoader("private-link", "dns-integration")),
    skillTool("pl_skill_service_exposure", "Skill: Expose services via Private Link Service / AWS PrivateLink / GCP PSC.",
        skillLoader("private-link", "service-exposure")),
    skillTool("pl_skill_security_review", "Skill: Review private endpoint security — NSG on PE subnets, network policies, access controls.",
        skillLoader("private-link", "security-review")),
    skillTool("pl_skill_troubleshoot", "Skill: Troubleshoot PE connectivity — DNS resolution, NSG blocks, approval state.",
        skillLoader("private-link", "troubleshoot")),

    // ── 6. Hybrid Connectivity ──
    roleTool("hyb_role",
        "Load the hybrid-connectivity agent role for hybrid and cross-premises networking. Call this first for VPN/ExpressRoute/Direct Connect requests.",
        roleLoader("hybrid-connectivity")),
    orchestratorTool("hyb_orchestrate",
        "Return the orchestration prompt for the Hybrid Connectivity agent. Use for VPN, ExpressRoute, Direct Connect, Cloud Interconnect design.",
        ORCHESTRATORS.hyb),
    skillTool("hyb_skill_vpn_design", "Skill: VPN gateway design — S2S, P2S, IKEv2/OpenVPN, BGP, active-active, custom IPsec policies.",
        skillLoader("hybrid-connectivity", "vpn-design")),
    skillTool("hyb_skill_expressroute_design", "Skill: ExpressRoute / Direct Connect / Cloud Interconnect circuit design, peering, and routing.",
        skillLoader("hybrid-connectivity", "expressroute-design")),
    skillTool("hyb_skill_bandwidth_calc", "Skill: Bandwidth planning — circuit sizing, aggregation, QoS, and cost estimation.",
        skillLoader("hybrid-connectivity", "bandwidth-calc")),
    skillTool("hyb_skill_routing_design", "Skill: BGP routing design — AS path manipulation, route filters, communities, local preference.",
        skillLoader("hybrid-connectivity", "routing-design")),
    skillTool("hyb_skill_failover_design", "Skill: Redundancy and failover — dual circuits, VPN backup, BFD, fast convergence.",
        skillLoader("hybrid-connectivity", "failover-design")),
    skillTool("hyb_skill_troubleshoot", "Skill: Troubleshoot hybrid connectivity — BGP neighbor state, tunnel status, MTU issues, asymmetric routing.",
        skillLoader("hybrid-connectivity", "troubleshoot")),

    // ── 7. Network Security ──
    roleTool("nsec_role",
        "Load the network-security agent role for security posture and segmentation. Call this first for NSG/DDoS/segmentation requests.",
        roleLoader("network-security")),
    orchestratorTool("nsec_orchestrate",
        "Return the orchestration prompt for the Network Security agent. Use for NSG audits, segmentation, DDoS, compliance checks.",
        ORCHESTRATORS.nsec),
    skillTool("nsec_skill_nsg_audit", "Skill: Audit NSG/Security Group rules — overly permissive, unused, conflicting, priority gaps.",
        skillLoader("network-security", "nsg-audit")),
    skillTool("nsec_skill_segmentation_design", "Skill: Network segmentation strategy — micro-segmentation, zero-trust network access.",
        skillLoader("network-security", "segmentation-design")),
    skillTool("nsec_skill_ddos_design", "Skill: DDoS protection design — Azure DDoS Protection, AWS Shield, GCP Cloud Armor.",
        skillLoader("network-security", "ddos-design")),
    skillTool("nsec_skill_flow_analysis", "Skill: Analyze NSG/VPC flow logs for security patterns, anomalies, top talkers.",
        skillLoader("network-security", "flow-analysis")),
    skillTool("nsec_skill_compliance_check", "Skill: Check network config against compliance frameworks (CIS, NIST, PCI-DSS network controls).",
        skillLoader("network-security", "compliance-check")),
    skillTool("nsec_skill_troubleshoot", "Skill: Troubleshoot network security — blocked traffic, effective rules, IP flow verify.",
        skillLoader("network-security", "troubleshoot")),

    // ── 8. Network Troubleshooter ──
    roleTool("ntsh_role",
        "Load the network-troubleshooter agent role for diagnostics and debugging. Call this first for any connectivity/latency/routing issue.",
        roleLoader("network-troubleshooter")),
    orchestratorTool("ntsh_orchestrate",
        "Return the orchestration prompt for the Network Troubleshooter agent. Use for connectivity tests, packet captures, routing debug.",
        ORCHESTRATORS.ntsh),
    skillTool("ntsh_skill_connectivity_test", "Skill: Connectivity testing strategy — TCP/ICMP probes, traceroute, Network Watcher tools.",
        skillLoader("network-troubleshooter", "connectivity-test")),
    skillTool("ntsh_skill_packet_capture", "Skill: Packet capture analysis — capture setup, Wireshark filter generation, protocol analysis.",
        skillLoader("network-troubleshooter", "packet-capture")),
    skillTool("ntsh_skill_latency_analysis", "Skill: Latency troubleshooting — hop-by-hop analysis, RTT baselines, jitter measurement.",
        skillLoader("network-troubleshooter", "latency-analysis")),
    skillTool("ntsh_skill_routing_debug", "Skill: Routing table analysis — effective routes, UDR conflicts, BGP route propagation.",
        skillLoader("network-troubleshooter", "routing-debug")),
    skillTool("ntsh_skill_nat_debug", "Skill: NAT troubleshooting — SNAT port exhaustion, DNAT rules, NAT gateway logs.",
        skillLoader("network-troubleshooter", "nat-debug")),
    skillTool("ntsh_skill_mtu_path_discovery", "Skill: MTU/MSS troubleshooting — path MTU discovery, fragmentation, jumbo frames.",
        skillLoader("network-troubleshooter", "mtu-path-discovery")),

    // ── 9. Virtual WAN / SD-WAN ──
    roleTool("vwan_role",
        "Load the vwan-sdwan agent role for Azure Virtual WAN and SD-WAN integration. Call this first for vWAN/SD-WAN requests.",
        roleLoader("vwan-sdwan")),
    orchestratorTool("vwan_orchestrate",
        "Return the orchestration prompt for the Virtual WAN/SD-WAN agent. Use for vWAN design, routing intent, NVA integration.",
        ORCHESTRATORS.vwan),
    skillTool("vwan_skill_vwan_design", "Skill: Virtual WAN topology design — hubs, connections, secured hubs, inter-hub routing.",
        skillLoader("vwan-sdwan", "vwan-design")),
    skillTool("vwan_skill_routing_intent", "Skill: Routing intent and routing policies — internet traffic, private traffic, inter-hub.",
        skillLoader("vwan-sdwan", "routing-intent")),
    skillTool("vwan_skill_nva_integration", "Skill: NVA integration in vWAN — BGP peering, managed appliances, SD-WAN partners.",
        skillLoader("vwan-sdwan", "nva-integration")),
    skillTool("vwan_skill_branch_connectivity", "Skill: Branch connectivity — S2S VPN, P2S, ExpressRoute to vWAN.",
        skillLoader("vwan-sdwan", "branch-connectivity")),
    skillTool("vwan_skill_troubleshoot", "Skill: Troubleshoot vWAN — effective routes, connection state, hub routing.",
        skillLoader("vwan-sdwan", "troubleshoot")),

    // ── 10. Network Monitor ──
    roleTool("nmon_role",
        "Load the network-monitor agent role for observability and monitoring. Call this first for flow logs, traffic analytics, alerting requests.",
        roleLoader("network-monitor")),
    orchestratorTool("nmon_orchestrate",
        "Return the orchestration prompt for the Network Monitor agent. Use for flow logs, traffic analytics, connection monitors, dashboards.",
        ORCHESTRATORS.nmon),
    skillTool("nmon_skill_flow_log_setup", "Skill: Flow log configuration — NSG flow logs, VPC flow logs, storage/Log Analytics setup.",
        skillLoader("network-monitor", "flow-log-setup")),
    skillTool("nmon_skill_traffic_analytics", "Skill: Traffic analytics setup and query — top talkers, geo distribution, malicious IPs.",
        skillLoader("network-monitor", "traffic-analytics")),
    skillTool("nmon_skill_connection_monitor", "Skill: Connection monitor design — test groups, endpoints, alerting thresholds.",
        skillLoader("network-monitor", "connection-monitor")),
    skillTool("nmon_skill_alert_design", "Skill: Network alerting strategy — metric alerts, log alerts, action groups, escalation.",
        skillLoader("network-monitor", "alert-design")),
    skillTool("nmon_skill_dashboard_build", "Skill: Network monitoring dashboard — KQL queries, Azure Monitor workbooks, CloudWatch.",
        skillLoader("network-monitor", "dashboard-build")),
    skillTool("nmon_skill_baseline_analysis", "Skill: Network baseline analysis — normal traffic patterns, anomaly detection.",
        skillLoader("network-monitor", "baseline-analysis")),

    // ── 11. Multi-Cloud Networking ──
    roleTool("mcn_role",
        "Load the multi-cloud-net agent role for cross-cloud and multi-cloud networking. Call this first for multi-cloud connectivity requests.",
        roleLoader("multi-cloud-net")),
    orchestratorTool("mcn_orchestrate",
        "Return the orchestration prompt for the Multi-Cloud Networking agent. Use for cross-cloud transit, addressing, service mapping.",
        ORCHESTRATORS.mcn),
    skillTool("mcn_skill_transit_design", "Skill: Multi-cloud transit architecture — VPN mesh, cloud-native interconnects, NVA transit.",
        skillLoader("multi-cloud-net", "transit-design")),
    skillTool("mcn_skill_addressing_plan", "Skill: Cross-cloud IP address plan — non-overlapping CIDR, summarization, NAT strategies.",
        skillLoader("multi-cloud-net", "addressing-plan")),
    skillTool("mcn_skill_service_mapping", "Skill: Map networking services across clouds (Azure VNet ↔ AWS VPC ↔ GCP VPC).",
        skillLoader("multi-cloud-net", "service-mapping")),
    skillTool("mcn_skill_latency_optimization", "Skill: Cross-cloud latency optimization — peering locations, backbone routing, CDN.",
        skillLoader("multi-cloud-net", "latency-optimization")),
    skillTool("mcn_skill_cost_comparison", "Skill: Network cost comparison across clouds — egress, peering, VPN, interconnect pricing.",
        skillLoader("multi-cloud-net", "cost-comparison")),
];

// ── Register session ───────────────────────────────────────────────────

const session = await joinSession({
    tools,
    hooks: {
        onUserPromptSubmitted: async (input) => {
            if (!input?.prompt) return;
            const matches = ROUTES.filter((r) => r.trigger.test(input.prompt));
            if (matches.length === 0) return;

            const guidance = matches
                .map((m) => `• **${m.domain}** → \`${m.prefix}_role\` then \`${m.prefix}_orchestrate\``)
                .join("\n");

            return {
                additionalContext:
                    `[cloud-networking] Detected networking intent. Route to:\n${guidance}\n\n` +
                    `Call the role tool first, then orchestrate, then skills. ` +
                    `Call \`cn_capabilities\` for the full specialist map.`,
            };
        },
    },
});

await session.log(
    "cloud-networking loaded — 11 specialists, 89 tools, fully standalone (cn_capabilities, cn_route)",
);
