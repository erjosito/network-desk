#!/usr/bin/env node
/**
 * skill-vault-overlap.mjs — measure how much of each specialists/**\/SKILL.md
 * is covered by content already in the vault, to guide the specialist-thinning
 * cleanup (Phase 4 in the architecture eval).
 *
 * For each SKILL.md, this tool:
 *   1. Scans the body for unlinked mentions of vault page names/aliases
 *      (same term-matching engine as suggest-wikilinks.mjs)
 *   2. Computes the top vault targets cited (those are the wikilink candidates
 *      when we author the thin SKILL.md)
 *   3. Walks the markdown heading tree and flags subsections that contain
 *      ZERO vault-term matches — these are specialist-unique content that
 *      MUST stay inline (or be ported to a new vault page first)
 *   4. Emits a thinning recommendation per skill
 *
 * Output: tools/reports/skill-thinning-plan.md (review-only, never applied).
 *
 * CLI:
 *   node tools/skill-vault-overlap.mjs                  # full scan, all 124 skills
 *   node tools/skill-vault-overlap.mjs --specialist=firewall-engineer
 *   node tools/skill-vault-overlap.mjs --threshold=10   # vault-term length cutoff
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const VAULT_ROOT = join(REPO_ROOT, 'extensions', 'network-desk', 'vault');
const SPECIALISTS_ROOT = join(REPO_ROOT, 'extensions', 'network-desk', 'specialists');
const REPORT_PATH = join(REPO_ROOT, 'tools', 'reports', 'skill-thinning-plan.md');

const argv = process.argv.slice(2);
const opt = (prefix, fallback) => {
  const a = argv.find((x) => x.startsWith(prefix));
  return a ? a.slice(prefix.length) : fallback;
};

const THRESHOLD = parseInt(opt('--threshold=', '12'), 10);
const SPECIALIST_FILTER = opt('--specialist=', null);

const EXCLUDED_VAULT_DIRS = new Set(['_migrated', '_temp', '.obsidian']);
const EXCLUDED_BASENAMES = new Set(['AGENTS.md', '_Index.md']);

// ---------- filesystem walks ----------

async function walkMd(root, excludedDirs = new Set()) {
  const out = [];
  async function recurse(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (excludedDirs.has(entry.name)) continue;
        await recurse(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        if (EXCLUDED_BASENAMES.has(entry.name)) continue;
        if (entry.name.startsWith('_')) continue;
        out.push(full);
      }
    }
  }
  await recurse(root);
  return out.sort();
}

// ---------- frontmatter parser (subset of YAML) ----------

function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0] !== '---') return { fm: {}, bodyStart: 0 };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { end = i; break; }
  }
  if (end < 0) return { fm: {}, bodyStart: 0 };
  const fm = {};
  for (let i = 1; i < end; i++) {
    const m = lines[i].match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (!m) continue;
    let val = m[2].replace(/\s+#.*$/, '').trim();
    const arrM = val.match(/^\[(.*)\]$/);
    if (arrM) {
      val = arrM[1]
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      val = val.replace(/^["']|["']$/g, '');
    }
    fm[m[1]] = val;
  }
  return { fm, bodyStart: end + 1 };
}

// ---------- vault-term construction ----------

function buildVaultTerms(vaultPages) {
  const terms = [];
  for (const p of vaultPages) {
    const candidates = new Set();
    if (p.fm.name) candidates.add(p.fm.name.trim());
    candidates.add(p.slug);
    candidates.add(p.slug.replace(/-/g, ' '));
    if (Array.isArray(p.fm.aliases)) {
      for (const a of p.fm.aliases) candidates.add(a.trim());
    }
    const aliasSet = new Set(
      Array.isArray(p.fm.aliases) ? p.fm.aliases.map((s) => s.trim()) : []
    );
    for (const raw of candidates) {
      const t = raw.trim();
      if (!t) continue;
      const wc = t.split(/\s+/).length;
      const isAliased = aliasSet.has(t);
      if (t.length >= THRESHOLD || wc >= 2 || isAliased) {
        terms.push({
          term: t,
          slug: p.slug,
          relPath: p.relPath,
        });
      }
    }
  }
  const seen = new Set();
  const out = [];
  for (const t of terms) {
    const k = `${t.slug}::${t.term.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  out.sort((a, b) => b.term.length - a.term.length);
  return out;
}

// ---------- body masking (same engine as suggest-wikilinks.mjs) ----------

function maskRanges(s, ranges) {
  if (ranges.length === 0) return s;
  const arr = [...s];
  for (const [a, b] of ranges) {
    for (let i = a; i < b && i < arr.length; i++) arr[i] = '\0';
  }
  return arr.join('');
}

function collectMaskRanges(body) {
  const ranges = [];
  const patterns = [
    /```[\s\S]*?```/g,
    /`[^`\n]+`/g,
    /\[\[[^\]]+\]\]/g,
    /\[[^\]\n]+\]\([^)\n]+\)/g,
    /https?:\/\/[^\s)>\]]+/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(body)) !== null) {
      ranges.push([m.index, m.index + m[0].length]);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  const h1 = body.match(/^# .*$/m);
  if (h1) {
    const idx = body.indexOf(h1[0]);
    ranges.push([idx, idx + h1[0].length]);
  }
  return ranges;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatches(maskedBody, term) {
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapeRegex(term)}(?![\\p{L}\\p{N}_])`,
    'giu'
  );
  const out = [];
  let m;
  while ((m = re.exec(maskedBody)) !== null) {
    out.push({ index: m.index, length: m[0].length, text: m[0] });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

// ---------- section walk (## headings) ----------

function splitIntoSections(body) {
  // Returns [{ heading, level, startOffset, endOffset, text }]
  // Treats lines starting with ## as section boundaries (depth >= 2).
  // The preamble before the first ## is included as a section with heading=null.
  const sections = [];
  const lines = body.split('\n');
  let cursor = 0;
  let current = { heading: null, level: 0, startOffset: 0, text: '' };
  for (const ln of lines) {
    const m = ln.match(/^(#{2,6})\s+(.+?)\s*$/);
    if (m) {
      current.endOffset = cursor;
      if (current.text.trim().length > 0 || current.heading !== null) {
        sections.push(current);
      }
      current = {
        heading: m[2].trim(),
        level: m[1].length,
        startOffset: cursor,
        text: ln + '\n',
      };
    } else {
      current.text += ln + '\n';
    }
    cursor += ln.length + 1;
  }
  current.endOffset = cursor;
  if (current.text.trim().length > 0 || current.heading !== null) {
    sections.push(current);
  }
  return sections;
}

// ---------- per-skill analysis ----------

function analyzeSkill(skill, vaultTerms) {
  const initialRanges = collectMaskRanges(skill.body);
  const masked = maskRanges(skill.body, initialRanges);

  const matchesByTarget = new Map();
  const matchedRanges = [];
  for (const t of vaultTerms) {
    if (t.slug === skill.slug) continue;
    const matches = findMatches(masked, t.term);
    if (matches.length === 0) continue;
    if (!matchesByTarget.has(t.slug)) {
      matchesByTarget.set(t.slug, {
        slug: t.slug,
        relPath: t.relPath,
        sampleTerm: t.term,
        offsets: [],
      });
    }
    const entry = matchesByTarget.get(t.slug);
    for (const m of matches) {
      entry.offsets.push(m.index);
      matchedRanges.push([m.index, m.index + m.length]);
    }
  }

  // Section-level analysis: which ## sections contain zero matches?
  const sections = splitIntoSections(skill.body);
  const sectionStats = sections.map((s) => {
    const hits = matchedRanges.filter(
      ([a]) => a >= s.startOffset && a < s.endOffset
    ).length;
    return {
      heading: s.heading,
      level: s.level,
      sizeBytes: s.endOffset - s.startOffset,
      hits,
    };
  });

  // Rough thinning estimate: prose lines (non-code, non-blank) that contain
  // at least one matched term are candidates for replacement with a wikilink.
  const totalBytes = skill.body.length;
  const codeBytes = initialRanges.reduce((acc, [a, b]) => acc + (b - a), 0);
  const proseBytes = totalBytes - codeBytes;

  return {
    skill,
    targets: [...matchesByTarget.values()].sort(
      (a, b) => b.offsets.length - a.offsets.length
    ),
    totalMatches: matchedRanges.length,
    sectionStats,
    totalBytes,
    proseBytes,
    codeBytes,
  };
}

// ---------- report builder ----------

function classifyThinness(analysis) {
  // Heuristic: how aggressively can this SKILL.md be thinned?
  //   HEAVY    — many distinct vault targets matched, many sections w/ overlap
  //   MODERATE — some overlap, but several sections have no vault counterpart
  //   LIGHT    — little overlap (specialist-unique content, keep mostly as-is)
  const nTargets = analysis.targets.length;
  const sectionsWithoutHits = analysis.sectionStats.filter(
    (s) => s.heading && s.hits === 0
  ).length;
  const totalSections = analysis.sectionStats.filter((s) => s.heading).length;
  const orphanFrac = totalSections > 0 ? sectionsWithoutHits / totalSections : 1;

  if (nTargets >= 5 && orphanFrac < 0.4) return 'HEAVY';
  if (nTargets >= 2 && orphanFrac < 0.7) return 'MODERATE';
  return 'LIGHT';
}

function buildReport(analyses) {
  const out = [];
  out.push('# Specialist Thinning Plan');
  out.push('');
  out.push('> Generated by `tools/skill-vault-overlap.mjs` — informational only.');
  out.push('> Drives the specialist-thinning cleanup described in ARCHITECTURE-EVALUATION.md §3.5 / §3.8.');
  out.push('');
  out.push('Each row classifies a `SKILL.md` by how much of its prose overlaps');
  out.push('with vault pages (those are the wikilink candidates when authoring');
  out.push('the thin replacement).');
  out.push('');
  out.push('* **HEAVY** — many vault overlaps, few specialist-unique sections → can be aggressively thinned to workflow + pointers');
  out.push('* **MODERATE** — partial overlap → thin overlapping sections, keep specialist-unique workflow inline');
  out.push('* **LIGHT** — little overlap → likely specialist-unique workflow content, keep mostly as-is');
  out.push('');

  // ----- Summary table -----
  out.push('## Summary');
  out.push('');
  out.push('| Specialist | Skill | Size (KB) | Vault targets | Sections w/o hits | Class |');
  out.push('|---|---|---:|---:|---:|:---:|');
  for (const a of analyses) {
    const sizeKB = (a.totalBytes / 1024).toFixed(1);
    const sectionsWithoutHits = a.sectionStats.filter(
      (s) => s.heading && s.hits === 0
    ).length;
    const totalSections = a.sectionStats.filter((s) => s.heading).length;
    out.push(
      `| ${a.skill.specialist} | ${a.skill.skillName} | ${sizeKB} | ${a.targets.length} | ${sectionsWithoutHits}/${totalSections} | **${classifyThinness(a)}** |`
    );
  }
  out.push('');

  // ----- Per-specialist aggregate -----
  out.push('## By Specialist (aggregate)');
  out.push('');
  out.push('| Specialist | # skills | Total KB | Avg targets/skill | HEAVY | MODERATE | LIGHT |');
  out.push('|---|---:|---:|---:|---:|---:|---:|');
  const bySpec = new Map();
  for (const a of analyses) {
    if (!bySpec.has(a.skill.specialist)) {
      bySpec.set(a.skill.specialist, []);
    }
    bySpec.get(a.skill.specialist).push(a);
  }
  for (const [spec, arr] of [...bySpec.entries()].sort()) {
    const totalKB = arr.reduce((acc, a) => acc + a.totalBytes / 1024, 0).toFixed(1);
    const avgTargets = (arr.reduce((acc, a) => acc + a.targets.length, 0) / arr.length).toFixed(1);
    const classes = arr.map(classifyThinness);
    const heavy = classes.filter((c) => c === 'HEAVY').length;
    const moderate = classes.filter((c) => c === 'MODERATE').length;
    const light = classes.filter((c) => c === 'LIGHT').length;
    out.push(`| ${spec} | ${arr.length} | ${totalKB} | ${avgTargets} | ${heavy} | ${moderate} | ${light} |`);
  }
  out.push('');

  // ----- Per-skill detail -----
  out.push('## Per-Skill Detail');
  out.push('');
  for (const a of analyses) {
    const sizeKB = (a.totalBytes / 1024).toFixed(1);
    const klass = classifyThinness(a);
    out.push(`### \`${a.skill.specialist}/${a.skill.skillName}\` (${sizeKB} KB, **${klass}**)`);
    out.push('');
    if (a.targets.length === 0) {
      out.push('_No vault overlap detected — likely specialist-unique content. Keep as-is or extract reusable parts to vault first._');
      out.push('');
    } else {
      out.push('**Top vault targets** (wikilink candidates):');
      out.push('');
      for (const t of a.targets.slice(0, 10)) {
        out.push(`* \`[[${t.slug}]]\` — ${t.offsets.length} mention(s) — \`${t.relPath}\``);
      }
      if (a.targets.length > 10) {
        out.push(`* _...and ${a.targets.length - 10} more vault targets_`);
      }
      out.push('');
    }

    const orphanSections = a.sectionStats.filter(
      (s) => s.heading && s.hits === 0 && s.sizeBytes > 200
    );
    if (orphanSections.length > 0) {
      out.push('**Sections without vault overlap** (specialist-unique — keep inline or port to vault first):');
      out.push('');
      for (const s of orphanSections) {
        out.push(`* ${'#'.repeat(s.level)} ${s.heading} (${(s.sizeBytes / 1024).toFixed(1)} KB)`);
      }
      out.push('');
    }
  }
  return out.join('\n');
}

// ---------- main ----------

async function main() {
  // Vault pages → targets
  const vaultPaths = await walkMd(VAULT_ROOT, EXCLUDED_VAULT_DIRS);
  const vaultPages = [];
  for (const p of vaultPaths) {
    const content = await readFile(p, 'utf-8');
    const { fm, bodyStart } = parseFrontmatter(content);
    const lines = content.split('\n');
    const body = lines.slice(bodyStart).join('\n');
    vaultPages.push({
      path: p,
      relPath: relative(VAULT_ROOT, p).replace(/\\/g, '/'),
      slug: basename(p, '.md'),
      fm,
      body,
    });
  }
  const vaultTerms = buildVaultTerms(vaultPages);

  // Specialist SKILL.md → sources
  const skillPaths = (await walkMd(SPECIALISTS_ROOT)).filter((p) =>
    basename(p) === 'SKILL.md'
  );
  const skills = [];
  for (const p of skillPaths) {
    const rel = relative(SPECIALISTS_ROOT, p).replace(/\\/g, '/');
    const parts = rel.split('/');
    // expected shape: <specialist>/skills/<skill-name>/SKILL.md
    if (parts.length < 4 || parts[1] !== 'skills') continue;
    const specialist = parts[0];
    const skillName = parts[2];
    if (SPECIALIST_FILTER && specialist !== SPECIALIST_FILTER) continue;
    const content = await readFile(p, 'utf-8');
    const { fm, bodyStart } = parseFrontmatter(content);
    const lines = content.split('\n');
    const body = lines.slice(bodyStart).join('\n');
    skills.push({
      path: p,
      relPath: rel,
      slug: basename(p, '.md'),
      specialist,
      skillName,
      fm,
      body,
    });
  }

  const analyses = skills.map((s) => analyzeSkill(s, vaultTerms));
  analyses.sort((a, b) => {
    if (a.skill.specialist !== b.skill.specialist) {
      return a.skill.specialist.localeCompare(b.skill.specialist);
    }
    return a.skill.skillName.localeCompare(b.skill.skillName);
  });

  const md = buildReport(analyses);
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, md, 'utf-8');

  // Stdout summary
  const totalKB = (analyses.reduce((acc, a) => acc + a.totalBytes, 0) / 1024).toFixed(1);
  const classes = analyses.map(classifyThinness);
  const heavy = classes.filter((c) => c === 'HEAVY').length;
  const moderate = classes.filter((c) => c === 'MODERATE').length;
  const light = classes.filter((c) => c === 'LIGHT').length;
  console.log(`Vault pages indexed: ${vaultPages.length}`);
  console.log(`Vault terms (longest-first): ${vaultTerms.length}`);
  console.log(`Skills analyzed: ${analyses.length} (${totalKB} KB total)`);
  console.log(`  HEAVY:    ${heavy}`);
  console.log(`  MODERATE: ${moderate}`);
  console.log(`  LIGHT:    ${light}`);
  console.log(`Report written to ${relative(REPO_ROOT, REPORT_PATH).replace(/\\/g, '/')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
