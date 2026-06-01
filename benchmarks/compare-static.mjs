// Tier 1: static + microbench comparison between upstream (dmauser/network-desk)
// and this fork. Run from repo root:
//
//   node benchmarks/compare-static.mjs
//
// Assumes upstream is cloned to a sibling directory at ../network-desk-upstream
// (e.g. via `git clone https://github.com/dmauser/network-desk ../network-desk-upstream`).
// Override with the UPSTREAM env var if you cloned it elsewhere.

import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const UPSTREAM = process.env.UPSTREAM ? resolve(process.env.UPSTREAM) : resolve(REPO, "..", "network-desk-upstream");

async function walk(dir, suffix = ".md", out = []) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch { return out; }
    for (const e of entries) {
        if (e.name.startsWith(".")) continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) await walk(full, suffix, out);
        else if (e.isFile() && e.name.endsWith(suffix)) out.push(full);
    }
    return out;
}

async function totalBytes(files) {
    let n = 0;
    for (const f of files) n += (await stat(f)).size;
    return n;
}

function fmtKB(n) { return (n / 1024).toFixed(1) + " KB"; }
function fmtPct(num, denom) { return denom ? ((num / denom) * 100).toFixed(1) + "%" : "n/a"; }

async function loadExtensionTools(extPath) {
    const src = await readFile(extPath, "utf8");
    const names = [...src.matchAll(/^\s+name:\s*"(cn_[a-z_]+)"/gm)].map((m) => m[1]);
    return { src, tools: names };
}

function parseRegistryPrefixes(src) {
    // REGISTRY entries look like:    vnet: { dir: "vnet-architect", domain: ..., ..., skills: { ... } }
    // The opening brace + dir field on the same line is the discriminator.
    return [...src.matchAll(/^\s+([a-z][a-z0-9]+):\s*\{\s*dir:\s*"([^"]+)"/gm)].map((m) => ({
        prefix: m[1],
        dir: m[2],
    }));
}

function parseSkillCounts(src) {
    const blocks = [];
    const re = /skills:\s*\{\n([\s\S]*?)\n\s+\},?\n/g;
    let m;
    while ((m = re.exec(src))) {
        const body = m[1];
        // Each skill entry: `            "kebab-name": "description ...",`
        const keys = [...body.matchAll(/^\s+"([a-z][a-z0-9-]+)":\s*"/gm)].map((x) => x[1]);
        blocks.push(keys);
    }
    return blocks;
}

async function buildSearchIndex() {
    const t0 = performance.now();
    const mod = await import("../extensions/network-desk/lib/vault-search.mjs");
    const t1 = performance.now();
    // First search triggers index build.
    await mod.search({ query: "warmup", limit: 1 });
    const t2 = performance.now();
    return {
        importMs: t1 - t0,
        coldSearchMs: t2 - t1,
        search: mod.search,
    };
}

async function microbench(search) {
    const queries = [
        "bgp peering", "expressroute fastpath", "firewall ha", "nat egress cost",
        "private endpoint dns", "load balancer", "vnet peering", "azure firewall",
        "vpn gateway", "ddos", "transit gateway", "subnet planning",
    ];
    const latencies = [];
    for (let iter = 0; iter < 5; iter++) {
        for (const q of queries) {
            const t = performance.now();
            await search({ query: q, limit: 8 });
            latencies.push(performance.now() - t);
        }
    }
    latencies.sort((a, b) => a - b);
    const p = (q) => latencies[Math.floor(latencies.length * q)].toFixed(2);
    const mean = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
    return { n: latencies.length, mean, p50: p(0.5), p95: p(0.95), p99: p(0.99), max: latencies.at(-1).toFixed(2) };
}

function table(headers, rows) {
    const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
    const sep = "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |";
    const fmt = (r) => "| " + r.map((c, i) => String(c).padEnd(widths[i])).join(" | ") + " |";
    return [fmt(headers), sep, ...rows.map(fmt)].join("\n");
}

async function main() {
    const sides = [
        { label: "upstream", root: UPSTREAM, dir: join(UPSTREAM, "extensions", "network-desk") },
        { label: "ours",     root: REPO,     dir: join(REPO, "extensions", "network-desk") },
    ];

    const report = [];
    report.push("# Network-desk: upstream vs ours — static + microbench");
    report.push("");
    report.push(`Generated ${new Date().toISOString()}`);
    report.push("");
    report.push(`- **upstream** = \`${UPSTREAM}\` (dmauser/network-desk @ master)`);
    report.push(`- **ours**     = \`${REPO}\` (erjosito/network-desk + Phase 1-3 local commits)`);
    report.push("");

    // ── Content footprint ──────────────────────────────────────────────
    report.push("## 1. Content footprint");
    report.push("");
    const contentRows = [];
    const totals = {};
    for (const side of sides) {
        const extDir = side.dir;
        const specs = await walk(join(extDir, "specialists"));
        const vault = await walk(join(extDir, "vault"));
        const rootMd = (await walk(extDir)).filter((p) =>
            !p.includes(`${"specialists"}${"\\".repeat(0)}`) && !p.includes("vault") && !p.includes("specialists"));
        const allMd = await walk(extDir);
        totals[side.label] = {
            specs: specs.length, specBytes: await totalBytes(specs),
            vault: vault.length, vaultBytes: await totalBytes(vault),
            all: allMd.length, allBytes: await totalBytes(allMd),
        };
        contentRows.push([
            side.label,
            specs.length, fmtKB(totals[side.label].specBytes),
            vault.length, fmtKB(totals[side.label].vaultBytes),
            allMd.length, fmtKB(totals[side.label].allBytes),
        ]);
    }
    report.push(table(
        ["side", "specialists .md", "specialists KB", "vault .md", "vault KB", "all .md", "all KB"],
        contentRows,
    ));
    const u = totals.upstream, o = totals.ours;
    report.push("");
    report.push(`- **Delta:** ours has **+${o.all - u.all} .md files** (+${fmtPct(o.all - u.all, u.all)}), **+${fmtKB(o.allBytes - u.allBytes)}** total (+${fmtPct(o.allBytes - u.allBytes, u.allBytes)}).`);
    report.push(`- The vault layer (\`extensions/network-desk/vault/\`) is **net new** in ours — ${o.vault} pages, ${fmtKB(o.vaultBytes)}.`);
    report.push("");

    // ── Tool surface ───────────────────────────────────────────────────
    report.push("## 2. Tool surface");
    report.push("");
    const toolRows = [];
    const tools = {};
    for (const side of sides) {
        const { tools: t } = await loadExtensionTools(join(side.dir, "extension.mjs"));
        tools[side.label] = t;
        toolRows.push([side.label, t.length, t.join(", ")]);
    }
    report.push(table(["side", "tools", "names"], toolRows));
    const added = tools.ours.filter((t) => !tools.upstream.includes(t));
    const removed = tools.upstream.filter((t) => !tools.ours.includes(t));
    report.push("");
    if (added.length) report.push(`- **Added:** \`${added.join("`, `")}\``);
    if (removed.length) report.push(`- **Removed:** \`${removed.join("`, `")}\``);
    if (!added.length && !removed.length) report.push("- No diff (same tool surface).");
    report.push("");

    // ── REGISTRY parity (specialist + skill count) ────────────────────
    report.push("## 3. Specialist + skill registry");
    report.push("");
    const regRows = [];
    const regData = {};
    for (const side of sides) {
        const src = await readFile(join(side.dir, "extension.mjs"), "utf8");
        const prefixes = parseRegistryPrefixes(src);
        const skillBlocks = parseSkillCounts(src);
        const skillTotal = skillBlocks.reduce((n, s) => n + s.length, 0);
        regData[side.label] = { prefixes, skillBlocks, skillTotal };
        regRows.push([side.label, prefixes.length, skillTotal, (skillTotal / prefixes.length).toFixed(1)]);
    }
    report.push(table(["side", "specialists", "skills (total)", "avg skills/specialist"], regRows));
    const upPrefixes = new Set(regData.upstream.prefixes.map((p) => p.prefix));
    const oursPrefixes = new Set(regData.ours.prefixes.map((p) => p.prefix));
    const addedSp = [...oursPrefixes].filter((p) => !upPrefixes.has(p));
    const removedSp = [...upPrefixes].filter((p) => !oursPrefixes.has(p));
    report.push("");
    if (addedSp.length) report.push(`- **Added specialists:** ${addedSp.map((p) => "`" + p + "`").join(", ")}`);
    if (removedSp.length) report.push(`- **Removed specialists:** ${removedSp.map((p) => "`" + p + "`").join(", ")}`);
    if (!addedSp.length && !removedSp.length) report.push("- Same specialist set (registry parity confirmed).");
    report.push("");

    // ── Runtime deps ───────────────────────────────────────────────────
    report.push("## 4. Runtime dependencies");
    report.push("");
    const depRows = [];
    for (const side of sides) {
        let pkg = {};
        try { pkg = JSON.parse(await readFile(join(side.root, "package.json"), "utf8")); }
        catch { pkg = {}; }
        const deps = Object.keys(pkg.dependencies || {});
        depRows.push([side.label, deps.length, deps.length ? deps.join(", ") : "(none)"]);
    }
    report.push(table(["side", "dep count", "deps"], depRows));
    report.push("");

    // ── extension.mjs size ─────────────────────────────────────────────
    report.push("## 5. extension.mjs size");
    report.push("");
    const sizeRows = [];
    for (const side of sides) {
        const src = await readFile(join(side.dir, "extension.mjs"), "utf8");
        sizeRows.push([side.label, src.split("\n").length, src.length + " bytes"]);
    }
    report.push(table(["side", "LOC", "bytes"], sizeRows));
    report.push("");

    // ── Microbench: cn_search (ours only) ──────────────────────────────
    report.push("## 6. Microbench — cn_search cold-start + per-query latency");
    report.push("");
    report.push("Upstream has no equivalent search tool, so this section measures only the new `cn_search` runtime cost.");
    report.push("");
    const idx = await buildSearchIndex();
    report.push(`- **vault-search.mjs import:** ${idx.importMs.toFixed(2)} ms (one-time)`);
    report.push(`- **First cn_search call (cold — builds index):** ${idx.coldSearchMs.toFixed(2)} ms`);
    const bench = await microbench(idx.search);
    report.push(`- **Warm cn_search latency** (${bench.n} samples across ${12} representative queries × 5 iterations):`);
    report.push(`  - mean = ${bench.mean} ms, p50 = ${bench.p50} ms, p95 = ${bench.p95} ms, p99 = ${bench.p99} ms, max = ${bench.max} ms`);
    report.push("");

    // ── Summary ────────────────────────────────────────────────────────
    report.push("## 7. Summary");
    report.push("");
    report.push("| | upstream | ours | delta |");
    report.push("|---|---:|---:|---:|");
    report.push(`| Markdown files | ${u.all} | ${o.all} | +${o.all - u.all} (+${fmtPct(o.all - u.all, u.all)}) |`);
    report.push(`| Markdown KB    | ${fmtKB(u.allBytes)} | ${fmtKB(o.allBytes)} | +${fmtKB(o.allBytes - u.allBytes)} (+${fmtPct(o.allBytes - u.allBytes, u.allBytes)}) |`);
    report.push(`| Vault pages    | ${u.vault} | ${o.vault} | +${o.vault - u.vault} |`);
    report.push(`| Tools          | ${tools.upstream.length} | ${tools.ours.length} | +${tools.ours.length - tools.upstream.length} |`);
    report.push(`| Specialists    | ${regData.upstream.prefixes.length} | ${regData.ours.prefixes.length} | ${regData.ours.prefixes.length - regData.upstream.prefixes.length >= 0 ? "+" : ""}${regData.ours.prefixes.length - regData.upstream.prefixes.length} |`);
    report.push(`| Runtime deps   | (see §4) | (see §4) | +1 (minisearch) |`);
    report.push("");

    console.log(report.join("\n"));

    // If --out <path> supplied, also persist as UTF-8 (no BOM).
    const outIdx = process.argv.indexOf("--out");
    if (outIdx !== -1 && process.argv[outIdx + 1]) {
        const outPath = resolve(process.argv[outIdx + 1]);
        await mkdir(dirname(outPath), { recursive: true });
        await writeFile(outPath, report.join("\n") + "\n", { encoding: "utf8" });
        console.error(`\n(saved to ${outPath})`);
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
