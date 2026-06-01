#!/usr/bin/env node
// Reorganize vault/Topics/*.md into Topics/<Domain>/*.md subfolders.
//
// Usage:
//   node tools/reorganize-topics.mjs --dry-run
//   node tools/reorganize-topics.mjs
//
// Idempotent: files already moved are skipped. Strict: every Topics/*.md file
// must appear in the mapping; every mapping entry must correspond to a real
// file (in either the root or its destination subfolder). Aborts before any
// I/O if validation fails.

import { mkdir, rename, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const TOPICS = resolve(REPO_ROOT, 'extensions/network-desk/vault/Topics');

const MAPPING = {
  'Automation': [
    'Configuration-Drift-Detection',
    'Network-CICD-Pipeline',
    'Network-Change-Rollback',
    'Network-Configuration-Testing',
    'Policy-as-Code',
  ],
  'Capacity': [
    'Bandwidth-Forecasting',
    'Capacity-Growth-Modeling',
    'Gateway-Sizing',
    'Scalability-Design',
    'Throughput-Calculations',
  ],
  'CDN': [
    'CDN-Architecture-Design',
    'CDN-Cache-Optimization',
    'CDN-Troubleshooting',
    'Edge-Routing',
    'Edge-WAF-and-DDoS',
  ],
  'Containers': [
    'CNI-Plugin-Selection',
    'Container-Networking-Troubleshooting',
    'Ingress-and-Gateway-API',
    'Kubernetes-Network-Policies',
    'Service-Mesh-Design',
  ],
  'Diagrams': [
    'Drawio-Diagram-Generation',
    'Excalidraw-Diagram-Generation',
    'Mermaid-Network-Diagram-Generation',
  ],
  'DNS': [
    'DNS-Migration',
    'DNS-Record-Audit',
    'DNS-Resolver-Design',
    'DNS-Troubleshooting',
    'DNS-Zone-Design',
    'DNSSEC',
  ],
  'Firewall': [
    'Firewall-Config-Generation',
    'Firewall-HA-Design',
    'Firewall-Hardening',
    'Firewall-Log-Analysis',
    'Firewall-Policy-Design',
    'Firewall-Policy-Testing',
    'Firewall-Rule-Audit',
    'Firewall-Troubleshooting',
    'Firewall-Vendor-Migration',
  ],
  'Hybrid': [
    'BGP-Design',
    'BGP-Routing-Policies',
    'Hybrid-Bandwidth-Planning',
    'Hybrid-Connectivity-Troubleshooting',
    'Hybrid-Failover-Design',
  ],
  'IaC': [
    'ARM-Template-Generation',
    'Ansible-Generation',
    'Bicep-Generation',
    'Terraform-Generation',
  ],
  'IPv6': [
    'Dual-Stack-Networking',
    'IPv4-IPv6-Compatibility',
    'IPv6-Addressing',
    'IPv6-Transition-Planning',
    'IPv6-Troubleshooting',
  ],
  'Load-Balancing': [
    'Health-Probe-Design',
    'Load-Balancer-Selection',
    'Load-Balancer-Traffic-Routing',
    'Load-Balancer-Troubleshooting',
    'SSL-TLS-Offload',
    'TLS-Certificate-Management',
  ],
  'Monitoring': [
    'Flow-Log-Analysis',
    'Flow-Log-Setup',
    'Network-Alert-Design',
    'Network-Connection-Monitoring',
    'Network-Dashboard-Build',
    'Synthetic-Network-Monitoring',
    'Traffic-Analytics',
    'Traffic-Baseline-Analysis',
  ],
  'Multi-Cloud': [
    'Cloud-Network-Service-Mapping',
    'Multi-Cloud-Addressing-Plan',
    'Multi-Cloud-Cost-Comparison',
    'Multi-Cloud-Latency-Optimization',
  ],
  'Pricing': [
    'Cross-Cloud-Price-Comparison',
    'Dedicated-Circuit-Pricing',
    'Egress-Cost-Architecture',
    'Egress-Cost-Calculation',
    'Firewall-Pricing',
    'Load-Balancer-Pricing',
    'Network-Cost-Optimization',
    'VPN-Gateway-Pricing',
  ],
  'Private-Link': [
    'Private-Endpoint-DNS-Integration',
    'Private-Endpoint-Security-Review',
    'Private-Endpoint-Troubleshooting',
  ],
  'Reporting': [
    'DOCX-Report-Generation',
    'HTML-Report-Generation',
    'PDF-Report-Generation',
    'Report-Structure',
    'XLSX-Workbook-Generation',
  ],
  'SASE': [
    'SASE-SSE-Architecture',
    'SASE-SSE-Vendor-Comparison',
    'SD-WAN-SASE-Integration',
    'SWG-and-CASB',
    'ZTNA-Design',
  ],
  'Security': [
    'DDoS-Protection-Design',
    'NSG-and-Security-Group-Audit',
    'Network-Compliance-Check',
    'Network-Security-Troubleshooting',
    'WAF-Policy-Design',
    'WAF-Rules-Configuration',
  ],
  'Troubleshooting': [
    'Connectivity-Testing',
    'MTU-and-PMTUD',
    'NAT-Debugging',
    'Network-Latency-Analysis',
    'PCAP-Analysis',
    'Packet-Capture',
    'Routing-Debug',
    'TLS-Handshake-Debugging',
  ],
  'VNet': [
    'IP-Address-Space-Planning',
    'Network-Migration-Planning',
    'Subnet-Calculator',
    'VNet-VPC-Peering',
  ],
  'VWAN': [
    'VWAN-Branch-Connectivity',
    'VWAN-NVA-Integration',
    'VWAN-Routing-Intent',
    'VWAN-Troubleshooting',
  ],
};

const DRY = process.argv.includes('--dry-run');

function fail(msg) {
  console.error('ERROR: ' + msg);
  process.exit(1);
}

async function main() {
  // Build reverse index: filename (no .md) -> subfolder
  const fileToFolder = new Map();
  let mappingTotal = 0;
  for (const [folder, files] of Object.entries(MAPPING)) {
    for (const f of files) {
      if (fileToFolder.has(f)) {
        fail(`Duplicate mapping entry: ${f} appears under both ${fileToFolder.get(f)} and ${folder}`);
      }
      fileToFolder.set(f, folder);
      mappingTotal++;
    }
  }

  // Discover current state
  const rootEntries = await readdir(TOPICS, { withFileTypes: true });
  const rootMdFiles = rootEntries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name.replace(/\.md$/, ''));
  const existingSubfolders = rootEntries
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  // Files already moved (sitting in correct subfolder)
  const alreadyMoved = new Set();
  for (const folder of existingSubfolders) {
    const subEntries = await readdir(join(TOPICS, folder), { withFileTypes: true });
    for (const e of subEntries) {
      if (!e.isFile() || !e.name.endsWith('.md')) continue;
      const stem = e.name.replace(/\.md$/, '');
      if (fileToFolder.get(stem) !== folder) {
        fail(`Unexpected file ${folder}/${e.name} — mapping says it should be in ${fileToFolder.get(stem) ?? '(no entry)'}`);
      }
      alreadyMoved.add(stem);
    }
  }

  // Validation 1: every root file is in the mapping
  const unknownInRoot = rootMdFiles.filter((f) => !fileToFolder.has(f));
  if (unknownInRoot.length) {
    fail(`Files in Topics/ root not in mapping:\n  ${unknownInRoot.join('\n  ')}`);
  }

  // Validation 2: every mapped file exists (in root or destination)
  const missing = [];
  for (const f of fileToFolder.keys()) {
    if (rootMdFiles.includes(f)) continue;
    if (alreadyMoved.has(f)) continue;
    missing.push(f);
  }
  if (missing.length) {
    fail(`Mapped files not found in Topics/ (neither root nor destination):\n  ${missing.join('\n  ')}`);
  }

  // Validation 3: total
  if (mappingTotal !== rootMdFiles.length + alreadyMoved.size) {
    fail(`Total mismatch: mapping=${mappingTotal}, present=${rootMdFiles.length + alreadyMoved.size}`);
  }

  console.log(`Mapping: ${mappingTotal} files across ${Object.keys(MAPPING).length} subfolders.`);
  console.log(`Current: ${rootMdFiles.length} in root, ${alreadyMoved.size} already moved.`);
  console.log(`Mode: ${DRY ? 'DRY-RUN' : 'EXECUTE'}\n`);

  // Plan moves
  const moves = rootMdFiles.map((stem) => ({
    from: join(TOPICS, stem + '.md'),
    to: join(TOPICS, fileToFolder.get(stem), stem + '.md'),
    folder: fileToFolder.get(stem),
    stem,
  }));

  // Group by folder for display
  const byFolder = new Map();
  for (const m of moves) {
    if (!byFolder.has(m.folder)) byFolder.set(m.folder, []);
    byFolder.get(m.folder).push(m.stem);
  }
  for (const folder of Object.keys(MAPPING).sort()) {
    const items = byFolder.get(folder) ?? [];
    const total = MAPPING[folder].length;
    const status = items.length === 0 ? '(already done)' : `${items.length}/${total} pending`;
    console.log(`  ${folder}/  ${status}`);
  }
  console.log('');

  if (DRY) {
    console.log(`Would move ${moves.length} files. Run without --dry-run to execute.`);
    return;
  }

  if (moves.length === 0) {
    console.log('Nothing to do — all files already in their subfolders.');
    return;
  }

  // Execute
  const folders = new Set(moves.map((m) => m.folder));
  for (const f of folders) {
    await mkdir(join(TOPICS, f), { recursive: true });
  }

  let moved = 0;
  for (const m of moves) {
    if (existsSync(m.to)) {
      fail(`Target already exists: ${m.to} (would overwrite ${m.from})`);
    }
    await rename(m.from, m.to);
    moved++;
  }
  console.log(`Moved ${moved} files into ${folders.size} subfolders.`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
