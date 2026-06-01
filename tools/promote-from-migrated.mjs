#!/usr/bin/env node

// Promotes pages out of vault/_migrated/ into their permanent home in the vault
// (Services/<cloud>/, Topics/, Patterns/, Vendors/, Labs/) per a JSON manifest.
//
// For each manifest entry the script:
//   1. Reads the source page from vault/<source>
//   2. Strips its existing (provenance-bearing) frontmatter
//   3. Builds new frontmatter per the type-specific template in vault/AGENTS.md
//   4. Writes the result to vault/<target> (creating parent dirs as needed)
//   5. Deletes the source file
//
// Idempotent re-runs: if the source no longer exists and the target does, the
// entry is reported as "already promoted" and skipped — so a manifest can be
// safely re-applied after a partial failure.
//
// Manifest format (JSON):
//   {
//     "batch": "01-services-azure-and-patterns",
//     "moves": [
//       {
//         "source": "_migrated/.../foo.md",
//         "target": "Services/Azure/Foo.md",
//         "type":   "service",                      // service | topic | pattern | vendor | lab
//         "name":   "Azure Foo",
//         "cloud":  "azure",                        // service only
//         "category": "networking",                 // service only
//         "clouds": ["azure","aws","gcp"],          // pattern only
//         "vendor_kind": "ngfw",                    // vendor only
//         "deployment":  "virtual-appliance",       // vendor only
//         "specialists": ["cn_hyb"],
//         "tags": ["expressroute","hybrid","bgp"]
//       }
//     ]
//   }
//
// Usage:
//   node tools/promote-from-migrated.mjs --manifest tools/manifests/batch-01.json
//   node tools/promote-from-migrated.mjs --manifest tools/manifests/batch-01.json --dry-run

import { readFile, writeFile, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const VAULT_ROOT = join(REPO_ROOT, "extensions", "network-desk", "vault");

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const manifestIdx = argv.indexOf("--manifest");
if (manifestIdx === -1 || !argv[manifestIdx + 1]) {
    console.error("ERROR: --manifest <path> is required.");
    console.error("  e.g. node tools/promote-from-migrated.mjs --manifest tools/manifests/batch-01.json");
    process.exit(2);
}
const MANIFEST_PATH = resolve(argv[manifestIdx + 1]);

const TODAY = new Date().toISOString().slice(0, 10);

const TYPE_FIELDS = {
    service: ["cloud", "category"],
    topic: [],
    pattern: ["clouds"],
    vendor: ["vendor_kind", "deployment"],
    lab: ["date", "repo", "outcome"],
};

// ---------------------------------------------------------------------------
// YAML emission — match the style used by AGENTS.md page templates.
// We never emit fields we weren't given, and we keep field order stable so
// diffs against AGENTS.md templates stay readable.
// ---------------------------------------------------------------------------

function yamlScalar(v) {
    if (typeof v !== "string") return String(v);
    if (/[:#&*!|>%@`,\[\]\{\}'"\\\n]|^\s|\s$|^-\s|^\d/.test(v)) {
        return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return v;
}

function yamlArray(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return "[]";
    return `[${arr.map(yamlScalar).join(", ")}]`;
}

function buildFrontmatter(entry) {
    const lines = ["---"];
    lines.push(`type: ${yamlScalar(entry.type)}`);
    lines.push(`name: ${yamlScalar(entry.name)}`);
    for (const f of TYPE_FIELDS[entry.type] || []) {
        if (entry[f] === undefined || entry[f] === null) continue;
        if (Array.isArray(entry[f])) {
            lines.push(`${f}: ${yamlArray(entry[f])}`);
        } else {
            lines.push(`${f}: ${yamlScalar(entry[f])}`);
        }
    }
    lines.push(`specialists: ${yamlArray(entry.specialists || [])}`);
    lines.push(`tags: ${yamlArray(entry.tags || [])}`);
    lines.push(`status: ${yamlScalar(entry.status || "stable")}`);
    lines.push(`updated: ${TODAY}`);
    lines.push("---", "");
    return lines.join("\n");
}

function stripExistingFrontmatter(content) {
    // Match leading "---\n ... \n---\n" block, then drop any single blank line
    // that immediately follows. The body is preserved verbatim from that point.
    const m = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    if (!m) return content;
    let rest = content.slice(m[0].length);
    rest = rest.replace(/^\r?\n/, "");
    return rest;
}

// Replace the body's first H1 with "# <newTitle>", so the visible page title
// in Obsidian (and the H1 field in the Phase-3 BM25 index, weight 3) matches
// the canonical name from frontmatter. The 124 migrated SKILL.md files all
// start with a boilerplate "# Skill: X" or "# X — Skill Definition" H1 that
// is misleading once the page has been reclassified.
function rewriteH1(body, newTitle) {
    const m = body.match(/^#\s+[^\n]*\r?\n+/);
    if (m) {
        return `# ${newTitle}\n\n` + body.slice(m[0].length);
    }
    return `# ${newTitle}\n\n` + body;
}

// ---------------------------------------------------------------------------

async function pathExists(p) {
    try { await stat(p); return true; } catch { return false; }
}

function validateEntry(entry, idx) {
    const errs = [];
    for (const f of ["source", "target", "type", "name", "specialists"]) {
        if (!entry[f]) errs.push(`missing required field '${f}'`);
    }
    if (entry.type && !TYPE_FIELDS[entry.type]) {
        errs.push(`unknown type '${entry.type}' (allowed: ${Object.keys(TYPE_FIELDS).join(", ")})`);
    }
    if (entry.type === "service") {
        if (!entry.cloud) errs.push("type=service requires 'cloud'");
        if (!entry.category) errs.push("type=service requires 'category'");
    }
    if (entry.type === "pattern" && !entry.clouds) {
        errs.push("type=pattern requires 'clouds'");
    }
    if (entry.type === "vendor") {
        if (!entry.vendor_kind) errs.push("type=vendor requires 'vendor_kind'");
        if (!entry.deployment) errs.push("type=vendor requires 'deployment'");
    }
    if (entry.target && !entry.target.endsWith(".md")) {
        errs.push(`target '${entry.target}' must end in .md`);
    }
    if (entry.target && entry.target.startsWith("_migrated/")) {
        errs.push(`target '${entry.target}' must not be inside _migrated/`);
    }
    if (entry.source && !entry.source.startsWith("_migrated/")) {
        errs.push(`source '${entry.source}' must be inside _migrated/`);
    }
    if (errs.length > 0) {
        throw new Error(`manifest entry [${idx}]:\n  - ${errs.join("\n  - ")}`);
    }
}

async function promoteEntry(entry) {
    const sourceAbs = join(VAULT_ROOT, entry.source);
    const targetAbs = join(VAULT_ROOT, entry.target);
    const sourceExists = await pathExists(sourceAbs);
    const targetExists = await pathExists(targetAbs);

    if (!sourceExists && targetExists) {
        return { status: "already-promoted", from: entry.source, to: entry.target };
    }
    if (!sourceExists && !targetExists) {
        return { status: "missing-source", from: entry.source, to: entry.target };
    }
    if (sourceExists && targetExists) {
        return { status: "target-exists", from: entry.source, to: entry.target };
    }

    const content = await readFile(sourceAbs, "utf8");
    const body = rewriteH1(stripExistingFrontmatter(content), entry.name);
    const newContent = buildFrontmatter(entry) + body;

    if (DRY_RUN) {
        return { status: "would-promote", from: entry.source, to: entry.target, bytes: newContent.length };
    }

    await mkdir(dirname(targetAbs), { recursive: true });
    await writeFile(targetAbs, newContent, "utf8");
    await rm(sourceAbs);
    return { status: "promoted", from: entry.source, to: entry.target, bytes: newContent.length };
}

// ---------------------------------------------------------------------------

async function main() {
    const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    if (!Array.isArray(manifest.moves)) {
        console.error("ERROR: manifest must contain a 'moves' array.");
        process.exit(2);
    }

    console.log(`Promoting batch '${manifest.batch || "(unnamed)"}'${DRY_RUN ? " (dry-run)" : ""}`);
    console.log(`  manifest: ${relative(REPO_ROOT, MANIFEST_PATH)}`);
    console.log(`  vault:    ${relative(REPO_ROOT, VAULT_ROOT)}`);
    console.log(`  entries:  ${manifest.moves.length}`);
    console.log("");

    manifest.moves.forEach(validateEntry);

    const tally = { promoted: 0, "would-promote": 0, "already-promoted": 0, "missing-source": 0, "target-exists": 0 };
    const failures = [];

    for (const entry of manifest.moves) {
        try {
            const r = await promoteEntry(entry);
            tally[r.status] = (tally[r.status] || 0) + 1;
            const tag = {
                promoted:          "[ok]      ",
                "would-promote":   "[dry-run] ",
                "already-promoted":"[skip]    ",
                "missing-source":  "[missing] ",
                "target-exists":   "[conflict]",
            }[r.status] || "[?]       ";
            console.log(`  ${tag} ${r.from}  →  ${r.to}`);
        } catch (err) {
            failures.push({ entry, err });
            console.log(`  [ERROR]   ${entry.source}: ${err.message}`);
        }
    }

    console.log("");
    console.log("─".repeat(60));
    console.log(`Summary:`);
    for (const [k, v] of Object.entries(tally)) {
        if (v > 0) console.log(`  ${k.padEnd(18)} ${v}`);
    }
    if (failures.length > 0) {
        console.log(`  ${failures.length} failure(s)`);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
