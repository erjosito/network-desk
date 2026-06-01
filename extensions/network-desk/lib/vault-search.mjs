// vault-search.mjs — BM25-style search over the Obsidian-compatible knowledge vault.
//
// Indexed fields (with boosts at search time):
//   - name        (frontmatter `name:` or H1)               boost 3
//   - aliases     (frontmatter `aliases:` array, joined)    boost 2.5
//   - tags        (frontmatter `tags:` array, joined)       boost 2
//   - body        (page body with wikilinks → display text) boost 1
//
// Stored (not searched) fields:
//   - id, path, summary, specialists, cloud, clouds, type
//
// Optional filters at search time:
//   - specialist  e.g. "cn_vnet" — keeps only pages whose `specialists:` includes it
//   - cloud       e.g. "azure"   — keeps cloud-specific matches AND cloud-agnostic pages
//
// Optional 1-hop wikilink expansion:
//   - expandLinks: true → after top-K results, extract [[Slug]] targets from those
//     bodies, drop any that are already in the results, and return summaries for
//     up to 5 of them.
//
// Index is lazy: built once on first call to `search()` and memoised.

import MiniSearch from "minisearch";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const VAULT_DIR = join(HERE, "..", "vault");

// ── Frontmatter parser ────────────────────────────────────────────────
// Bounded YAML — our frontmatter only uses these shapes:
//   key: scalar          (string / number / bool, optionally quoted)
//   key: [a, b, c]       (inline list of strings)
//   key:                 (followed by `- item` block lines)
//     - item

function parseFrontmatter(text) {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!m) return { meta: {}, body: text };
    const body = text.slice(m[0].length);
    const fm = {};
    const lines = m[1].split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (!line.trim() || line.trim().startsWith("#")) { i++; continue; }
        const kvMatch = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
        if (!kvMatch) { i++; continue; }
        const key = kvMatch[1];
        let raw = kvMatch[2].trim();

        if (raw === "") {
            // Block list follows.
            const items = [];
            i++;
            while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
                items.push(stripQuotes(lines[i].replace(/^\s*-\s+/, "").trim()));
                i++;
            }
            fm[key] = items;
            continue;
        }
        if (raw.startsWith("[") && raw.endsWith("]")) {
            fm[key] = raw.slice(1, -1).split(",").map((s) => stripQuotes(s.trim())).filter(Boolean);
        } else {
            fm[key] = stripQuotes(raw);
        }
        i++;
    }
    return { meta: fm, body };
}

function stripQuotes(s) {
    if (s.length >= 2 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))) {
        return s.slice(1, -1);
    }
    return s;
}

// ── Body normalisation ────────────────────────────────────────────────

const WIKILINK_RE = /\[\[([^\]\|#]+?)(?:#[^\]\|]*)?(?:\|([^\]]+))?\]\]/g;

function stripWikilinks(text) {
    // [[Foo]] → "Foo", [[Foo|bar]] → "bar", [[Foo#section]] → "Foo", [[Foo#section|bar]] → "bar"
    return text.replace(WIKILINK_RE, (_m, target, display) => display || target.replace(/-/g, " "));
}

function extractWikilinkTargets(text) {
    const targets = new Set();
    let m;
    WIKILINK_RE.lastIndex = 0;
    while ((m = WIKILINK_RE.exec(text)) !== null) {
        const slug = m[1].split("/").pop();
        if (slug) targets.add(slug);
    }
    return targets;
}

function extractH1(body) {
    const m = body.match(/^[ \t]*#\s+(.+)$/m);
    return m ? m[1].trim() : null;
}

function bodyWithoutH1(body) {
    return body.replace(/^[ \t]*#\s+.+\r?\n?/m, "");
}

function firstParagraph(body) {
    const trimmed = stripWikilinks(bodyWithoutH1(body)).trim();
    // Skip blockquote / cloud-equivalents header at top, if any.
    const paras = trimmed.split(/\r?\n\s*\r?\n/);
    for (const p of paras) {
        const t = p.trim();
        if (!t) continue;
        if (t.startsWith(">") || t.startsWith("|") || t.startsWith("```")) continue;
        if (t.startsWith("#")) continue;
        return t.replace(/\s+/g, " ").slice(0, 280);
    }
    return trimmed.replace(/\s+/g, " ").slice(0, 280);
}

// ── Vault walker ──────────────────────────────────────────────────────

async function walkMarkdown(dir, out = []) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch { return out; }
    for (const e of entries) {
        if (e.name.startsWith(".")) continue;          // .obsidian/
        if (e.name === "_migrated") continue;           // legacy scratch (not present in current vault)
        const full = join(dir, e.name);
        if (e.isDirectory()) {
            await walkMarkdown(full, out);
        } else if (e.isFile() && e.name.endsWith(".md")) {
            // Skip meta pages that document the vault itself — they shouldn't
            // be retrievable as content answers (they were polluting results
            // for vendor and troubleshooting queries that share their vocab).
            if (e.name === "AGENTS.md") continue;
            if (e.name === "_Index.md") continue;
            out.push(full);
        }
    }
    return out;
}

async function loadVault() {
    const files = await walkMarkdown(VAULT_DIR);
    const docs = [];
    for (const file of files) {
        let raw;
        try { raw = await readFile(file, "utf8"); }
        catch { continue; }
        const { meta, body } = parseFrontmatter(raw);
        const slug = file.split(sep).pop().replace(/\.md$/, "");
        const name = meta.name || extractH1(body) || slug.replace(/-/g, " ");
        const aliases = Array.isArray(meta.aliases) ? meta.aliases : [];
        const tags = Array.isArray(meta.tags) ? meta.tags : [];
        const specialists = Array.isArray(meta.specialists) ? meta.specialists : [];
        const path = relative(VAULT_DIR, file).split(sep).join("/");
        docs.push({
            id: path,                  // unique (vault-relative path)
            slug,                       // basename without extension — used by wikilinks
            path,
            name,
            aliasesText: aliases.join(" "),
            tagsText: tags.join(" "),
            body: stripWikilinks(bodyWithoutH1(body)),
            // Stored / non-indexed:
            summary: firstParagraph(body),
            specialists,
            cloud: meta.cloud || null,
            clouds: Array.isArray(meta.clouds) ? meta.clouds : null,
            type: meta.type || null,
            wikilinks: [...extractWikilinkTargets(body)],
        });
    }
    return docs;
}

// ── Index (lazy memoised) ─────────────────────────────────────────────

let _indexPromise = null;

function buildIndex(docs) {
    const ms = new MiniSearch({
        fields: ["name", "aliasesText", "tagsText", "body"],
        storeFields: ["path", "name", "summary", "specialists", "cloud", "clouds", "type", "wikilinks"],
        searchOptions: {
            boost: { name: 3, aliasesText: 2.5, tagsText: 2 },
            prefix: true,
            fuzzy: 0.2,
            // OR so natural-language queries ("how many usable IPs in a /27
            // subnet on Azure vs AWS") aren't filtered to zero results because
            // a single token (like "vs" or "usable") happens not to appear in
            // any doc. BM25 still ranks docs that match more terms higher.
            combineWith: "OR",
        },
    });
    ms.addAll(docs);
    return ms;
}

async function getIndex() {
    if (!_indexPromise) {
        _indexPromise = (async () => {
            const docs = await loadVault();
            const ms = buildIndex(docs);
            const byId = new Map(docs.map((d) => [d.id, d]));
            const bySlug = new Map();
            // First-wins for ambiguous basenames (only `_Index` in current vault, never a
            // wikilink target). If a future authoring slip introduces a genuine collision,
            // it will surface in the broken-wikilink audit, not silently.
            for (const d of docs) if (!bySlug.has(d.slug)) bySlug.set(d.slug, d);
            return { ms, byId, bySlug, count: docs.length };
        })().catch((err) => {
            _indexPromise = null;       // retry on next call
            throw err;
        });
    }
    return _indexPromise;
}

// ── Snippet generation ────────────────────────────────────────────────

function snippet(doc, queryTerms, maxLen = 220) {
    const body = doc.body || "";
    if (!queryTerms.length || !body) return doc.summary || "";
    const lower = body.toLowerCase();
    let bestIdx = -1;
    for (const t of queryTerms) {
        if (!t) continue;
        const idx = lower.indexOf(t.toLowerCase());
        if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) bestIdx = idx;
    }
    if (bestIdx === -1) return doc.summary || body.slice(0, maxLen);
    const start = Math.max(0, bestIdx - 80);
    const end = Math.min(body.length, start + maxLen);
    const prefix = start > 0 ? "…" : "";
    const suffix = end < body.length ? "…" : "";
    return (prefix + body.slice(start, end) + suffix).replace(/\s+/g, " ");
}

// ── Filters ───────────────────────────────────────────────────────────

function matchesCloud(doc, cloud) {
    if (!cloud) return true;
    // Match if doc explicitly tags this cloud, OR if it's cloud-agnostic (Topic etc.).
    if (doc.cloud && doc.cloud === cloud) return true;
    if (doc.clouds && doc.clouds.includes(cloud)) return true;
    if (!doc.cloud && !doc.clouds) return true;
    return false;
}

function matchesSpecialist(doc, specialist) {
    if (!specialist) return true;
    return doc.specialists?.includes(specialist) ?? false;
}

// ── Public API ────────────────────────────────────────────────────────

export async function search({ query, specialist = null, cloud = null, limit = 8, expandLinks = false } = {}) {
    if (!query || typeof query !== "string" || !query.trim()) {
        return { ok: false, error: "Query is required.", query: query || "", results: [] };
    }
    const { ms, byId, bySlug, count } = await getIndex();
    const queryTerms = query.toLowerCase().split(/\W+/).filter(Boolean);

    // Over-fetch then post-filter so specialist/cloud filters don't starve the result list.
    const raw = ms.search(query);
    const wantSpec = specialist || null;
    const wantCloud = cloud || null;
    const filtered = raw.filter((r) => {
        const doc = byId.get(r.id);
        if (!doc) return false;
        return matchesSpecialist(doc, wantSpec) && matchesCloud(doc, wantCloud);
    });

    const topK = filtered.slice(0, limit);
    const results = topK.map((r) => {
        const doc = byId.get(r.id);
        const matchedFields = new Set();
        for (const fields of Object.values(r.match || {})) {
            for (const f of fields) {
                matchedFields.add(f === "aliasesText" ? "aliases" : f === "tagsText" ? "tags" : f);
            }
        }
        return {
            slug: doc.slug,
            path: doc.path,
            name: doc.name,
            snippet: snippet(doc, queryTerms),
            score: Number(r.score.toFixed(3)),
            matchedFields: [...matchedFields],
            specialists: doc.specialists,
            cloud: doc.cloud,
            type: doc.type,
        };
    });

    let expanded = null;
    if (expandLinks && results.length) {
        const seen = new Set(results.map((r) => r.slug));
        const expSlugs = [];
        for (const r of topK) {
            const doc = byId.get(r.id);
            if (!doc?.wikilinks?.length) continue;
            for (const target of doc.wikilinks) {
                if (seen.has(target)) continue;
                if (!bySlug.has(target)) continue;        // skip dangling refs
                seen.add(target);
                expSlugs.push({ target, from: doc.slug });
                if (expSlugs.length >= 5) break;
            }
            if (expSlugs.length >= 5) break;
        }
        expanded = expSlugs.map(({ target, from }) => {
            const doc = bySlug.get(target);
            return {
                slug: doc.slug,
                path: doc.path,
                name: doc.name,
                summary: doc.summary,
                from,
            };
        });
    }

    return {
        ok: true,
        query,
        specialist: wantSpec,
        cloud: wantCloud,
        totalMatches: filtered.length,
        totalIndexed: count,
        results,
        expanded,
    };
}

export function formatResults(r) {
    if (!r?.ok) {
        return `**vault search error:** ${r?.error || "unknown"}`;
    }
    const lines = [];
    const filterBits = [];
    if (r.specialist) filterBits.push(`specialist=\`${r.specialist}\``);
    if (r.cloud) filterBits.push(`cloud=\`${r.cloud}\``);
    const filterStr = filterBits.length ? ` (${filterBits.join(", ")})` : "";
    lines.push(`# Vault search — "${r.query}"${filterStr}`);
    lines.push("");
    lines.push(`**${r.totalMatches}** matching page(s) (showing top ${r.results.length} of ${r.totalIndexed} indexed).`);
    lines.push("");

    if (!r.results.length) {
        lines.push("_No matches. Try broader keywords, or call `cn_capabilities` to see specialist domains._");
        lines.push("");
        lines.push("---");
        lines.push("Analysis only — verify against vendor documentation before applying.");
        return lines.join("\n");
    }

    for (let i = 0; i < r.results.length; i++) {
        const x = r.results[i];
        const meta = [];
        if (x.matchedFields?.length) meta.push(`matched: ${x.matchedFields.join(", ")}`);
        if (x.specialists?.length) meta.push(`specialists: ${x.specialists.join(", ")}`);
        if (x.cloud) meta.push(`cloud: ${x.cloud}`);
        if (x.type) meta.push(`type: ${x.type}`);
        lines.push(`## ${i + 1}. ${x.name}  — \`${x.path}\` _(score ${x.score})_`);
        lines.push("");
        if (x.snippet) lines.push(`> ${x.snippet}`);
        lines.push("");
        if (meta.length) lines.push(`_${meta.join(" · ")}_`);
        lines.push("");
        lines.push(`Load full page: \`cn_vault_page({ page: "${x.path.replace(/\.md$/, "")}" })\`.`);
        lines.push("");
    }

    if (r.expanded?.length) {
        lines.push("## Related pages (1-hop wikilink expansion)");
        lines.push("");
        for (const e of r.expanded) {
            lines.push(`- **[[${e.slug}]]** — \`${e.path}\` (from ${e.from})`);
            if (e.summary) lines.push(`  > ${e.summary}`);
        }
        lines.push("");
    }

    lines.push("---");
    lines.push("Analysis only — verify against vendor documentation before applying.");
    return lines.join("\n");
}

// Test-only export for unit checks.
export const __internal = { parseFrontmatter, stripWikilinks, extractWikilinkTargets, firstParagraph };
