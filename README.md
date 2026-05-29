# Cloud Networking

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

**Your cloud networking AI team for GitHub Copilot CLI.** 20 specialist agents covering VNet design, firewalls (14 vendors), load balancing, DNS, private connectivity, IaC generation, container networking, CDN/edge, SASE/SSE, and more — routed automatically.

---

### 📌 Table of Contents

| | Section | Description |
|---|---------|-------------|
| 🚀 | [Quick Start](#quick-start) | One-command install |
| 💡 | [What is Cloud Networking?](#what-is-cloud-networking) | Overview and key concepts |
| 👥 | [The Team](#the-team) | All 20 specialists at a glance |
| 📦 | [Installation](#installation) | 5 ways to install (npx user-level, npx project-level, npm, Copilot prompt, manual) |
| 🖥️ | [CLI Reference](#cli-reference) | `init`, `status`, `uninstall`, `--version` |
| ⚙️ | [How It Works](#how-it-works) | Architecture, routing, and workflow |
| 📝 | [Usage Examples](#usage-examples) | Example prompts for every specialist |
| 📁 | [Output files](#output-files) | Where generated diagrams, reports, and configs are saved |
| 📂 | [Repository Structure](#repository-structure) | Full folder tree and conventions |
| 🔧 | [Troubleshooting](#troubleshooting) | Common issues and fixes |
| 📜 | [Changelog](CHANGELOG.md) | Release notes and version history |
| 📄 | [License](#license) | MIT |

---

## Quick Start

```bash
npx github:dmauser/cloud-networking init
```

That's it. Launch Copilot CLI with experimental mode (`copilot --experimental`) in any repo and trigger the extension with **`@cloud-networking`** followed by what you need:

```
@cloud-networking design a hub-spoke VNet topology for a 3-tier app across dev/staging/prod
```

```
@cloud-networking generate Palo Alto rules to allow HTTPS from my app subnet to a backend on port 8443
```

The coordinator picks the right specialist automatically and responds in plain language — no tool names to remember.

## What is Cloud Networking?

Cloud Networking gives you a coordinated team of network specialist agents through [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli). Describe what you need — VNet design, firewall rules, DNS troubleshooting, hybrid connectivity, IaC generation, container networking, SASE architecture — and the coordinator routes your request to the right specialist automatically.

Each specialist runs with its own domain expertise, guardrails, and workflow. The coordinator handles routing and multi-domain orchestration so you don't have to remember which tools to call.

> **Analysis only** — Cloud Networking produces designs, configurations, IaC templates, and analysis for human review. It generates deployment code but does not execute deployments, modify live firewalls, or make changes to production networks.

## The Team

| | Specialist | `specialist` | What They Do |
|---|-----------|--------|-------------|
| 🏗️ | **VNet/Subnet Architect** | `cn_vnet` | VNet/VPC design, hub-spoke, peering, address planning, Mermaid diagrams |
| 🔥 | **Firewall Engineer** | `cn_fw` | Multi-vendor firewall rules, policies, migration, config gen (14 vendors) |
| ⚖️ | **Load Balancer** | `cn_lb` | LB selection, health probes, SSL offload, WAF, traffic routing |
| 🌐 | **DNS Specialist** | `cn_dns` | DNS zones, resolvers, record audits, migration, troubleshooting |
| 🔒 | **Private Link Engineer** | `cn_pl` | Private endpoints, DNS integration, service exposure, security |
| 🔗 | **Hybrid Connectivity** | `cn_hyb` | VPN, ExpressRoute, Direct Connect, BGP, failover design |
| 🛡️ | **Network Security** | `cn_nsec` | NSG audits, segmentation, DDoS, flow analysis, compliance |
| 🔧 | **Network Troubleshooter** | `cn_ntsh` | Connectivity tests, packet capture, latency, routing, NAT, MTU |
| 🌍 | **Virtual WAN / SD-WAN** | `cn_vwan` | vWAN design, routing intent, NVA integration, branch connectivity |
| 📊 | **Network Monitor** | `cn_nmon` | Flow logs, traffic analytics, connection monitors, dashboards, alerts |
| ☁️ | **Multi-Cloud Networking** | `cn_mcn` | Cross-cloud transit, addressing, service mapping, cost comparison |
| 💰 | **Pricing Analyst** | `cn_price` | Network cost estimation, egress calculation, pricing comparison, cost optimization |
| 📐 | **IaC Generator** | `cn_iac` | Bicep, Terraform, Ansible, ARM templates for networking infrastructure |
| 🐳 | **Container Networking** | `cn_cnet` | CNI plugins, network policies, service mesh, ingress, multi-cluster (AKS/EKS/GKE) |
| 🌐 | **CDN & Edge Networking** | `cn_cdn` | Azure Front Door, CloudFront, Cloud CDN, edge routing, caching, WAF at edge |
| 🔄 | **Network Automation & GitOps** | `cn_nauto` | CI/CD pipelines, drift detection, policy-as-code, testing, rollback |
| 🛡️ | **SASE / SSE** | `cn_sase` | ZTNA, SWG, CASB, FWaaS, SD-WAN integration, vendor comparison |
| 📏 | **Network Capacity Planning** | `cn_ncap` | Bandwidth forecasting, gateway sizing, throughput calculations, growth modeling |
| 🔢 | **IPv6 Migration** | `cn_ipv6` | Dual-stack design, transition planning, addressing, NAT64/DNS64, troubleshooting |
| 📄 | **Report Builder** | `cn_doc` | Packages findings into polished Markdown/HTML/PDF/DOCX reports and XLSX models with formulas |

> The `specialist` column is the value the coordinator passes internally (e.g. `cn_role({ specialist: "cn_vnet" })`). The bare forms (`vnet`, `fw`, …) are still accepted as aliases. You never type these — just describe what you need after `@cloud-networking`.

### Firewall Vendors (14)

Azure Firewall · AWS Network Firewall · GCP Cloud Firewall / Cloud Armor · Palo Alto (PAN-OS / Panorama / VM-Series / Prisma) · Fortinet FortiGate (FortiOS / FortiManager) · Check Point (R81+ / SmartConsole / CloudGuard) · Cisco ASA / FTD · Juniper SRX / vSRX · Zscaler (ZIA / ZPA) · Sophos XG / XGS · OPNsense · pfSense · VyOS · iptables / nftables

## Installation

### Prerequisites

- [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) installed and authenticated
- [Node.js 18+](https://nodejs.org/)
- **Experimental mode** (user-level install only) — enable with `copilot --experimental` or `/experimental` inside Copilot CLI. Not needed for project-level install (`init --project`)

### Option A — User-level install (recommended)

The fastest way to install globally. Extensions load in every repo but require **experimental mode**:

```bash
npx github:dmauser/cloud-networking init
```

Then launch Copilot with experimental mode:

```bash
copilot --experimental
```

This will:
1. Create `~/.copilot/extensions/cloud-networking/` if it doesn't exist
2. Copy the extension router and all 20 specialists
3. Remove any conflicting individual specialist extensions
4. Display a summary of what was installed

### Option B — Project-level install (no experimental mode needed)

Installs the extension into the current repo's `.github/extensions/` directory. Works without experimental mode, but only for this repo.

> **Important:** You must run this from inside a git repository. If you don't have one yet, run `git init` first.

```bash
# cd into your repo first
cd my-repo
npx github:dmauser/cloud-networking init --project
```

Then launch Copilot normally from the repo:

```bash
copilot
```

This will:
1. Create `.github/extensions/cloud-networking/` in the current repo
2. Copy the extension router and all 20 specialists
3. Add the extension directory to `.gitignore` (each developer runs init themselves)

### Option C — Global install via npm

If you prefer a persistent CLI command instead of `npx`:

```bash
npm install -g github:dmauser/cloud-networking

# User-level install (requires experimental mode)
cloud-networking init

# Or project-level install (no experimental mode needed)
cloud-networking init --project

# Now available as a command:
cloud-networking status
cloud-networking --version
```

### Option D — Install from inside Copilot CLI

Already have Copilot CLI open? You can install directly from the prompt — just ask Copilot to clone the repo and run the installer for you:

```
Clone https://github.com/dmauser/cloud-networking.git and run `node bin/cli.mjs init` from the cloned directory.
```

Or if you already cloned the repo and are inside it:

```
Run `node bin/cli.mjs init` to install the cloud-networking extensions.
```

Copilot will execute the commands, copy the extensions into `~/.copilot/extensions/cloud-networking/`, and confirm the result. After installation, restart Copilot CLI to load the new extensions, then verify with:

```
show me the cloud-networking capabilities
```

### Option E — Manual install (offline / corporate environments)

<details>
<summary>Click to expand manual steps</summary>

Use this if you're behind a corporate proxy or don't have access to npm/npx.

**Step 1 — Clone the repo:**

```bash
git clone https://github.com/dmauser/cloud-networking.git
cd cloud-networking
```

**Step 2 — Copy to your Copilot extensions directory:**

macOS / Linux:

```bash
mkdir -p ~/.copilot/extensions/cloud-networking
cp -r extensions/cloud-networking/* ~/.copilot/extensions/cloud-networking/
```

Windows (PowerShell):

```powershell
$dest = "$env:USERPROFILE\.copilot\extensions\cloud-networking"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -Path "extensions\cloud-networking\*" -Destination $dest -Recurse -Force
```

**Step 3 — Verify the files are in place:**

```bash
ls ~/.copilot/extensions/cloud-networking/
# Should show: extension.mjs  specialists/
```

</details>

### Verify installation

After any install method, check that everything is in place:

```bash
# If you used Option A or B:
npx github:dmauser/cloud-networking status

# Or launch Copilot CLI and ask:
copilot
> show me the cloud-networking capabilities
```

You should see all 20 specialists listed with their tools.

### Updating

The extension automatically checks GitHub for a newer version on each session start (throttled to once every 24h, fully non-blocking, never blocks load). When an update is available, you'll see a one-line `cloud-networking: update available — installed X.Y.Z, latest A.B.C` notice in the session log.

To update, run the **`update`** command — it auto-detects whether you have a user-level install, a project-level install (in the current repo), or both, and re-installs each in place:

```bash
npx github:dmauser/cloud-networking update
```

Equivalent shortcuts (any of these re-pulls the latest):

```bash
# Re-run init explicitly (replaces the existing install)
npx github:dmauser/cloud-networking init             # user-level
npx github:dmauser/cloud-networking init --project   # project-level

# If installed globally
npm install -g github:dmauser/cloud-networking
cloud-networking update
```

**Opt out of auto-check.** Set the environment variable `CLOUD_NETWORKING_NO_UPDATE_CHECK=1` to disable the periodic GitHub poll entirely.

Each install records its version in `<install-dir>/.install-meta.json`, and `cloud-networking status` will display it alongside the install date.

See [CHANGELOG.md](CHANGELOG.md) for what's new in each release.

### Uninstall

```bash
# Using the CLI:
npx github:dmauser/cloud-networking uninstall

# Or manually:
# macOS / Linux
rm -rf ~/.copilot/extensions/cloud-networking
# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:USERPROFILE\.copilot\extensions\cloud-networking"
```

## CLI Reference

The `cloud-networking` CLI manages installation of the Copilot extensions. You can run it via `npx` or install it globally.

| Command | Description |
|---------|-------------|
| `cloud-networking init` | Install/reinstall extensions to `~/.copilot/extensions/` |
| `cloud-networking init --project` | Install extensions to `.github/extensions/` in current repo |
| `cloud-networking update` | Re-install over any existing user-level and/or project-level install (pulls latest from GitHub) |
| `cloud-networking status` | Check installation status, version, and list available specialists |
| `cloud-networking uninstall` | Remove installed extensions |
| `cloud-networking --version` | Print the installed CLI version |
| `cloud-networking help` | Show CLI help |

The extension also performs an **automatic update check** against GitHub once every 24 hours when a Copilot session starts, and prints a one-line notice if a newer version is available. Set `CLOUD_NETWORKING_NO_UPDATE_CHECK=1` to disable.

## How It Works

Trigger the extension with **`@cloud-networking`** anywhere in your prompt — or just ask a networking question. The coordinator announces itself at session start, auto-detects networking intent (even without the `@` mention), picks the right specialist(s), loads their role and skills behind the scenes via the registered tools, and replies in natural language. Each routing hint is shown once per specialist per session to keep the conversation clean.

```
You: @cloud-networking design a hub-spoke VNet with Azure Firewall and
     monitor east-west traffic with flow logs

         │
         ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ Cloud Networking coordinator                                │
   │ • Detects @cloud-networking mention                         │
   │ • Identifies multi-domain intent:                           │
   │     VNet design · Firewall · Network monitoring             │
   │ • Engages the matching specialists in sequence              │
   └─────────────────────────────────────────────────────────────┘
         │
         ▼
   Specialists run their domain workflows and the coordinator
   stitches the answer together in plain language.
```

You never need to call individual tools — just describe what you need after `@cloud-networking` and the coordinator handles the rest.

## Usage Examples

Trigger the extension with **`@cloud-networking`** and describe what you need in plain language — the coordinator picks the right specialist automatically.

### 🏗️ VNet/Subnet Architect

```
@cloud-networking Design a hub-spoke VNet topology for a 3-tier app with separate dev/staging/prod environments.
```
```
@cloud-networking Plan an IP address scheme for 12 VNets across 3 Azure regions with no overlapping CIDRs.
```
```
@cloud-networking Generate a Mermaid diagram of my current hub-spoke peering architecture.
```

### 🔥 Firewall Engineer

```
@cloud-networking Generate Palo Alto PAN-OS rules to allow HTTPS from my app subnet to a backend API on port 8443.
```
```
@cloud-networking Migrate these Cisco ASA ACLs to Azure Firewall policy rules.
```
```
@cloud-networking Audit my FortiGate ruleset for shadowed, redundant, or overly permissive rules.
```

### ⚖️ Load Balancer

```
@cloud-networking Which Azure load balancer should I use — Standard LB, App Gateway, or Front Door?
```
```
@cloud-networking Design health probes for a multi-region API behind Azure Front Door.
```
```
@cloud-networking Configure SSL offload on an Application Gateway with end-to-end TLS.
```

### 🌐 DNS Specialist

```
@cloud-networking Design a private DNS zone architecture for 5 VNets with hub-spoke peering.
```
```
@cloud-networking Audit my DNS records for stale entries, mismatched TTLs, and missing PTR records.
```
```
@cloud-networking Troubleshoot — internal VMs can't resolve privatelink.blob.core.windows.net.
```

### 🔒 Private Link Engineer

```
@cloud-networking Set up private endpoints for Azure SQL and Storage with proper DNS integration.
```
```
@cloud-networking Review the security posture of my private endpoint configuration — any gaps?
```
```
@cloud-networking Expose my internal API to a partner tenant using Private Link Service.
```

### 🔗 Hybrid Connectivity

```
@cloud-networking Design a site-to-site VPN between Azure and our on-prem data center with BGP.
```
```
@cloud-networking Plan an ExpressRoute circuit with Global Reach for US-East and West Europe.
```
```
@cloud-networking Design a failover strategy: ExpressRoute primary, VPN backup with automatic failover.
```

### 🛡️ Network Security

```
@cloud-networking Audit all NSGs in my subscription — flag any-any rules, unused NSGs, and overly broad ranges.
```
```
@cloud-networking Design a micro-segmentation strategy for a PCI-DSS compliant environment.
```
```
@cloud-networking Analyze NSG flow logs to identify top talkers and unexpected traffic patterns.
```

### 🔧 Network Troubleshooter

```
@cloud-networking My VM in spoke-vnet-02 can't reach the database in hub-vnet — diagnose the connectivity path.
```
```
@cloud-networking Run a packet capture on my NVA to debug why return traffic is being dropped.
```
```
@cloud-networking Investigate high latency between my Azure VMs and on-prem servers — is it routing or MTU?
```

### 🌍 Virtual WAN / SD-WAN

```
@cloud-networking Design a Virtual WAN topology for 20 branch offices across 3 regions.
```
```
@cloud-networking Configure routing intent for internet breakout through Azure Firewall in my vWAN hub.
```
```
@cloud-networking Integrate a Palo Alto NVA into my Virtual WAN hub for traffic inspection.
```

### 📊 Network Monitor

```
@cloud-networking Set up NSG flow logs with Traffic Analytics for all my production VNets.
```
```
@cloud-networking Build a monitoring dashboard for VPN gateway throughput, latency, and tunnel status.
```
```
@cloud-networking Create alert rules for when ExpressRoute circuit utilization exceeds 80%.
```

### ☁️ Multi-Cloud Networking

```
@cloud-networking Design a transit architecture connecting Azure, AWS, and GCP with consistent addressing.
```
```
@cloud-networking Map equivalent networking services across Azure, AWS, and GCP for our migration plan.
```
```
@cloud-networking Compare the cost of cross-cloud connectivity options: VPN vs dedicated interconnect vs SD-WAN.
```

### 💰 Pricing Analyst

```
@cloud-networking How much will 5TB of monthly egress from Azure East US cost?
```
```
@cloud-networking Compare VPN gateway costs across Azure, AWS, and GCP for 500 Mbps.
```
```
@cloud-networking Should I use ExpressRoute or S2S VPN for 2 Gbps sustained? Show me the break-even.
```

### 📐 IaC Generator

```
@cloud-networking Generate a Bicep template for a hub-spoke VNet with Azure Firewall and VPN Gateway.
```
```
@cloud-networking Create Terraform modules for a multi-region AWS VPC with Transit Gateway.
```
```
@cloud-networking Write an Ansible playbook to deploy NSGs and route tables for my Azure network.
```

### 🐳 Container Networking

```
@cloud-networking Which CNI plugin should I use for my AKS cluster — Azure CNI Overlay or Cilium?
```
```
@cloud-networking Design Kubernetes network policies to isolate namespaces while allowing shared services.
```
```
@cloud-networking Compare Istio vs Linkerd for my service mesh — we need mTLS and traffic splitting.
```

### 🌐 CDN & Edge Networking

```
@cloud-networking Design an Azure Front Door configuration with multi-origin failover and caching.
```
```
@cloud-networking Optimize cache hit ratio for my API responses — what cache key strategy should I use?
```
```
@cloud-networking Configure WAF rules at the edge to block bot traffic while allowing legitimate API calls.
```

### 🔄 Network Automation & GitOps

```
@cloud-networking Design a GitHub Actions pipeline for deploying Terraform network changes with approval gates.
```
```
@cloud-networking Set up drift detection to alert when someone makes out-of-band changes to my NSGs.
```
```
@cloud-networking What policy-as-code rules should I enforce to prevent public IP creation in production?
```

### 🛡️ SASE / SSE

```
@cloud-networking Design a SASE architecture to replace our legacy VPN for 5,000 remote users.
```
```
@cloud-networking Compare Zscaler ZPA vs Microsoft Entra Private Access for our ZTNA implementation.
```
```
@cloud-networking How should I integrate SD-WAN with our SASE platform for branch office connectivity?
```

### 📏 Network Capacity Planning

```
@cloud-networking What VPN Gateway SKU do I need for 800 Mbps sustained throughput with 15 tunnels?
```
```
@cloud-networking Forecast our ExpressRoute bandwidth needs — we're growing 30% per quarter.
```
```
@cloud-networking Calculate maximum single-flow TCP throughput for a 50ms RTT link with 64KB window.
```

### 🔢 IPv6 Migration

```
@cloud-networking Design a dual-stack VNet configuration for my Azure workloads.
```
```
@cloud-networking Plan an IPv6 migration for our Azure environment — which services support IPv6 today?
```
```
@cloud-networking Set up NAT64/DNS64 so my IPv6-only VMs can reach IPv4-only external services.
```

### 📄 Report Builder

```
@cloud-networking Package the firewall rule-audit findings into a polished PDF report.
```
```
@cloud-networking Export this hub-spoke design review as a Word document with an executive summary.
```
```
@cloud-networking Build an XLSX capacity model with formulas for subnet sizing and growth.
```

> Report Builder is a **packaging** specialist — it turns another specialist's analysis into a deliverable. It does not perform networking analysis itself. Generated files land under `cloud-networking/<specialist>/reports/` (see [Output files](#output-files)). Rendering to PDF/DOCX/XLSX uses the bundled Python renderers (`renderers/make_*.py`); when a dependency is missing the skill falls back to Markdown/HTML.

### 🔀 Multi-Domain (cross-specialist workflows)

```
@cloud-networking Design a hub-spoke VNet, add firewall rules for east-west traffic, and set up monitoring.
```
```
@cloud-networking Plan a hybrid connectivity setup with ExpressRoute, configure private endpoints for PaaS services, and audit the NSGs.
```
```
@cloud-networking Troubleshoot connectivity from on-prem through VPN to a private endpoint, and check DNS resolution along the path.
```

### 🔎 Discovery

```
@cloud-networking what can you help me with?
```
```
@cloud-networking which specialists cover firewalls and what do they do?
```
```
@cloud-networking I need to set up private endpoints for my storage accounts — who should handle this?
```

## Output files

Specialists are **analysis-first** and return their findings inline in the chat. When you ask for a saved artifact — a diagram, a rendered report, or a spreadsheet model — files are written into a predictable tree rooted at `cloud-networking/` in your current working directory:

```
cloud-networking/
└── <specialist>/            # kebab dir name, e.g. firewall-engineer, capacity-planner
    ├── diagrams/            # Mermaid / Excalidraw / draw.io sources
    ├── reports/             # Markdown / HTML / PDF / DOCX deliverables
    └── configs/             # generated configs / IaC / specs
```

Files are named `<kebab-topic>-<YYYYMMDD>.<ext>` by default (e.g. `rule-audit-20260115.pdf`). Example:

```
cloud-networking/
├── firewall-engineer/
│   ├── reports/rule-audit-20260115.pdf
│   └── configs/east-west-policy-20260115.json
└── capacity-planner/
    └── reports/ip-plan-20260115.xlsx
```

The bundled Python renderers (`extensions/cloud-networking/renderers/make_{html,pdf,docx,xlsx}.py`) honor this layout: pass `--specialist <kebab-dir>` and they resolve the output path automatically (override with `--output`/`--outdir`). The [Report Builder](#-report-builder) specialist orchestrates these renderers for high-quality reports.

## Repository Structure

```
cloud-networking/
├── README.md                              # This file
├── LICENSE                                # MIT license
├── package.json                           # npm package config (name, bin, engines)
├── bin/
│   └── cli.mjs                            # CLI installer (init, uninstall, status)
└── extensions/
    └── cloud-networking/
        ├── extension.mjs                  # Router: @cloud-networking mention trigger + auto-routing hook
        └── specialists/
            ├── vnet-architect/
            │   ├── agents/
            │   │   └── vnet-architect.md
            │   └── skills/
            │       ├── address-planner/
            │       │   └── SKILL.md
            │       ├── hub-spoke-design/
            │       │   └── SKILL.md
            │       ├── migration-planner/
            │       │   └── SKILL.md
            │       ├── network-diagram/
            │       │   └── SKILL.md
            │       ├── peering-advisor/
            │       │   └── SKILL.md
            │       └── subnet-calculator/
            │           └── SKILL.md
            ├── firewall-engineer/
            │   ├── agents/
            │   │   └── firewall-engineer.md
            │   └── skills/
            │       ├── config-gen/
            │       │   └── SKILL.md
            │       ├── ha-design/
            │       │   └── SKILL.md
            │       ├── hardening-check/
            │       │   └── SKILL.md
            │       ├── log-analysis/
            │       │   └── SKILL.md
            │       ├── policy-design/
            │       │   └── SKILL.md
            │       ├── rule-audit/
            │       │   └── SKILL.md
            │       ├── troubleshoot/
            │       │   └── SKILL.md
            │       └── vendor-migrate/
            │           └── SKILL.md
            ├── load-balancer/
            │   ├── agents/
            │   │   └── load-balancer.md
            │   └── skills/
            │       ├── health-probe-design/
            │       │   └── SKILL.md
            │       ├── lb-selector/
            │       │   └── SKILL.md
            │       ├── ssl-offload/
            │       │   └── SKILL.md
            │       ├── traffic-routing/
            │       │   └── SKILL.md
            │       ├── troubleshoot/
            │       │   └── SKILL.md
            │       └── waf-rules/
            │           └── SKILL.md
            ├── dns-specialist/
            │   ├── agents/
            │   │   └── dns-specialist.md
            │   └── skills/
            │       ├── migration-plan/
            │       │   └── SKILL.md
            │       ├── record-audit/
            │       │   └── SKILL.md
            │       ├── resolver-design/
            │       │   └── SKILL.md
            │       ├── troubleshoot/
            │       │   └── SKILL.md
            │       └── zone-design/
            │           └── SKILL.md
            ├── private-link/
            │   ├── agents/
            │   │   └── private-link.md
            │   └── skills/
            │       ├── dns-integration/
            │       │   └── SKILL.md
            │       ├── endpoint-design/
            │       │   └── SKILL.md
            │       ├── security-review/
            │       │   └── SKILL.md
            │       ├── service-exposure/
            │       │   └── SKILL.md
            │       └── troubleshoot/
            │           └── SKILL.md
            ├── hybrid-connectivity/
            │   ├── agents/
            │   │   └── hybrid-connectivity.md
            │   └── skills/
            │       ├── bandwidth-calc/
            │       │   └── SKILL.md
            │       ├── expressroute-design/
            │       │   └── SKILL.md
            │       ├── failover-design/
            │       │   └── SKILL.md
            │       ├── routing-design/
            │       │   └── SKILL.md
            │       ├── troubleshoot/
            │       │   └── SKILL.md
            │       └── vpn-design/
            │           └── SKILL.md
            ├── network-security/
            │   ├── agents/
            │   │   └── network-security.md
            │   └── skills/
            │       ├── compliance-check/
            │       │   └── SKILL.md
            │       ├── ddos-design/
            │       │   └── SKILL.md
            │       ├── flow-analysis/
            │       │   └── SKILL.md
            │       ├── nsg-audit/
            │       │   └── SKILL.md
            │       ├── segmentation-design/
            │       │   └── SKILL.md
            │       └── troubleshoot/
            │           └── SKILL.md
            ├── network-troubleshooter/
            │   ├── agents/
            │   │   └── network-troubleshooter.md
            │   └── skills/
            │       ├── connectivity-test/
            │       │   └── SKILL.md
            │       ├── latency-analysis/
            │       │   └── SKILL.md
            │       ├── mtu-path-discovery/
            │       │   └── SKILL.md
            │       ├── nat-debug/
            │       │   └── SKILL.md
            │       ├── packet-capture/
            │       │   └── SKILL.md
            │       └── routing-debug/
            │           └── SKILL.md
            ├── vwan-sdwan/
            │   ├── agents/
            │   │   └── vwan-sdwan.md
            │   └── skills/
            │       ├── branch-connectivity/
            │       │   └── SKILL.md
            │       ├── nva-integration/
            │       │   └── SKILL.md
            │       ├── routing-intent/
            │       │   └── SKILL.md
            │       ├── troubleshoot/
            │       │   └── SKILL.md
            │       └── vwan-design/
            │           └── SKILL.md
            ├── network-monitor/
            │   ├── agents/
            │   │   └── network-monitor.md
            │   └── skills/
            │       ├── alert-design/
            │       │   └── SKILL.md
            │       ├── baseline-analysis/
            │       │   └── SKILL.md
            │       ├── connection-monitor/
            │       │   └── SKILL.md
            │       ├── dashboard-build/
            │       │   └── SKILL.md
            │       ├── flow-log-setup/
            │       │   └── SKILL.md
            │       └── traffic-analytics/
            │           └── SKILL.md
            └── multi-cloud-net/
                ├── agents/
                │   └── multi-cloud-net.md
                └── skills/
                    ├── addressing-plan/
                    │   └── SKILL.md
                    ├── cost-comparison/
                    │   └── SKILL.md
                    ├── latency-optimization/
                    │   └── SKILL.md
                    ├── service-mapping/
                    │   └── SKILL.md
                    └── transit-design/
                        └── SKILL.md
            ├── pricing-analyst/         # (structure follows same pattern)
            ├── iac-generator/
            │   ├── agents/
            │   │   └── iac-generator.md
            │   └── skills/
            │       ├── bicep-gen/
            │       │   └── SKILL.md
            │       ├── terraform-gen/
            │       │   └── SKILL.md
            │       ├── ansible-gen/
            │       │   └── SKILL.md
            │       └── arm-gen/
            │           └── SKILL.md
            ├── container-networking/
            │   ├── agents/
            │   │   └── container-networking.md
            │   └── skills/
            │       ├── cni-selection/
            │       │   └── SKILL.md
            │       ├── network-policy/
            │       │   └── SKILL.md
            │       ├── service-mesh/
            │       │   └── SKILL.md
            │       ├── ingress-design/
            │       │   └── SKILL.md
            │       ├── cross-cluster/
            │       │   └── SKILL.md
            │       └── troubleshoot/
            │           └── SKILL.md
            ├── cdn-edge/
            │   ├── agents/
            │   │   └── cdn-edge.md
            │   └── skills/
            │       ├── cdn-design/
            │       │   └── SKILL.md
            │       ├── edge-routing/
            │       │   └── SKILL.md
            │       ├── cache-optimization/
            │       │   └── SKILL.md
            │       ├── waf-edge/
            │       │   └── SKILL.md
            │       └── troubleshoot/
            │           └── SKILL.md
            ├── network-automation/
            │   ├── agents/
            │   │   └── network-automation.md
            │   └── skills/
            │       ├── pipeline-design/
            │       │   └── SKILL.md
            │       ├── drift-detection/
            │       │   └── SKILL.md
            │       ├── policy-as-code/
            │       │   └── SKILL.md
            │       ├── testing/
            │       │   └── SKILL.md
            │       └── rollback/
            │           └── SKILL.md
            ├── sase-sse/
            │   ├── agents/
            │   │   └── sase-sse.md
            │   └── skills/
            │       ├── architecture/
            │       │   └── SKILL.md
            │       ├── ztna-design/
            │       │   └── SKILL.md
            │       ├── swg-casb/
            │       │   └── SKILL.md
            │       ├── sdwan-integration/
            │       │   └── SKILL.md
            │       └── vendor-compare/
            │           └── SKILL.md
            ├── capacity-planner/
            │   ├── agents/
            │   │   └── capacity-planner.md
            │   └── skills/
            │       ├── bandwidth-forecast/
            │       │   └── SKILL.md
            │       ├── gateway-sizing/
            │       │   └── SKILL.md
            │       ├── throughput-calc/
            │       │   └── SKILL.md
            │       ├── scalability-design/
            │       │   └── SKILL.md
            │       └── growth-model/
            │           └── SKILL.md
            ├── ipv6-migration/
                │   ├── agents/
                │   │   └── ipv6-migration.md
                │   └── skills/
                │       ├── dual-stack/
                │       │   └── SKILL.md
                │       ├── transition-plan/
                │       │   └── SKILL.md
                │       ├── addressing/
                │       │   └── SKILL.md
                │       ├── compatibility/
                │       │   └── SKILL.md
                │       └── troubleshoot/
                │           └── SKILL.md
                └── report-builder/
                    ├── agents/
                    │   └── report-builder.md
                    └── skills/
                        ├── report-structure/
                        │   └── SKILL.md
                        ├── html-report/
                        │   └── SKILL.md
                        ├── pdf-report/
                        │   └── SKILL.md
                        ├── docx-report/
                        │   └── SKILL.md
                        └── xlsx-workbook/
                            └── SKILL.md
```

### Installed extension structure

After running `cloud-networking init`, the installed layout mirrors the `extensions/cloud-networking/` tree above:

```
~/.copilot/extensions/cloud-networking/
├── extension.mjs                          # Router + auto-routing hook
└── specialists/                           # All 20 specialist directories
    └── (same structure as above)
```

### Specialist directory conventions

All specialists follow a standard layout:

```
specialist-name/
├── agents/
│   └── specialist-name.md    # Agent persona, workflow, guardrails
└── skills/
    ├── skill-name/
    │   └── SKILL.md          # Detailed skill instructions
    └── another-skill/
        └── SKILL.md
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Extensions not loading (`/env` shows "Extensions: none") | Enable experimental mode: `copilot --experimental` — or use project-level install: `cloud-networking init --project` |
| Tools not appearing after install | Restart Copilot CLI to reload extensions |
| `@cloud-networking` doesn't engage | Verify `~/.copilot/extensions/cloud-networking/extension.mjs` exists; run `cloud-networking status` |
| Specialist tools missing | Run `cloud-networking status` to check — should list all 20 specialists |
| Conflicting individual extensions | Run `cloud-networking init` — it removes old standalone specialist installs |
| `npx` hangs or fails | Use Option E (manual install) — clone the repo and copy files directly |
| Firewall config for unsupported vendor | Check the [14 supported vendors](#firewall-vendors-14) list |
| Version mismatch after update | Run `cloud-networking status` — compare CLI version vs installed version |

## License

MIT — see [LICENSE](LICENSE).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full list of releases, new specialists, skill additions, and behavior changes.

