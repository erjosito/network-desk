#!/usr/bin/env node
// Extract per-vendor sections from Topics/Firewall/*.md into Vendors/<Vendor>.md
// pages, then rewrite the source Topics to replace inline vendor blocks with
// wikilink bullets pointing at the new vendor pages.
//
// Usage:
//   node tools/extract-firewall-vendors.mjs --dry-run
//   node tools/extract-firewall-vendors.mjs
//
// Idempotent: re-running detects sections already extracted and warns instead
// of duplicating. Reversible: original content can be regenerated via
//   node tools/migrate-skills-to-vault.mjs --clean
//   node tools/promote-from-migrated.mjs --manifest tools/manifests/batch-04.json
//   node tools/reorganize-topics.mjs
//
// Algorithm:
//  1. For each topic file in TOPIC_PLAN, parse line-by-line into a heading
//     tree (H1/H2/H3).
//  2. Walk the H3 nodes inside the listed `vendor_sections` (H2 anchors).
//  3. Normalize each H3 heading to a canonical vendor id; skip non-vendor
//     headings (e.g. "Floating IP / EIP Failover (Any Cloud)").
//  4. Capture body lines between the H3 and the next H3-or-higher.
//  5. Replace the H3+body block in the source file with a single bullet:
//        - **[[Vendors/<Vendor>#<PageSection>|<Display>]]**
//     (Non-matched H3 blocks within the same H2 zone are left untouched.)
//  6. Build Vendors/<Vendor>.md with frontmatter + uniform H2 outline:
//     Overview, Config generation, HA, Policy design, Hardening, Logging,
//     Rule audit, Policy testing, Troubleshooting, Common gotchas, See also.
//     Skip H2 sections with no extracted content (don't emit empty headings).

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const VAULT = resolve(REPO_ROOT, 'extensions/network-desk/vault');
const FW_TOPICS = resolve(VAULT, 'Topics/Firewall');
const VENDORS = resolve(VAULT, 'Vendors');

const DRY = process.argv.includes('--dry-run');

// ---------- canonical vendors ----------

// `roles:` is the functional categorization across the convergence axis
// (firewall / router / sd-wan / sse). Multi-role appliances like FortiGate
// (firewall + sd-wan), Juniper SRX (firewall + router-grade Junos), and the
// OSS firewalls (commonly deployed as edge routers + firewall on one box)
// list every deployment-justifying role they fulfill. Order is alphabetical;
// no implicit primary. See AGENTS.md → "Roles axis (Vendors only)".
const VENDORS_META = {
  'Azure-Firewall':        { display: 'Azure Firewall',                 kind: 'cloud-fw', roles: ['firewall'],            tags: ['firewall','vendor','azure','azure-firewall','cloud-fw'] },
  'AWS-Network-Firewall':  { display: 'AWS Network Firewall',           kind: 'cloud-fw', roles: ['firewall'],            tags: ['firewall','vendor','aws','aws-network-firewall','cloud-fw'] },
  'GCP-Cloud-Firewall':    { display: 'GCP Cloud Firewall',             kind: 'cloud-fw', roles: ['firewall'],            tags: ['firewall','vendor','gcp','gcp-cloud-firewall','cloud-fw'] },
  'PAN-OS':                { display: 'PAN-OS (Palo Alto Networks)',    kind: 'ngfw',     roles: ['firewall','sd-wan'],   tags: ['firewall','vendor','palo-alto','pan-os','ngfw'] },
  'FortiGate':             { display: 'FortiGate (Fortinet)',           kind: 'ngfw',     roles: ['firewall','sd-wan'],   tags: ['firewall','vendor','fortinet','fortigate','fortios','ngfw'] },
  'Check-Point':           { display: 'Check Point',                    kind: 'ngfw',     roles: ['firewall'],            tags: ['firewall','vendor','check-point','ngfw'] },
  'Cisco-ASA-FTD':         { display: 'Cisco ASA / Firepower (FTD)',    kind: 'ngfw',     roles: ['firewall'],            tags: ['firewall','vendor','cisco','cisco-asa','cisco-ftd','firepower','ngfw'] },
  'Juniper-SRX':           { display: 'Juniper SRX',                    kind: 'ngfw',     roles: ['firewall','router'],   tags: ['firewall','vendor','juniper','juniper-srx','ngfw'] },
  'Zscaler':               { display: 'Zscaler (ZIA / ZPA)',            kind: 'sse',      roles: ['sse'],                 tags: ['firewall','vendor','zscaler','sse','zia','zpa'] },
  'Sophos-XG':             { display: 'Sophos XG / XGS',                kind: 'ngfw',     roles: ['firewall'],            tags: ['firewall','vendor','sophos','sophos-xg','sophos-xgs','ngfw'] },
  'OPNsense':              { display: 'OPNsense',                       kind: 'oss-fw',   roles: ['firewall','router'],   tags: ['firewall','vendor','opnsense','oss-fw'] },
  'pfSense':               { display: 'pfSense',                        kind: 'oss-fw',   roles: ['firewall','router'],   tags: ['firewall','vendor','pfsense','oss-fw'] },
  'VyOS':                  { display: 'VyOS',                           kind: 'oss-fw',   roles: ['firewall','router'],   tags: ['firewall','vendor','vyos','oss-fw'] },
  'iptables-nftables':     { display: 'iptables / nftables',            kind: 'host-fw',  roles: ['firewall'],            tags: ['firewall','vendor','iptables','nftables','linux','host-fw'] },
};

// Map normalized heading (lowercase, parentheticals stripped, em-dash suffix stripped, numeric prefix stripped) -> canonical id
function normalizeVendor(rawHeading) {
  let h = rawHeading
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\d+\.\s*/, '')          // strip "1. ", "10. "
    .replace(/\s+`[^`]+`/g, '')         // strip backticked code suffix (e.g. — `packet-tracer`)
    .replace(/\s*\(.*?\)/g, '')         // strip parentheticals
    .replace(/\s+—\s+.*$/, '')          // strip em-dash trailing description
    .trim()
    .toLowerCase();

  if (!h) return null;
  if (h.includes('azure firewall') || h === 'azure') return 'Azure-Firewall';
  if (h.includes('aws network firewall') || h === 'aws') return 'AWS-Network-Firewall';
  if (h.includes('gcp cloud firewall') || h === 'gcp' || h.startsWith('gcp ')) return 'GCP-Cloud-Firewall';
  if (h.includes('palo alto') || h.includes('pan-os') || h === 'pan os') return 'PAN-OS';
  if (h.includes('fortinet') || h.includes('fortigate')) return 'FortiGate';
  if (h.includes('check point')) return 'Check-Point';
  if (h.includes('cisco asa') || h.includes('cisco ftd') || h.includes('firepower')) return 'Cisco-ASA-FTD';
  if (h.includes('juniper srx') || h === 'juniper') return 'Juniper-SRX';
  if (h.includes('zscaler')) return 'Zscaler';
  if (h.includes('sophos')) return 'Sophos-XG';
  if (h.includes('opnsense')) return 'OPNsense';
  if (h.includes('pfsense')) return 'pfSense';
  if (h.includes('vyos')) return 'VyOS';
  if (h.includes('iptables') || h.includes('nftables')) return 'iptables-nftables';
  return null;
}

// ---------- topic plan ----------

// `vendor_sections` is the list of H2 headings whose H3 children are
// vendor-specific. `page_section` is the H2 name to use under each Vendor page.
const TOPIC_PLAN = [
  {
    file: 'Firewall-Config-Generation.md',
    vendor_sections: ['Vendor-Specific Configuration Templates'],
    page_section: 'Config generation',
  },
  {
    file: 'Firewall-HA-Design.md',
    vendor_sections: ['Cloud-Specific HA Patterns', 'Open-Source HA Patterns'],
    page_section: 'HA',
  },
  {
    file: 'Firewall-Hardening.md',
    vendor_sections: ['Per-Vendor Hardening Specifics'],
    page_section: 'Hardening',
  },
  {
    file: 'Firewall-Log-Analysis.md',
    vendor_sections: ['Per-Vendor Log Queries'],
    page_section: 'Logging',
  },
  {
    file: 'Firewall-Policy-Design.md',
    vendor_sections: ['Per-Vendor Zone Mapping'],
    page_section: 'Policy design',
  },
  {
    file: 'Firewall-Policy-Testing.md',
    vendor_sections: ['Vendor-native simulators'],
    page_section: 'Policy testing',
  },
  {
    file: 'Firewall-Rule-Audit.md',
    vendor_sections: ['Per-Vendor Rule Export and Hit Count Retrieval'],
    page_section: 'Rule audit',
  },
  {
    file: 'Firewall-Troubleshooting.md',
    vendor_sections: ['Per-Vendor Diagnostic Commands'],
    page_section: 'Troubleshooting',
  },
];

// Uniform vendor-page H2 order. Sections with no body are omitted.
const VENDOR_PAGE_OUTLINE = [
  'Overview',
  'Config generation',
  'HA',
  'Policy design',
  'Hardening',
  'Logging',
  'Rule audit',
  'Policy testing',
  'Troubleshooting',
  'Common gotchas',
  'See also',
];

// ---------- markdown helpers ----------

function splitFrontmatter(src) {
  if (!src.startsWith('---\n')) return { fm: '', body: src };
  const end = src.indexOf('\n---\n', 4);
  if (end < 0) return { fm: '', body: src };
  return { fm: src.slice(0, end + 5), body: src.slice(end + 5) };
}

// ---------- preserve hand-authored sections ----------
//
// The extractor regenerates Vendor pages from source Topics on every run, which
// would normally blow away hand-authored Overview / Common gotchas sections.
// To prevent that, read the existing vendor page (if any), find the H2 blocks
// for the named preserve-list sections, and return them verbatim unless they
// still look like the generated stub.
//
// A section is a stub if EITHER:
//   - it contains the `<!-- AUTO-STUB -->` HTML comment marker (current), OR
//   - it matches the legacy blockquote-only stub text (backward compat with
//     pre-preservation extraction runs).

const PRESERVE_SECTIONS = new Set(['Overview', 'Common gotchas']);

const LEGACY_STUB_PATTERNS = [
  /Vendor-overview content .* is a stub\. Add by hand\./i,
  /Cross-topic gotchas specific to this vendor\. Stub — add by hand\./i,
];

function isStubBody(body) {
  if (!body || !body.trim()) return true;
  if (body.includes('<!-- AUTO-STUB -->')) return true;
  for (const p of LEGACY_STUB_PATTERNS) {
    if (p.test(body)) return true;
  }
  return false;
}

// Parse an existing vendor page and return { sectionName -> trimmed body } for
// every section in PRESERVE_SECTIONS whose content is NOT a stub.
async function readPreservedSections(vendorPath) {
  if (!existsSync(vendorPath)) return {};
  const raw = await readFile(vendorPath, 'utf8');
  const { body } = splitFrontmatter(raw);
  const lines = body.split('\n');
  const mask = buildFenceMask(lines);
  const preserved = {};
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!m || mask[i]) { i++; continue; }
    const heading = m[1].trim();
    if (!PRESERVE_SECTIONS.has(heading)) { i++; continue; }
    // Capture body until next H2 or end-of-file.
    const start = i + 1;
    let end = lines.length;
    for (let j = start; j < lines.length; j++) {
      if (mask[j]) continue;
      if (/^##\s+/.test(lines[j])) { end = j; break; }
      // The trailing horizontal rule + guardrail line is page-level, not part
      // of the last section.
      if (/^---\s*$/.test(lines[j]) && j === lines.length - 2) { end = j; break; }
    }
    const sectionBody = lines.slice(start, end).join('\n').replace(/^\s*\n+/, '').replace(/\n+\s*$/, '');
    if (!isStubBody(sectionBody)) {
      preserved[heading] = sectionBody;
    }
    i = end;
  }
  return preserved;
}

// Build a per-line mask marking which lines are inside a fenced code block.
// Used to ignore `# comment` / `## comment` lines that look like headings but
// are really bash/Python/etc. comments inside ```fences```.
function buildFenceMask(lines) {
  const mask = new Array(lines.length).fill(false);
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i])) {
      // The fence line itself is also "inside" — heading regex shouldn't
      // match it anyway, but mark it for safety.
      mask[i] = true;
      inFence = !inFence;
    } else if (inFence) {
      mask[i] = true;
    }
  }
  return mask;
}

// Parse the body line array; locate each H2 zone listed in vendor_sections.
// Within each zone, identify vendor H3 children + capture their bodies.
// Returns { extractions, replacementPlan } where replacementPlan is a list of
// {startLine, endLine, vendor} blocks to delete + replace with a bullet.
function planExtraction(lines, vendor_sections) {
  const out = { extractions: [], replacementPlan: [], h2Zones: [] };
  const fenceMask = buildFenceMask(lines);

  // Find H2 zones matching vendor_sections (case-insensitive, exact text).
  // Skip H2 lookalikes inside fenced code blocks.
  const wantedH2 = new Set(vendor_sections.map((s) => s.toLowerCase()));
  for (let i = 0; i < lines.length; i++) {
    if (fenceMask[i]) continue;
    const m = lines[i].match(/^##\s+(.*?)\s*$/);
    if (!m) continue;
    const heading = m[1].trim();
    if (!wantedH2.has(heading.toLowerCase())) continue;

    // zone extends until next H2 or end of file. H1 is intentionally NOT
    // matched here — many bodies contain `# bash-comment` lines that would
    // otherwise close the zone after the first vendor section.
    let zoneEnd = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (fenceMask[j]) continue;
      if (/^##\s+/.test(lines[j])) { zoneEnd = j; break; }
    }
    out.h2Zones.push({ heading, startLine: i, endLine: zoneEnd });
  }

  // For each zone, walk H3s. Skip H3 lookalikes inside fenced code blocks.
  for (const zone of out.h2Zones) {
    let cursor = zone.startLine + 1;
    while (cursor < zone.endLine) {
      if (fenceMask[cursor]) { cursor++; continue; }
      const m = lines[cursor].match(/^###\s+(.*?)\s*$/);
      if (!m) { cursor++; continue; }
      // body ends at next H3 or H2 (i.e. up to but not including)
      let bodyEnd = zone.endLine;
      for (let j = cursor + 1; j < zone.endLine; j++) {
        if (fenceMask[j]) continue;
        if (/^#{2,3}\s+/.test(lines[j])) { bodyEnd = j; break; }
      }
      const headingText = m[1].trim();
      const vendor = normalizeVendor(headingText);
      const body = lines.slice(cursor + 1, bodyEnd);
      if (vendor) {
        // strip leading/trailing blank lines from body, and trailing `---` rule line
        let s = 0, e = body.length;
        while (s < e && body[s].trim() === '') s++;
        while (e > s && (body[e - 1].trim() === '' || body[e - 1].trim() === '---')) e--;
        const cleanBody = body.slice(s, e).join('\n');
        out.extractions.push({
          vendor,
          rawHeading: headingText,
          zoneHeading: zone.heading,
          body: cleanBody,
        });
        out.replacementPlan.push({
          startLine: cursor,
          endLine: bodyEnd,
          vendor,
          display: VENDORS_META[vendor].display,
        });
      } else {
        // Non-vendor H3; leave alone, but record for visibility
        out.extractions.push({ vendor: null, rawHeading: headingText, zoneHeading: zone.heading, body: '' });
      }
      cursor = bodyEnd;
    }
  }
  return out;
}

// Rewrite the topic body: replace each planned block with a bullet line, in
// reverse order so line indices stay valid. Returns the new body string.
function rewriteTopicBody(lines, plan, pageSection) {
  const work = lines.slice();
  const ordered = plan.slice().sort((a, b) => b.startLine - a.startLine);
  for (const blk of ordered) {
    const bullet = `- **[[Vendors/${blk.vendor}#${pageSection}|${blk.display}]]**`;
    work.splice(blk.startLine, blk.endLine - blk.startLine, bullet);
  }
  return work.join('\n');
}

// Ensure each H2 zone (now collapsed to bullet list) has an intro sentence
// and a trailing blank line before the next heading. Adds:
//   - "Vendor-specific <section> details have been extracted ..." preamble
//   - blank line after the last bullet in each touched zone
function annotateCollapsedZones(body, touchedZoneHeadings, pageSection) {
  const PREAMBLE = `Vendor-specific ${pageSection.toLowerCase()} details have been extracted to per-vendor pages:`;
  const lines = body.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    out.push(lines[i]);
    const m = lines[i].match(/^##\s+(.*?)\s*$/);
    if (!m || !touchedZoneHeadings.has(m[1].trim())) {
      i++;
      continue;
    }
    // We just pushed a touched H2. Move past following blank lines.
    let k = i + 1;
    while (k < lines.length && lines[k].trim() === '') k++;
    // If next non-blank is the bullet block, emit preamble.
    if (k < lines.length && /^- \*\*\[\[Vendors\//.test(lines[k])) {
      out.push('');
      out.push(PREAMBLE);
      out.push('');
      // Copy bullets in-order.
      while (k < lines.length && /^- \*\*\[\[Vendors\//.test(lines[k])) {
        out.push(lines[k]);
        k++;
      }
      // Ensure exactly one blank line before whatever comes next.
      out.push('');
      // Skip any blank lines from the original between bullets and next heading.
      while (k < lines.length && lines[k].trim() === '') k++;
      i = k;
      continue;
    }
    i++;
  }
  return out.join('\n');
}

// ---------- vendor page builder ----------

function buildVendorPage(vendorId, sectionMap, topicsReferencedBy, preservedSections = {}) {
  const meta = VENDORS_META[vendorId];
  const today = new Date().toISOString().slice(0, 10);
  const fm = [
    '---',
    'type: vendor',
    `name: ${meta.display}`,
    `vendor_kind: ${meta.kind}`,
    `roles: [${meta.roles.join(', ')}]`,
    `tags: [${meta.tags.join(', ')}]`,
    'specialists: [cn_fw]',
    'status: stable',
    `updated: ${today}`,
    '---',
    '',
  ].join('\n');

  const out = [];
  out.push(fm);
  out.push(`# ${meta.display}`);
  out.push('');

  for (const section of VENDOR_PAGE_OUTLINE) {
    if (section === 'Overview') {
      out.push('## Overview');
      out.push('');
      if (preservedSections['Overview']) {
        out.push(preservedSections['Overview']);
      } else {
        out.push('<!-- AUTO-STUB -->');
        out.push(`> Vendor-overview content (licensing, deployment model, positioning) is a stub. Add by hand. When you author this section, remove the \`<!-- AUTO-STUB -->\` marker on the previous line so the extractor preserves your content on re-runs.`);
      }
      out.push('');
      continue;
    }
    if (section === 'Common gotchas') {
      out.push('## Common gotchas');
      out.push('');
      if (preservedSections['Common gotchas']) {
        out.push(preservedSections['Common gotchas']);
      } else {
        out.push('<!-- AUTO-STUB -->');
        out.push('> Cross-topic gotchas specific to this vendor. Stub — add by hand. When you author this section, remove the `<!-- AUTO-STUB -->` marker on the previous line so the extractor preserves your content on re-runs.');
      }
      out.push('');
      continue;
    }
    if (section === 'See also') {
      out.push('## See also');
      out.push('');
      for (const t of topicsReferencedBy) {
        out.push(`- [[Topics/Firewall/${t.replace(/\.md$/, '')}|${t.replace(/\.md$/, '').replace(/-/g, ' ')}]]`);
      }
      // Migration is multi-vendor by nature
      out.push(`- [[Topics/Firewall/Firewall-Vendor-Migration|Firewall vendor migration]] (multi-vendor)`);
      out.push('');
      continue;
    }
    const body = sectionMap[section];
    if (!body || !body.trim()) continue;
    out.push(`## ${section}`);
    out.push('');
    out.push(body);
    out.push('');
  }

  out.push('---');
  out.push('Analysis only — verify against vendor documentation before applying.');
  return out.join('\n') + '\n';
}

// ---------- main ----------

async function main() {
  // 1. Plan extractions across all topics
  const extractionsByVendor = {}; // vendor -> { section -> body }
  const topicsReferencedByVendor = {}; // vendor -> Set(topic_file)
  const rewrittenBodies = {}; // topic_file -> new body string
  const skippedHeadings = []; // (topic, heading) — for visibility

  for (const topic of TOPIC_PLAN) {
    const path = join(FW_TOPICS, topic.file);
    if (!existsSync(path)) {
      console.warn(`  skip (file not found): ${topic.file}`);
      continue;
    }
    const raw = await readFile(path, 'utf8');
    const { fm, body } = splitFrontmatter(raw);
    const lines = body.split('\n');
    const plan = planExtraction(lines, topic.vendor_sections);

    for (const ex of plan.extractions) {
      if (!ex.vendor) {
        skippedHeadings.push({ topic: topic.file, heading: ex.rawHeading, zone: ex.zoneHeading });
        continue;
      }
      if (!extractionsByVendor[ex.vendor]) extractionsByVendor[ex.vendor] = {};
      if (!topicsReferencedByVendor[ex.vendor]) topicsReferencedByVendor[ex.vendor] = new Set();
      // If a vendor has multiple H3 blocks under the same page_section (e.g.
      // Azure-Firewall could appear in both Cloud-Specific HA and elsewhere),
      // concatenate.
      const existing = extractionsByVendor[ex.vendor][topic.page_section];
      extractionsByVendor[ex.vendor][topic.page_section] = existing
        ? existing + '\n\n' + ex.body
        : ex.body;
      topicsReferencedByVendor[ex.vendor].add(topic.file);
    }

    let newBody = rewriteTopicBody(lines, plan.replacementPlan, topic.page_section);
    // A zone is "touched" if any H3 inside it was matched + replaced.
    const touchedZoneHeadings = new Set();
    for (const z of plan.h2Zones) {
      if (plan.replacementPlan.some((p) => p.startLine > z.startLine && p.startLine < z.endLine)) {
        touchedZoneHeadings.add(z.heading);
      }
    }
    newBody = annotateCollapsedZones(newBody, touchedZoneHeadings, topic.page_section);
    rewrittenBodies[topic.file] = fm + newBody;
  }

  // 2. Report
  console.log(`Extraction summary (${DRY ? 'DRY-RUN' : 'EXECUTE'}):\n`);
  const vendorIds = Object.keys(extractionsByVendor).sort();
  for (const v of vendorIds) {
    const sections = Object.keys(extractionsByVendor[v]).sort();
    const bytes = sections.reduce((acc, s) => acc + extractionsByVendor[v][s].length, 0);
    console.log(`  ${v}  →  ${sections.length} sections, ${bytes} bytes`);
    for (const s of sections) {
      console.log(`     ${s}  (${extractionsByVendor[v][s].length} bytes)`);
    }
  }
  console.log('');
  if (skippedHeadings.length) {
    console.log(`Skipped (non-vendor) H3 headings inside vendor zones — these stay in the topic untouched:`);
    for (const s of skippedHeadings) {
      console.log(`  ${s.topic}  zone="${s.zone}"  ###  ${s.heading}`);
    }
    console.log('');
  }

  // 3. Coverage check
  const expectedVendors = Object.keys(VENDORS_META);
  const missing = expectedVendors.filter((v) => !extractionsByVendor[v]);
  if (missing.length) {
    console.warn(`Vendors with no extracted content: ${missing.join(', ')}`);
  }

  // 4. Read any preserved hand-authored sections from existing Vendor pages so
  // we don't blow them away on re-run.
  const preservedByVendor = {};
  const preservedReport = [];
  for (const v of vendorIds) {
    const preserved = await readPreservedSections(join(VENDORS, `${v}.md`));
    preservedByVendor[v] = preserved;
    for (const section of Object.keys(preserved)) {
      preservedReport.push({ vendor: v, section, bytes: preserved[section].length });
    }
  }
  if (preservedReport.length) {
    console.log('Preserving hand-authored sections (will NOT be overwritten):');
    for (const p of preservedReport) {
      console.log(`  ${p.vendor} → ${p.section}  (${p.bytes} bytes)`);
    }
    console.log('');
  }

  // 5. Write or print
  if (DRY) {
    console.log(`Would create/update ${vendorIds.length} Vendors/<Vendor>.md pages and rewrite ${Object.keys(rewrittenBodies).length} Topics/Firewall/*.md files.`);
    return;
  }

  await mkdir(VENDORS, { recursive: true });
  for (const v of vendorIds) {
    const topicsRef = Array.from(topicsReferencedByVendor[v]).sort();
    const page = buildVendorPage(v, extractionsByVendor[v], topicsRef, preservedByVendor[v]);
    await writeFile(join(VENDORS, `${v}.md`), page, 'utf8');
  }
  for (const [file, body] of Object.entries(rewrittenBodies)) {
    await writeFile(join(FW_TOPICS, file), body, 'utf8');
  }
  console.log(`Wrote ${vendorIds.length} vendor pages and rewrote ${Object.keys(rewrittenBodies).length} topic pages.`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
