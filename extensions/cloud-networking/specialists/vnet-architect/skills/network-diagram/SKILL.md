# Skill: Network Diagram Generation

## Purpose

This skill generates Mermaid flowchart diagrams from network topology descriptions. It defines standard node shapes, labeling conventions, and reusable templates for common cloud network architectures.

## Core Knowledge

### Standard Node Shapes

Use consistent Mermaid shapes to represent network components:

| Component | Mermaid Shape | Syntax | Example |
|-----------|--------------|--------|---------|
| VNet / VPC | Subgraph | `subgraph id["Label"]` | `subgraph hub["Hub VNet (10.0.0.0/16)"]` |
| Subnet | Rectangle | `id["Label"]` | `web["Web Subnet 10.1.1.0/24"]` |
| Firewall / NVA | Trapezoid | `id[/"Label"\]` | `fw[/"Azure Firewall 10.0.1.4"\]` |
| Gateway | Hexagon | `id{{"Label"}}` | `gw{{"VPN Gateway 10.0.255.4"}}` |
| Load Balancer | Stadium | `id(["Label"])` | `lb(["ALB - Web Tier"])` |
| On-Premises | Cylinder | `id[("Label")]` | `onprem[("On-Prem DC 192.168.0.0/16")]` |
| Internet | Circle | `id(("Label"))` | `inet(("Internet"))` |
| VM / Instance | Rectangle | `id["Label"]` | `vm1["Web VM 10.1.1.10"]` |

### Connection Types

| Connection | Mermaid Syntax | Use For |
|------------|---------------|---------|
| VNet/VPC Peering | `A <-->|"VNet Peering"| B` | Bidirectional peering |
| VPN Tunnel | `A -.-|"S2S VPN / IPsec"| B` | Encrypted tunnel (dashed line) |
| ExpressRoute / Direct Connect | `A ===|"ExpressRoute"| B` | Dedicated private connection (thick line) |
| Traffic flow (one-way) | `A -->|"HTTPS"| B` | Directed traffic |
| Route / UDR | `A -.->|"UDR 0.0.0.0/0"| B` | Route pointing to next hop (dashed arrow) |

### Labeling Conventions

1. **Always include CIDR ranges** in VNet/VPC and subnet labels: `"Web Subnet 10.1.1.0/24"`
2. **Include IP addresses** for key appliances: `"Azure Firewall 10.0.1.4"`
3. **Label connections** with the type and protocol: `|"VNet Peering"|`, `|"S2S VPN"|`
4. **Use region annotations** for multi-region diagrams: include region in the subgraph title
5. **Color coding** (where supported): use `style` directives for hub (blue), prod (green), dev (orange)

### Template: Hub-Spoke Topology

```mermaid
graph TB
    subgraph hub["Hub VNet (10.0.0.0/16) - East US"]
        fw[/"Azure Firewall<br/>10.0.1.0/26"\]
        gw{{"VPN Gateway<br/>10.0.255.0/27"}}
        bastion["Bastion<br/>10.0.2.0/26"]
        dns["DNS Resolver<br/>10.0.3.0/28"]
    end

    subgraph spoke1["Spoke-Prod (10.1.0.0/16)"]
        web1["Web Tier<br/>10.1.1.0/24"]
        app1["App Tier<br/>10.1.2.0/24"]
        db1["Data Tier<br/>10.1.3.0/24"]
    end

    subgraph spoke2["Spoke-Dev (10.2.0.0/16)"]
        dev["Dev Workloads<br/>10.2.0.0/20"]
    end

    hub <-->|"VNet Peering"| spoke1
    hub <-->|"VNet Peering"| spoke2
    gw -.-|"S2S VPN"| onprem[("On-Premises<br/>192.168.0.0/16")]
    fw -->|"Egress"| inet(("Internet"))

    spoke1 -.->|"UDR → 10.0.1.4"| fw
    spoke2 -.->|"UDR → 10.0.1.4"| fw

    style hub fill:#e6f3ff,stroke:#0078d4
    style spoke1 fill:#e6ffe6,stroke:#28a745
    style spoke2 fill:#fff3e6,stroke:#f0ad4e
```

### Template: Multi-Region with Global Peering

```mermaid
graph TB
    subgraph region1["East US"]
        subgraph hub1["Hub-East (10.0.0.0/16)"]
            fw1[/"Firewall<br/>10.0.1.0/26"\]
            gw1{{"ER Gateway<br/>10.0.255.0/27"}}
        end
        subgraph spoke1a["Prod-East (10.1.0.0/16)"]
            app1["App Tier"]
        end
        hub1 <-->|"Regional Peering"| spoke1a
    end

    subgraph region2["West Europe"]
        subgraph hub2["Hub-West (10.4.0.0/16)"]
            fw2[/"Firewall<br/>10.4.1.0/26"\]
            gw2{{"ER Gateway<br/>10.4.255.0/27"}}
        end
        subgraph spoke2a["Prod-West (10.5.0.0/16)"]
            app2["App Tier"]
        end
        hub2 <-->|"Regional Peering"| spoke2a
    end

    hub1 <-->|"Global VNet Peering"| hub2
    gw1 ===|"ExpressRoute"| onprem[("On-Prem DC")]
    gw2 ===|"ExpressRoute"| onprem
```

### Template: AWS Transit Gateway

```mermaid
graph TB
    tgw{{"Transit Gateway"}}

    subgraph shared["Shared Services VPC (10.0.0.0/16)"]
        nat["NAT Gateway"]
        fw_aws[/"Network Firewall"\]
    end

    subgraph prod["Prod VPC (10.1.0.0/16)"]
        pub1["Public 10.1.0.0/24<br/>AZ-1a"]
        priv1["Private 10.1.10.0/24<br/>AZ-1a"]
    end

    subgraph dev["Dev VPC (10.2.0.0/16)"]
        pub2["Public 10.2.0.0/24"]
        priv2["Private 10.2.10.0/24"]
    end

    tgw <-->|"Attachment"| shared
    tgw <-->|"Attachment"| prod
    tgw <-->|"Attachment"| dev
    tgw -.-|"VPN"| onprem[("On-Premises")]
    nat -->|"Egress"| inet(("Internet"))
```

### Generation Workflow

When generating a diagram from a user's network description:

1. **Identify all networks** — List every VNet/VPC with its CIDR and region.
2. **Identify subnets** — List subnets within each network with their CIDRs and purposes.
3. **Identify appliances** — Firewalls, gateways, load balancers, bastion hosts with their IPs.
4. **Map connections** — Peering, VPN, ExpressRoute, internet egress paths.
5. **Select layout direction** — Use `graph TB` (top-to-bottom) for hierarchical layouts, `graph LR` (left-to-right) for pipeline/flow layouts.
6. **Apply styling** — Color-code by environment (prod/dev/staging) or by region.
7. **Validate** — Ensure every labeled CIDR matches the address plan, no orphaned nodes exist, and connection types are accurate.

### Tips for Readable Diagrams

- **Limit depth to 2 levels** — VNet/VPC as subgraph, subnets as nodes inside. Don't nest subgraphs within subgraphs beyond this.
- **Use `<br/>` for line breaks** in labels to avoid overly wide nodes.
- **Group related subnets** visually (web/app/db tiers in a vertical stack within a subgraph).
- **For large topologies (10+ VNets)**, create multiple diagrams: one overview (VNets as single nodes, no subnet detail) and per-VNet detail diagrams.
- **Include a legend** as a comment block above the diagram explaining shape conventions.

## References

- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html
- Azure architecture diagrams: https://learn.microsoft.com/azure/architecture/networking/
- AWS architecture icons and diagrams: https://aws.amazon.com/architecture/icons/

**Analysis only — not a substitute for vendor documentation review.**
