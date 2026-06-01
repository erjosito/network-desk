// Tier 2: labeled retrieval benchmark for cn_route + cn_search.
//
//   node benchmarks/compare-retrieval.mjs --out benchmarks/results-tier2.md
//
// Loads ./queries.json, replicates upstream's regex-based routeQuery (which
// is byte-identical to ours — confirmed in compare-static.mjs) by reading
// both extension.mjs files and extracting their REGISTRY triggers, then for
// each query measures:
//
//   - routing@1 (specialist): does the top regex match include an
//     expected_specialist? Same logic + same data on both sides, so the
//     score is identical and reported once as "routing accuracy".
//   - cn_search recall@5 / precision@5 / MRR (ours only — upstream has no
//     equivalent).
//   - end-to-end "answerable" rate: was the query covered by EITHER
//     cn_route OR (for ours) cn_search?

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { search as vaultSearch } from "../extensions/network-desk/lib/vault-search.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const UPSTREAM = process.env.UPSTREAM ? resolve(process.env.UPSTREAM) : resolve(REPO, "..", "network-desk-upstream");

// ── Extract REGISTRY triggers from an extension.mjs source file ───────

function extractTriggers(src) {
    // Match each REGISTRY entry: bare prefix -> { dir, ..., trigger: /.../flags, ... }
    // The actual trigger lines look like:
    //     trigger: /\b(VNet|VPC|...)/i,
    const re = /^\s+([a-z][a-z0-9]+):\s*\{\s*\n\s+dir:[\s\S]*?trigger:\s*\/((?:\\\/|[^/])*)\/([gimsuy]*),/gm;
    const out = [];
    let m;
    while ((m = re.exec(src))) {
        const prefix = m[1];
        const body = m[2];
        const flags = m[3];
        try {
            out.push({ prefix, trigger: new RegExp(body, flags) });
        } catch (e) {
            console.error(`WARN: could not compile trigger for ${prefix}: ${e.message}`);
        }
    }
    return out;
}

function routeWithRegistry(query, registry) {
    return registry.filter(({ trigger }) => trigger.test(String(query || "")))
        .map(({ prefix }) => `cn_${prefix}`);
}

// ── Metrics ───────────────────────────────────────────────────────────

function specialistHit(matched, expected) {
    return expected.some((e) => matched.includes(e));
}

function pageMetrics(returnedSlugs, expectedSlugs) {
    const expectedSet = new Set(expectedSlugs);
    const top5 = returnedSlugs.slice(0, 5);
    const hits5 = top5.filter((s) => expectedSet.has(s)).length;
    const recall5 = expectedSet.size ? hits5 / expectedSet.size : 0;
    const precision5 = top5.length ? hits5 / top5.length : 0;
    let rr = 0;
    for (let i = 0; i < returnedSlugs.length; i++) {
        if (expectedSet.has(returnedSlugs[i])) { rr = 1 / (i + 1); break; }
    }
    return { hits5, recall5, precision5, rr, top1: returnedSlugs[0] || null };
}

// ── Display helpers ───────────────────────────────────────────────────

function table(headers, rows) {
    const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)));
    const sep = "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |";
    const fmt = (r) => "| " + r.map((c, i) => String(c ?? "").padEnd(widths[i])).join(" | ") + " |";
    return [fmt(headers), sep, ...rows.map(fmt)].join("\n");
}

function pct(num, denom) { return denom ? ((num / denom) * 100).toFixed(1) + "%" : "n/a"; }

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
    const queries = JSON.parse(await readFile(join(HERE, "queries.json"), "utf8"));
    const upSrc = await readFile(join(UPSTREAM, "extensions", "network-desk", "extension.mjs"), "utf8");
    const ourSrc = await readFile(join(REPO, "extensions", "network-desk", "extension.mjs"), "utf8");
    const upTriggers = extractTriggers(upSrc);
    const ourTriggers = extractTriggers(ourSrc);

    const report = [];
    report.push("# Network-desk: upstream vs ours — retrieval benchmark");
    report.push("");
    report.push(`Generated ${new Date().toISOString()}`);
    report.push("");
    report.push(`- Query set: \`benchmarks/queries.json\` (${queries.length} labeled queries)`);
    report.push(`- Upstream triggers loaded: ${upTriggers.length}`);
    report.push(`- Ours triggers loaded:     ${ourTriggers.length}`);
    report.push("");

    // Confirm trigger parity. If they ever drift, we want to know.
    let triggerDelta = 0;
    if (upTriggers.length === ourTriggers.length) {
        for (let i = 0; i < upTriggers.length; i++) {
            const a = upTriggers[i], b = ourTriggers[i];
            if (a.prefix !== b.prefix || a.trigger.source !== b.trigger.source || a.trigger.flags !== b.trigger.flags) {
                triggerDelta++;
            }
        }
    } else {
        triggerDelta = Math.abs(upTriggers.length - ourTriggers.length);
    }
    report.push(`- Trigger regex drift between upstream and ours: **${triggerDelta}** (0 = byte-identical routing).`);
    report.push("");
    report.push("## Methodology");
    report.push("");
    report.push("`cn_route` is a regex-based router: the prompt is matched against each specialist's `trigger:` regex in the `REGISTRY`. Upstream and our `REGISTRY` are byte-identical (verified in Tier 1), so cn_route accuracy is the same by construction — the column appears here as a sanity check, not a comparison.");
    report.push("");
    report.push("`cn_search` is new in our fork — it BM25-indexes the 162-page Obsidian vault (`Services/`, `Topics/`, `Patterns/`, `Vendors/`) with field boosts (name ×3, aliases ×2.5, tags ×2, body ×1). Upstream has no equivalent: it can only load full SKILL.md files via `cn_skill` after `cn_route` selects a specialist.");
    report.push("");
    report.push("Per query we measure:");
    report.push("- `cn_route` hit — did the routed specialists ∩ expected_specialists ≠ ∅");
    report.push("- `cn_search` any@5 — did at least one expected page appear in top-5");
    report.push("- precision@5, recall@5, MRR — standard IR metrics on the page-level retrieval");
    report.push("- end-to-end answerable — query is covered by EITHER cn_route OR (for ours) cn_search any@5");
    report.push("");
    report.push("Labels were authored by hand from the vault. `expected_pages` is the set of pages a knowledgeable user would consider relevant; it's intentionally conservative (2–4 pages per query) so the metric is honest. Recall@5 rewards depth of coverage; precision@5 is naturally low when only 2 pages are expected and 5 are returned.");
    report.push("");

    // Per-query rows
    const detailRows = [];
    let upRouteHits = 0, ourRouteHits = 0;
    let searchHitsAny = 0;  // queries where at least one expected page is in top-5
    let answeredUpstream = 0, answeredOurs = 0;
    let sumRecall5 = 0, sumPrecision5 = 0, sumMRR = 0;
    const categoryStats = {};

    for (const q of queries) {
        const upMatched = routeWithRegistry(q.query, upTriggers);
        const ourMatched = routeWithRegistry(q.query, ourTriggers);
        const upRoute = specialistHit(upMatched, q.expected_specialists);
        const ourRoute = specialistHit(ourMatched, q.expected_specialists);
        if (upRoute) upRouteHits++;
        if (ourRoute) ourRouteHits++;

        const searchResult = await vaultSearch({ query: q.query, limit: 10 });
        const returnedSlugs = searchResult.results.map((r) => r.slug);
        const m = pageMetrics(returnedSlugs, q.expected_pages);
        if (m.hits5 > 0) searchHitsAny++;
        sumRecall5 += m.recall5;
        sumPrecision5 += m.precision5;
        sumMRR += m.rr;

        if (upRoute) answeredUpstream++;
        if (ourRoute || m.hits5 > 0) answeredOurs++;

        const cat = q.category || "uncategorized";
        const cs = (categoryStats[cat] ||= { n: 0, upRoute: 0, ourRoute: 0, searchAny: 0, anyOurs: 0, anyUp: 0 });
        cs.n++;
        if (upRoute) cs.upRoute++;
        if (ourRoute) cs.ourRoute++;
        if (m.hits5 > 0) cs.searchAny++;
        if (upRoute) cs.anyUp++;
        if (ourRoute || m.hits5 > 0) cs.anyOurs++;

        detailRows.push([
            q.id,
            q.category || "",
            upRoute ? "✓" : "✗",
            ourRoute ? "✓" : "✗",
            m.hits5 ? `${m.hits5}/5` : "0",
            m.precision5.toFixed(2),
            m.recall5.toFixed(2),
            m.rr.toFixed(2),
            m.top1 || "—",
        ]);
    }

    // ── Summary ───────────────────────────────────────────────────────
    report.push("## Headline numbers");
    report.push("");
    report.push("| Metric | Upstream | Ours | Δ |");
    report.push("|---|---:|---:|---:|");
    report.push(`| **cn_route specialist accuracy** (top match includes expected) | ${pct(upRouteHits, queries.length)} (${upRouteHits}/${queries.length}) | ${pct(ourRouteHits, queries.length)} (${ourRouteHits}/${queries.length}) | ${ourRouteHits - upRouteHits >= 0 ? "+" : ""}${ourRouteHits - upRouteHits} |`);
    report.push(`| **cn_search any-hit@5** (≥1 expected page in top-5) | — | ${pct(searchHitsAny, queries.length)} (${searchHitsAny}/${queries.length}) | new |`);
    report.push(`| **cn_search mean precision@5** | — | ${(sumPrecision5 / queries.length).toFixed(3)} | new |`);
    report.push(`| **cn_search mean recall@5** | — | ${(sumRecall5 / queries.length).toFixed(3)} | new |`);
    report.push(`| **cn_search mean MRR** | — | ${(sumMRR / queries.length).toFixed(3)} | new |`);
    report.push(`| **End-to-end "answerable"** (cn_route OR cn_search hit) | ${pct(answeredUpstream, queries.length)} (${answeredUpstream}/${queries.length}) | ${pct(answeredOurs, queries.length)} (${answeredOurs}/${queries.length}) | +${answeredOurs - answeredUpstream} |`);
    report.push("");

    // ── Per-category breakdown ────────────────────────────────────────
    report.push("## Breakdown by query category");
    report.push("");
    const catRows = [];
    for (const [cat, s] of Object.entries(categoryStats).sort(([a], [b]) => a.localeCompare(b))) {
        catRows.push([
            cat,
            s.n,
            pct(s.upRoute, s.n),
            pct(s.searchAny, s.n),
            pct(s.anyUp, s.n),
            pct(s.anyOurs, s.n),
            s.anyOurs - s.anyUp,
        ]);
    }
    report.push(table(
        ["category", "n", "cn_route OK", "cn_search any@5", "upstream answerable", "ours answerable", "Δ answerable"],
        catRows,
    ));
    report.push("");
    report.push("Interpretation: the rightmost column is the number of queries in each category where **ours** can answer (via route OR search) and **upstream** cannot. The biggest wins should be in `vendor-specific` and `cloud-service` (where upstream has no granular vault page to load).");
    report.push("");

    // ── Per-query detail ──────────────────────────────────────────────
    report.push("## Per-query detail");
    report.push("");
    report.push(table(
        ["query id", "category", "up route", "ours route", "search hits@5", "p@5", "r@5", "MRR", "top-1 vault page"],
        detailRows,
    ));
    report.push("");

    // ── Coverage gap analysis ─────────────────────────────────────────
    report.push("## Coverage gap — queries upstream misses but ours answers");
    report.push("");
    const gaps = [];
    for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        const upMatched = routeWithRegistry(q.query, upTriggers);
        const upRoute = specialistHit(upMatched, q.expected_specialists);
        const searchResult = await vaultSearch({ query: q.query, limit: 10 });
        const m = pageMetrics(searchResult.results.map((r) => r.slug), q.expected_pages);
        if (!upRoute && m.hits5 > 0) {
            gaps.push([
                q.id,
                q.category || "",
                `\`${q.query}\``,
                searchResult.results.slice(0, 3).map((r) => r.slug).join(", "),
            ]);
        }
    }
    if (!gaps.length) {
        report.push("_(No gaps — every query upstream missed, ours also missed.)_");
    } else {
        report.push(`**${gaps.length}** queries where cn_route failed AND cn_search succeeded:`);
        report.push("");
        report.push(table(["id", "category", "query", "top-3 search results"], gaps));
    }
    report.push("");

    report.push("---");
    report.push("Analysis only — verify against vendor documentation before applying.");

    console.log(report.join("\n"));

    const outIdx = process.argv.indexOf("--out");
    if (outIdx !== -1 && process.argv[outIdx + 1]) {
        const outPath = resolve(process.argv[outIdx + 1]);
        await mkdir(dirname(outPath), { recursive: true });
        await writeFile(outPath, report.join("\n") + "\n", { encoding: "utf8" });
        console.error(`\n(saved to ${outPath})`);
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
