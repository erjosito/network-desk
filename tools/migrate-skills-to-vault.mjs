#!/usr/bin/env node

// Mechanical migration of network-desk skill MDs into the
// Obsidian-compatible vault staging area at extensions/network-desk/vault/_migrated/.
//
// Specialist personas (`specialists/<dir>/agents/<dir>.md`) are intentionally
// NOT migrated. Personas are executable scaffolding loaded by exact-lookup
// tools (`cn_role`, `cn_orchestrate`), not knowledge — indexing them would
// just pollute `cn_search` results. They stay where the runtime reads them.
//
// Phase 1 of the vault rollout. Non-destructive: the original
// extensions/network-desk/specialists/ tree is left intact so the existing
// cn_skill tool keeps working. Semantic refactor (Phase 2) happens in-place
// inside _migrated/.
//
// Usage:
//   node tools/migrate-skills-to-vault.mjs           # migrate (overwrites _migrated/)
//   node tools/migrate-skills-to-vault.mjs --clean   # wipe _migrated/ first
//   node tools/migrate-skills-to-vault.mjs --dry-run # print planned actions, write nothing

import { readFile, writeFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SPECIALISTS_DIR = join(REPO_ROOT, "extensions", "network-desk", "specialists");
const VAULT_DIR = join(REPO_ROOT, "extensions", "network-desk", "vault");
const MIGRATED_DIR = join(VAULT_DIR, "_migrated");

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const CLEAN = args.has("--clean");

const TODAY = new Date().toISOString().slice(0, 10);

// ── Helpers ──────────────────────────────────────────────────────────

async function pathExists(p) {
    try { await stat(p); return true; } catch { return false; }
}

// kebab-case-name → "Kebab Case Name"
function titleCase(kebab) {
    return kebab.split(/[-_]/).map((w) => w ? w[0].toUpperCase() + w.slice(1) : w).join(" ");
}

// Pull the first markdown H1 ("# Title") from a body and normalize it into a
// clean concept name. Three boilerplate shapes are stripped:
//   "# Skill: <Name>"                       → "<Name>"   (98/124 SKILL.md files)
//   "# <Name> — Skill Definition[: ...]"    → "<Name>"   (5/124 SKILL.md files)
//   "# <Name> — Agent Role Definition[...]" → "<Name>"   (agent role MDs)
//   "# <Name> (`prefix_tool_id`)"           → "<Name>"   (42/124 — trailing tool-id parenthetical)
// Genuine subtitle em-dashes like "# Addressing Plan — Multi-Cloud CIDR and IPAM Strategy"
// are preserved — only known boilerplate suffixes are stripped.
function extractTitle(body, fallback) {
    const match = body.match(/^#\s+(.+?)\s*$/m);
    if (!match) return fallback;
    let title = match[1];
    title = title.replace(/^(Skill|Agent):\s+/i, "");
    title = title.replace(/\s+[—-]\s+(Skill Definition|Agent Role Definition|Role Definition|Agent Definition).*$/i, "");
    title = title.replace(/\s+\(`?[a-z][a-z0-9]*[_-][a-z0-9][a-z0-9_-]*`?\)\s*$/i, "");
    return title.trim();
}

// YAML-quote a string value if it contains characters that require quoting
// (colons, brackets, leading special chars, etc.). Keeps unquoted form for the
// common simple case so frontmatter stays readable.
function yamlString(s) {
    const str = String(s);
    if (/^[\w][\w \-./()]*$/.test(str) && !/^(true|false|null|yes|no|~)$/i.test(str)) return str;
    return JSON.stringify(str); // double-quoted form is valid YAML
}

function yamlList(values) {
    return "[" + values.map(yamlString).join(", ") + "]";
}

function buildFrontmatter(fields) {
    const lines = ["---"];
    for (const [k, v] of Object.entries(fields)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
            lines.push(`${k}: ${yamlList(v)}`);
        } else {
            lines.push(`${k}: ${yamlString(v)}`);
        }
    }
    lines.push("---", "");
    return lines.join("\n");
}

async function walkDirs(root) {
    const out = [];
    let entries;
    try { entries = await readdir(root, { withFileTypes: true }); } catch { return out; }
    for (const e of entries) {
        if (e.isDirectory()) out.push(e.name);
    }
    return out.sort();
}

async function writeMigrated(targetPath, content) {
    if (DRY_RUN) {
        console.log(`  [dry-run] would write ${relative(REPO_ROOT, targetPath)}`);
        return;
    }
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf8");
}

// ── Migration ────────────────────────────────────────────────────────

async function cleanMigrated() {
    if (!(await pathExists(MIGRATED_DIR))) return;
    if (DRY_RUN) {
        console.log(`  [dry-run] would wipe ${relative(REPO_ROOT, MIGRATED_DIR)}`);
        return;
    }
    await rm(MIGRATED_DIR, { recursive: true, force: true });
    console.log(`  cleaned ${relative(REPO_ROOT, MIGRATED_DIR)}`);
}

async function migrateSkill(specialistDir, skillName) {
    const sourcePath = join(SPECIALISTS_DIR, specialistDir, "skills", skillName, "SKILL.md");
    if (!(await pathExists(sourcePath))) {
        return { skipped: true, reason: "SKILL.md missing", source: sourcePath };
    }
    const body = await readFile(sourcePath, "utf8");
    const title = extractTitle(body, titleCase(skillName));
    const sourceRel = relative(REPO_ROOT, sourcePath).split(sep).join("/");

    const frontmatter = buildFrontmatter({
        type: "skill",
        name: title,
        status: "needs-classification",
        updated: TODAY,
        tags: ["migrated", specialistDir],
        migration_source: sourceRel,
        original_specialist: specialistDir,
        original_skill: skillName,
    });

    const targetPath = join(MIGRATED_DIR, specialistDir, `${skillName}.md`);
    await writeMigrated(targetPath, frontmatter + body);
    return { skipped: false, target: targetPath };
}

async function main() {
    console.log(`network-desk vault migration${DRY_RUN ? " (dry-run)" : ""}`);
    console.log(`  source: ${relative(REPO_ROOT, SPECIALISTS_DIR)}`);
    console.log(`  target: ${relative(REPO_ROOT, MIGRATED_DIR)}`);
    console.log("");

    if (CLEAN) {
        console.log("Cleaning existing _migrated/ tree...");
        await cleanMigrated();
        console.log("");
    }

    const specialists = await walkDirs(SPECIALISTS_DIR);
    if (specialists.length === 0) {
        console.error(`  ERROR: no specialist directories found under ${SPECIALISTS_DIR}`);
        process.exit(1);
    }
    console.log(`Found ${specialists.length} specialist directories.`);
    console.log("");

    let skillsMigrated = 0;
    let skillsSkipped = 0;
    const skipped = [];

    for (const specialistDir of specialists) {
        console.log(`▸ ${specialistDir}`);

        const skillsRoot = join(SPECIALISTS_DIR, specialistDir, "skills");
        const skillNames = await walkDirs(skillsRoot);
        for (const skillName of skillNames) {
            const r = await migrateSkill(specialistDir, skillName);
            if (r.skipped) {
                skillsSkipped++;
                skipped.push(`skill: ${specialistDir}/${skillName} (${r.reason})`);
                console.log(`    [skip] ${skillName}: ${r.reason}`);
            } else {
                skillsMigrated++;
                console.log(`    [skill] ${skillName}`);
            }
        }
    }

    console.log("");
    console.log("─".repeat(60));
    console.log(`Summary:`);
    console.log(`  Skill MDs migrated:       ${skillsMigrated} (skipped ${skillsSkipped})`);
    if (skipped.length > 0) {
        console.log(`  Skipped items:`);
        for (const s of skipped) console.log(`    - ${s}`);
    }
    console.log("");
    if (!DRY_RUN) {
        console.log(`Next: review ${relative(REPO_ROOT, MIGRATED_DIR)} and start the semantic refactor (Phase 2).`);
    }
}

main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
