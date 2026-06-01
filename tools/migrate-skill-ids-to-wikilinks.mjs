#!/usr/bin/env node
/**
 * migrate-skill-ids-to-wikilinks.mjs — mechanical rewrite of legacy
 * `<prefix>_skill_<id>` references in vault pages to Obsidian [[wikilinks]].
 *
 * Why this is safe to auto-apply (unlike `suggest-wikilinks.mjs`):
 * - The mapping is 1:1 and derived from `tools/manifests/batch-*.json`
 *   (single source of truth for the original-skill-id → vault-page mapping).
 * - References use a distinct token shape (`<prefix>_skill_<id>`) that
 *   doesn't collide with normal prose; false positives are essentially nil.
 *
 * What it does NOT auto-apply:
 * - Glob references like `pl_skill_*` (genuinely ambiguous — would need to
 *   expand to multiple wikilinks; left for human review).
 * - References for which no manifest mapping exists (logged as warnings).
 *
 * The legacy refs appear mostly inside backticks: `nsec_skill_segmentation_design`.
 * When the entire backtick-delimited span is the skill-id, the backticks are
 * stripped along with the rewrite (`...` → `[[Page]]`). Bare unfenced refs
 * are also handled.
 *
 * Excluded from rewrite: fenced code blocks, existing wikilinks. Inline-code
 * spans are NOT excluded because most refs LIVE in inline-code spans —
 * that's the whole point of this tool.
 *
 * CLI:
 *   node tools/migrate-skill-ids-to-wikilinks.mjs            # dry-run preview
 *   node tools/migrate-skill-ids-to-wikilinks.mjs --write    # apply changes
 *   node tools/migrate-skill-ids-to-wikilinks.mjs --report   # also emit markdown report
 */

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { dirname, basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const VAULT_ROOT = join(REPO_ROOT, 'extensions', 'network-desk', 'vault');
const MANIFEST_DIR = join(REPO_ROOT, 'tools', 'manifests');
const REPORT_PATH = join(REPO_ROOT, 'tools', 'reports', 'skill-id-migration.md');

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const EMIT_REPORT = argv.includes('--report');

// Specialist prefix → migration source directory.
// Source of truth: REGISTRY in extensions/network-desk/extension.mjs.
const PREFIX_TO_DIR = {
  vnet: 'vnet-architect',
  fw: 'firewall-engineer',
  lb: 'load-balancer',
  dns: 'dns-specialist',
  pl: 'private-link',
  hyb: 'hybrid-connectivity',
  nsec: 'network-security',
  ntsh: 'network-troubleshooter',
  vwan: 'vwan-sdwan',
  nmon: 'network-monitor',
  mcn: 'multi-cloud-net',
  price: 'pricing-analyst',
  iac: 'iac-generator',
  cnet: 'container-networking',
  cdn: 'cdn-edge',
  nauto: 'network-automation',
  sase: 'sase-sse',
  ncap: 'capacity-planner',
  ipv6: 'ipv6-migration',
  doc: 'report-builder',
};
const DIR_TO_PREFIX = Object.fromEntries(
  Object.entries(PREFIX_TO_DIR).map(([k, v]) => [v, k])
);
const ALL_PREFIXES = Object.keys(PREFIX_TO_DIR).sort((a, b) => b.length - a.length);

const EXCLUDED_BASENAMES = new Set(['AGENTS.md', '_Index.md']);
const EXCLUDED_DIRS = new Set(['_migrated', '_temp', '.obsidian']);

// ---------- manifest load ----------

async function buildSkillIdIndex() {
  // Returns Map<`${prefix}_skill_${skill_id}`, vaultSlug>
  // skill_id uses underscores; manifest source path uses hyphens.
  const map = new Map();
  const files = (await readdir(MANIFEST_DIR))
    .filter((f) => f.startsWith('batch-') && f.endsWith('.json'))
    .sort();
  for (const f of files) {
    const json = JSON.parse(await readFile(join(MANIFEST_DIR, f), 'utf-8'));
    for (const move of json.moves) {
      // source: "_migrated/<specialist-dir>/<skill-slug>.md"
      const srcMatch = move.source.match(/^_migrated\/([^/]+)\/([^/]+)\.md$/);
      if (!srcMatch) continue;
      const [, srcDir, srcSlug] = srcMatch;
      const prefix = DIR_TO_PREFIX[srcDir];
      if (!prefix) {
        console.warn(`  skip: unknown specialist dir '${srcDir}' in ${move.source}`);
        continue;
      }
      const skillId = srcSlug.replace(/-/g, '_');
      const key = `${prefix}_skill_${skillId}`;
      const vaultSlug = basename(move.target, '.md');
      if (map.has(key) && map.get(key) !== vaultSlug) {
        console.warn(`  conflict: ${key} -> ${map.get(key)} vs ${vaultSlug}`);
      }
      map.set(key, vaultSlug);
    }
  }
  return map;
}

// ---------- vault walk ----------

async function walkVault() {
  const out = [];
  async function recurse(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        await recurse(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        if (EXCLUDED_BASENAMES.has(entry.name)) continue;
        out.push(full);
      }
    }
  }
  await recurse(VAULT_ROOT);
  return out.sort();
}

// ---------- masking (only fences + existing wikilinks) ----------

function buildMaskedView(content) {
  // Returns a string of same length where fenced code blocks and existing
  // [[wikilinks]] are NUL-filled. Inline code (backticks) is NOT masked —
  // most legacy skill-id refs live in inline-code spans, and we WANT to
  // rewrite them.
  let masked = content;
  masked = masked.replace(/```[\s\S]*?```/g, (m) => '\0'.repeat(m.length));
  masked = masked.replace(/\[\[[^\]]+\]\]/g, (m) => '\0'.repeat(m.length));
  return masked;
}

// ---------- regex ----------
// Anchor: token must be preceded by a non-identifier char (or start of
// string / start of line), and the match itself is `<prefix>_skill_<id>`
// where prefix is one of the known specialist prefixes and id is
// snake_case ASCII (possibly ending in `*` for glob refs).
const PREFIX_GROUP = `(${ALL_PREFIXES.join('|')})`;
const SKILL_RE = new RegExp(
  `(?<![A-Za-z0-9_])${PREFIX_GROUP}_skill_([a-z0-9_*]+)`,
  'g'
);

// ---------- per-file rewrite ----------

function rewriteContent(content, skillMap) {
  // Walk matches over a masked view of the content; apply replacements
  // to the ORIGINAL content using offsets. Returns { newContent, edits[] }
  // where each edit is {originalToken, replacement, line, reason}.
  const masked = buildMaskedView(content);
  const edits = [];
  const replacements = []; // [{start, end, text}] sorted by start asc
  let m;
  SKILL_RE.lastIndex = 0;
  while ((m = SKILL_RE.exec(masked)) !== null) {
    const [token, prefix, skillId] = m;
    const start = m.index;
    const end = start + token.length;
    const line = countLines(content, start);
    if (skillId.endsWith('*')) {
      edits.push({ token, line, status: 'skip-glob', replacement: null });
      continue;
    }
    const target = skillMap.get(token);
    if (!target) {
      edits.push({ token, line, status: 'no-mapping', replacement: null });
      continue;
    }
    // Expand the span to swallow surrounding backticks if the token sits
    // alone between a pair (`token` → [[Target]]). Also swallow a trailing
    // newline-preserving whitespace adjustment if needed.
    let s = start, e = end;
    if (content[s - 1] === '`' && content[e] === '`') {
      s -= 1;
      e += 1;
    }
    const replacement = `[[${target}]]`;
    replacements.push({ start: s, end: e, text: replacement });
    edits.push({
      token,
      line,
      status: 'rewrite',
      replacement,
      originalSpan: content.slice(s, e),
    });
  }
  // Apply replacements right-to-left so offsets stay valid.
  replacements.sort((a, b) => a.start - b.start);
  let newContent = content;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    newContent = newContent.slice(0, r.start) + r.text + newContent.slice(r.end);
  }
  return { newContent, edits };
}

function countLines(text, offset) {
  let n = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') n++;
  }
  return n;
}

// ---------- report ----------

function renderReport(perFile, totals) {
  const out = [];
  out.push('# Skill-ID → Wikilink Migration');
  out.push('');
  out.push('> Generated by `tools/migrate-skill-ids-to-wikilinks.mjs`.');
  out.push('');
  out.push('## Summary');
  out.push('');
  out.push(`- **Files scanned**: ${totals.filesScanned}`);
  out.push(`- **Files with rewrites**: ${totals.filesWithEdits}`);
  out.push(`- **Rewrites applied**: ${totals.rewrites}`);
  out.push(`- **Glob refs skipped** (need manual handling): ${totals.globs}`);
  out.push(`- **Unmapped refs** (no manifest entry): ${totals.unmapped}`);
  out.push(`- **Mode**: ${WRITE ? '`--write` (changes applied)' : 'dry-run (preview only)'}`);
  out.push('');
  if (totals.globs > 0) {
    out.push('## Glob refs (manual review required)');
    out.push('');
    out.push('Glob patterns like `pl_skill_*` reference an entire specialist\'s skill set —');
    out.push('they need to be expanded into a list of wikilinks by hand.');
    out.push('');
    for (const f of perFile) {
      const globs = f.edits.filter((e) => e.status === 'skip-glob');
      if (globs.length === 0) continue;
      out.push(`- \`${f.relPath}\``);
      for (const g of globs) {
        out.push(`  - L${g.line}: \`${g.token}\``);
      }
    }
    out.push('');
  }
  if (totals.unmapped > 0) {
    out.push('## Unmapped refs (no manifest entry — investigate)');
    out.push('');
    for (const f of perFile) {
      const u = f.edits.filter((e) => e.status === 'no-mapping');
      if (u.length === 0) continue;
      out.push(`- \`${f.relPath}\``);
      for (const e of u) {
        out.push(`  - L${e.line}: \`${e.token}\``);
      }
    }
    out.push('');
  }
  out.push('## Rewrites');
  out.push('');
  for (const f of perFile) {
    const rw = f.edits.filter((e) => e.status === 'rewrite');
    if (rw.length === 0) continue;
    out.push(`### ${f.relPath}`);
    out.push('');
    for (const e of rw) {
      out.push(`- L${e.line}: \`${e.originalSpan.replace(/`/g, "'")}\` → \`${e.replacement}\``);
    }
    out.push('');
  }
  return out.join('\n');
}

// ---------- main ----------

async function main() {
  console.log('Loading manifests…');
  const skillMap = await buildSkillIdIndex();
  console.log(`  ${skillMap.size} skill-id mappings indexed`);

  const paths = await walkVault();
  console.log(`Scanning ${paths.length} vault pages…`);

  const perFile = [];
  let rewrites = 0, globs = 0, unmapped = 0, filesWithEdits = 0;
  for (const p of paths) {
    const content = await readFile(p, 'utf-8');
    const { newContent, edits } = rewriteContent(content, skillMap);
    if (edits.length === 0) continue;
    const relPath = relative(VAULT_ROOT, p).replace(/\\/g, '/');
    perFile.push({ relPath, path: p, edits, newContent });
    for (const e of edits) {
      if (e.status === 'rewrite') rewrites++;
      else if (e.status === 'skip-glob') globs++;
      else if (e.status === 'no-mapping') unmapped++;
    }
    if (edits.some((e) => e.status === 'rewrite')) filesWithEdits++;
    if (WRITE && newContent !== content) {
      await writeFile(p, newContent, 'utf-8');
    }
  }

  const totals = {
    filesScanned: paths.length,
    filesWithEdits,
    rewrites,
    globs,
    unmapped,
  };

  if (EMIT_REPORT) {
    await mkdir(dirname(REPORT_PATH), { recursive: true });
    await writeFile(REPORT_PATH, renderReport(perFile, totals), 'utf-8');
    console.log(`Wrote ${relative(REPO_ROOT, REPORT_PATH)}`);
  }

  console.log('');
  console.log('--- Summary ---');
  console.log(`Files scanned       : ${totals.filesScanned}`);
  console.log(`Files with rewrites : ${totals.filesWithEdits}`);
  console.log(`Rewrites            : ${totals.rewrites}`);
  console.log(`Globs (manual)      : ${totals.globs}`);
  console.log(`Unmapped (warn)     : ${totals.unmapped}`);
  console.log(`Mode                : ${WRITE ? 'WRITE (changes applied)' : 'DRY-RUN (preview only)'}`);
  if (!WRITE && totals.rewrites > 0) {
    console.log('\n(pass --write to apply; pass --report to emit tools/reports/skill-id-migration.md)');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
