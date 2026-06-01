#!/usr/bin/env node
/**
 * suggest-wikilinks.mjs — propose Obsidian [[wikilinks]] for the vault.
 *
 * Walks `extensions/network-desk/vault/**\/*.md`, builds a search-term index
 * from each page's frontmatter (`name:`, `aliases:`) and filename slug, then
 * scans every page body for unlinked mentions of those terms. Emits a review
 * report at `tools/reports/wikilink-proposals.md` (OUTSIDE the vault, so it
 * doesn't pollute future cn_search indexing).
 *
 * Apply mode (`--apply`) rewrites source pages in place using the same scan
 * results. Display text always preserves the matched prose verbatim:
 *   - bare `[[Slug]]` only when matchedText (case-insensitive) === slug
 *   - `[[Slug|matchedText]]` otherwise (preserves prose casing AND spacing,
 *     so `Direct Connect` stays `Direct Connect` not `Direct-Connect`).
 * Rewrites apply right-to-left within each source to preserve offsets, and
 * the per-pair occurrence cap (default 3) caps blast radius per page.
 *
 * Threshold (conservative — avoids "BGP"/"VPN"/"WAF" noise):
 *   include term iff (name length >= THRESHOLD) OR (word count >= 2) OR
 *   (term is in some page's `aliases:` list)
 *
 * Masking (offset-precise — won't mistake code/URLs/existing links for prose):
 *   1. Frontmatter block (skipped before scanning)
 *   2. Fenced code blocks  ```...```
 *   3. Inline code spans   `...`
 *   4. Existing wikilinks  [[...]]
 *   5. Markdown links      [text](url)
 *   6. Raw URLs            https://...
 *   7. The page's own H1
 *   8. Matched spans from longer terms (longest-first wins — prevents
 *      "VPN Gateway" from also matching inside "Azure VPN Gateway")
 *
 * Unicode word boundaries:
 *   (?<![\p{L}\p{N}_])TERM(?![\p{L}\p{N}_]) with 'u' flag — correctly
 *   handles hyphenated terms (PAN-OS, SD-WAN, iptables/nftables).
 *
 * CLI:
 *   node tools/suggest-wikilinks.mjs                       # dry-run, stats only
 *   node tools/suggest-wikilinks.mjs --write               # emit report file
 *   node tools/suggest-wikilinks.mjs --apply               # rewrite source pages
 *   node tools/suggest-wikilinks.mjs --page=Topics/CDN     # scope sources
 *   node tools/suggest-wikilinks.mjs --threshold=10        # tune name-length
 *   node tools/suggest-wikilinks.mjs --cap=5               # tune per-pair cap
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const VAULT_ROOT = join(REPO_ROOT, 'extensions', 'network-desk', 'vault');
const REPORT_PATH = join(REPO_ROOT, 'tools', 'reports', 'wikilink-proposals.md');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (prefix, fallback) => {
  const a = argv.find((x) => x.startsWith(prefix));
  return a ? a.slice(prefix.length) : fallback;
};

const WRITE = flag('--write');
const APPLY = flag('--apply');
const PAGE_FILTER = opt('--page=', null);
const THRESHOLD = parseInt(opt('--threshold=', '12'), 10);
const OCCURRENCES_CAP = parseInt(opt('--cap=', '3'), 10);

const EXCLUDED_BASENAMES = new Set(['AGENTS.md', '_Index.md']);
const EXCLUDED_DIRS = new Set(['_migrated', '_temp', '.obsidian']);

// ---------- filesystem walk ----------

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
        if (entry.name.startsWith('_')) continue;
        out.push(full);
      }
    }
  }
  await recurse(VAULT_ROOT);
  return out.sort();
}

// ---------- frontmatter parser (minimal YAML subset) ----------

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

// ---------- search-term construction ----------

function buildSearchTerms(pages) {
  // Per page, generate candidate terms. Each term is independently
  // threshold-checked. Output is sorted longest-first.
  const terms = [];
  for (const p of pages) {
    const candidates = new Set();
    if (p.fm.name) candidates.add(p.fm.name.trim());
    candidates.add(p.slug);                        // raw filename slug
    candidates.add(p.slug.replace(/-/g, ' '));     // hyphens-to-spaces variant
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
          displayName: p.fm.name || p.slug.replace(/-/g, ' '),
        });
      }
    }
  }
  // Dedup (term, slug) pairs; same term may have been added twice for one slug
  const seen = new Set();
  const deduped = [];
  for (const t of terms) {
    const k = `${t.slug}::${t.term.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(t);
  }
  deduped.sort((a, b) => b.term.length - a.term.length);
  return deduped;
}

// ---------- body masking ----------

function maskRanges(s, ranges) {
  // Replace each [start, end) range with NUL characters of the same length,
  // preserving offsets so reported line numbers stay accurate.
  if (ranges.length === 0) return s;
  const arr = [...s];
  for (const [a, b] of ranges) {
    for (let i = a; i < b && i < arr.length; i++) arr[i] = '\0';
  }
  return arr.join('');
}

function collectMaskRanges(body) {
  const ranges = [];

  // Order matters: capture fenced blocks first so we don't mistake fenced
  // backticks for inline-code delimiters. All patterns are span-precise
  // (no whole-line masking, per design).
  const patterns = [
    /```[\s\S]*?```/g,            // fenced code blocks
    /`[^`\n]+`/g,                 // inline code spans
    /\[\[[^\]]+\]\]/g,            // existing wikilinks
    /\[[^\]\n]+\]\([^)\n]+\)/g,   // [text](url)
    /https?:\/\/[^\s)>\]]+/g,     // raw URLs
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(body)) !== null) {
      ranges.push([m.index, m.index + m[0].length]);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  // First H1 line (page title) — multiline, first occurrence only
  const h1 = body.match(/^# .*$/m);
  if (h1) {
    const idx = body.indexOf(h1[0]);
    ranges.push([idx, idx + h1[0].length]);
  }
  return ranges;
}

// ---------- match scan ----------

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

function offsetToLine(body, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < body.length; i++) {
    if (body[i] === '\n') line++;
  }
  return line;
}

function extractSnippet(body, offset, matchLength, maxLen = 110) {
  const start = body.lastIndexOf('\n', offset - 1) + 1;
  const endRaw = body.indexOf('\n', offset);
  const end = endRaw < 0 ? body.length : endRaw;
  const line = body.slice(start, end);
  if (line.length <= maxLen) return line.trim();

  // Center the window on the matched span so the match is always visible
  // even when it appears late in a long line (e.g. wide markdown tables).
  const lineOff = offset - start;
  const half = Math.max(0, Math.floor((maxLen - matchLength) / 2));
  let a = Math.max(0, lineOff - half);
  let b = Math.min(line.length, a + maxLen);
  if (b - a < maxLen && a > 0) a = Math.max(0, b - maxLen);
  const prefix = a > 0 ? '...' : '';
  const suffix = b < line.length ? '...' : '';
  return prefix + line.slice(a, b).trim() + suffix;
}

// ---------- per-source scan ----------

function scanPage(src, terms) {
  const initialRanges = collectMaskRanges(src.body);
  let masked = maskRanges(src.body, initialRanges);
  const proposals = [];

  for (const t of terms) {
    if (t.slug === src.slug) continue;

    const matches = findMatches(masked, t.term);
    if (matches.length === 0) continue;

    const capped = matches.slice(0, OCCURRENCES_CAP);
    const newRanges = [];
    for (const m of capped) {
      const bodyLine = offsetToLine(src.body, m.index);
      const absoluteLine = bodyLine + src.bodyStart;
      proposals.push({
        targetSlug: t.slug,
        displayName: t.displayName,
        matchedTerm: t.term,
        matchedText: m.text,
        offset: m.index,
        length: m.length,
        line: absoluteLine,
        snippet: extractSnippet(src.body, m.index, m.length),
      });
      newRanges.push([m.index, m.index + m.length]);
    }
    // Mask out the matched spans so shorter terms can't reclaim them
    // (longest-first wins — see file header).
    masked = maskRanges(masked, newRanges);
  }
  return proposals;
}

// ---------- report builder ----------

function renderWikilink(targetSlug, displayName) {
  // Used by the REPORT renderer. Suggests `[[Slug]]` when the slug-with-
  // hyphens-as-spaces matches the display name case-insensitively, else
  // emits the aliased form so the suggestion preserves the page's display
  // name. (Apply mode uses renderForApply() — see below.)
  const normalizedSlug = targetSlug.replace(/-/g, ' ').toLowerCase();
  const normalizedName = displayName.toLowerCase();
  return normalizedSlug === normalizedName
    ? `[[${targetSlug}]]`
    : `[[${targetSlug}|${displayName}]]`;
}

function renderForApply(targetSlug, matchedText) {
  // Used by APPLY mode. Preserves the original prose verbatim by aliasing
  // whenever the matched text differs from the slug (even just dashes vs
  // spaces). Bare `[[Slug]]` is only safe when the slug renders identically.
  return matchedText.toLowerCase() === targetSlug.toLowerCase()
    ? `[[${targetSlug}]]`
    : `[[${targetSlug}|${matchedText}]]`;
}

function buildReport({ proposalsBySource, proposalsByTarget, stats }) {
  const out = [];
  out.push('# Wikilink Proposals');
  out.push('');
  out.push('> Generated by `tools/suggest-wikilinks.mjs` — review only, never auto-applied.');
  out.push('> Edit source pages by hand; rerun the script to regenerate.');
  out.push('');
  out.push('## Summary');
  out.push('');
  out.push(`- **Total proposals**: ${stats.totalProposals}`);
  out.push(`- **Source pages with suggestions**: ${proposalsBySource.size} / ${stats.totalSources} scanned`);
  out.push(`- **Target pages referenced**: ${proposalsByTarget.size}`);
  out.push(`- **Search terms**: ${stats.termCount} (longest-first; per-page mask consumes longer matches first)`);
  out.push(`- **Threshold**: name length ≥ ${THRESHOLD} OR wordCount ≥ 2 OR aliased`);
  out.push(`- **Per-pair cap**: first ${OCCURRENCES_CAP} occurrence(s)`);
  out.push('');

  // ----- By target -----
  out.push('## Top Target Pages (by inbound suggestion count)');
  out.push('');
  out.push('| Target | # proposals | Sources (sample) |');
  out.push('|---|---:|---|');
  const targetEntries = [...proposalsByTarget.entries()]
    .map(([slug, v]) => [slug, v, v.items.length])
    .sort((a, b) => b[2] - a[2])
    .slice(0, 30);
  for (const [slug, v, count] of targetEntries) {
    const sample = [...new Set(v.items.map((x) => x.sourceSlug))]
      .slice(0, 4)
      .join(', ');
    out.push(`| \`[[${slug}]]\` | ${count} | ${sample} |`);
  }
  if (targetEntries.length === 0) {
    out.push('| _(no proposals)_ | 0 | |');
  }
  out.push('');

  // ----- By source -----
  out.push('## By Source Page');
  out.push('');
  const sources = [...proposalsBySource.entries()].sort();
  for (const [, v] of sources) {
    out.push(`### ${v.page.relPath}`);
    out.push('');
    // group by target
    const byTarget = new Map();
    for (const it of v.items) {
      if (!byTarget.has(it.targetSlug)) byTarget.set(it.targetSlug, []);
      byTarget.get(it.targetSlug).push(it);
    }
    for (const [targetSlug, items] of [...byTarget.entries()].sort()) {
      const wikilink = renderWikilink(targetSlug, items[0].displayName);
      out.push(`- Suggest \`${wikilink}\``);
      for (const it of items) {
        const safe = it.snippet.replace(/`/g, "'");
        out.push(`  - L${it.line}: \`${safe}\``);
      }
    }
    out.push('');
  }
  return out.join('\n');
}

// ---------- main ----------

async function main() {
  const paths = await walkVault();
  const pages = [];
  for (const p of paths) {
    const content = await readFile(p, 'utf-8');
    const { fm, bodyStart } = parseFrontmatter(content);
    const lines = content.split('\n');
    const body = lines.slice(bodyStart).join('\n');
    pages.push({
      path: p,
      relPath: relative(VAULT_ROOT, p).replace(/\\/g, '/'),
      slug: basename(p, '.md'),
      fm,
      body,
      bodyStart,
      prefix: lines.slice(0, bodyStart).join('\n'),
    });
  }

  const terms = buildSearchTerms(pages);

  const sourcePages = PAGE_FILTER
    ? pages.filter((p) => p.relPath.includes(PAGE_FILTER))
    : pages;

  const proposalsBySource = new Map();
  const proposalsByTarget = new Map();

  for (const src of sourcePages) {
    const props = scanPage(src, terms);
    if (props.length === 0) continue;
    proposalsBySource.set(src.slug, { page: src, items: props });
    for (const p of props) {
      if (!proposalsByTarget.has(p.targetSlug)) {
        proposalsByTarget.set(p.targetSlug, {
          displayName: p.displayName,
          items: [],
        });
      }
      proposalsByTarget.get(p.targetSlug).items.push({
        sourceSlug: src.slug,
        sourceRelPath: src.relPath,
        line: p.line,
        matchedTerm: p.matchedTerm,
        matchedText: p.matchedText,
      });
    }
  }

  const stats = {
    totalProposals: [...proposalsBySource.values()].reduce(
      (acc, v) => acc + v.items.length,
      0
    ),
    totalSources: sourcePages.length,
    termCount: terms.length,
  };

  if (WRITE) {
    const md = buildReport({ proposalsBySource, proposalsByTarget, stats });
    await mkdir(dirname(REPORT_PATH), { recursive: true });
    await writeFile(REPORT_PATH, md, 'utf-8');
    console.log(`Wrote ${relative(REPO_ROOT, REPORT_PATH)} (${md.split('\n').length} lines)`);
  }

  let applyStats = null;
  if (APPLY) {
    let filesModified = 0;
    let rewrites = 0;
    for (const [, v] of proposalsBySource) {
      const src = v.page;
      // Sort right-to-left so earlier rewrites don't shift offsets of later ones.
      const items = [...v.items].sort((a, b) => b.offset - a.offset);
      let body = src.body;
      for (const it of items) {
        const actualText = body.slice(it.offset, it.offset + it.length);
        const wikilink = renderForApply(it.targetSlug, actualText);
        body = body.slice(0, it.offset) + wikilink + body.slice(it.offset + it.length);
      }
      const newContent = src.bodyStart > 0 ? `${src.prefix}\n${body}` : body;
      await writeFile(src.path, newContent, 'utf-8');
      filesModified++;
      rewrites += items.length;
    }
    applyStats = { filesModified, rewrites };
  }

  console.log('');
  console.log('--- Stats ---');
  console.log(`Total proposals     : ${stats.totalProposals}`);
  console.log(`Source pages        : ${proposalsBySource.size}/${stats.totalSources} have suggestions`);
  console.log(`Target pages cited  : ${proposalsByTarget.size}`);
  console.log(`Search terms        : ${stats.termCount}`);
  console.log(`Filter              : ${PAGE_FILTER ? PAGE_FILTER : '(all)'}`);
  console.log(`Threshold           : len>=${THRESHOLD} OR words>=2 OR aliased`);
  console.log(`Per-pair cap        : ${OCCURRENCES_CAP}`);
  if (applyStats) {
    console.log('');
    console.log('--- Applied ---');
    console.log(`Files modified      : ${applyStats.filesModified}`);
    console.log(`Wikilinks added     : ${applyStats.rewrites}`);
  }
  if (!WRITE && !APPLY) console.log('\n(dry-run; pass --write to emit tools/reports/wikilink-proposals.md, or --apply to rewrite source pages)');
}

main().catch((err) => { console.error(err); process.exit(1); });
