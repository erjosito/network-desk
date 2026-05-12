#!/usr/bin/env node

import { cp, rm, mkdir, access, readdir, readFile, appendFile, writeFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, "..");
const EXTENSION_SRC = join(PKG_ROOT, "extensions", "cloud-networking");
const COPILOT_DIR = join(homedir(), ".copilot");
const EXT_DEST = join(COPILOT_DIR, "extensions", "cloud-networking");

const GITIGNORE_ENTRY = ".github/extensions/cloud-networking/";

const SPECIALIST_NAMES = [
    "vnet-architect", "firewall-engineer", "load-balancer",
    "dns-specialist", "private-link", "hybrid-connectivity",
    "network-security", "network-troubleshooter", "vwan-sdwan",
    "network-monitor", "multi-cloud-net",
];

const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const log = (msg) => console.log(msg);
const ok = (msg) => log(`${GREEN}✓${RESET} ${msg}`);
const err = (msg) => log(`${RED}✗${RESET} ${msg}`);
const info = (msg) => log(`${DIM}${msg}${RESET}`);

async function exists(path) {
    try { await access(path); return true; } catch { return false; }
}

// ── Commands ──────────────────────────────────────────────────────────

function findGitRoot() {
    try {
        return execSync("git rev-parse --show-toplevel", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    } catch {
        return null;
    }
}

async function addToGitignore(repoRoot) {
    const gitignorePath = join(repoRoot, ".gitignore");
    try {
        const content = await readFile(gitignorePath, "utf8");
        if (content.includes(GITIGNORE_ENTRY)) return;
        const separator = content.endsWith("\n") ? "" : "\n";
        await appendFile(gitignorePath, `${separator}\n# Cloud Networking extension (installed per-developer)\n${GITIGNORE_ENTRY}\n`);
    } catch {
        await writeFile(gitignorePath, `# Cloud Networking extension (installed per-developer)\n${GITIGNORE_ENTRY}\n`);
    }
    ok(`Added ${GITIGNORE_ENTRY} to .gitignore`);
}

async function initProject() {
    log("");
    log(`${CYAN}Cloud Networking${RESET} — installing extensions (project-level)`);
    log("");

    const repoRoot = findGitRoot();
    const projectRoot = repoRoot || process.cwd();

    if (!repoRoot) {
        info("Not inside a git repository — initializing one...");
        execSync("git init", { cwd: projectRoot, stdio: "ignore" });
        ok(`Initialized git repository in ${projectRoot}`);
    }

    const projectDest = join(projectRoot, ".github", "extensions", "cloud-networking");

    if (await exists(projectDest)) {
        info("Existing project-level installation found — replacing...");
        await rm(projectDest, { recursive: true, force: true });
    }

    await mkdir(join(projectRoot, ".github", "extensions"), { recursive: true });
    await cp(EXTENSION_SRC, projectDest, { recursive: true });
    ok("Extension installed to .github/extensions/cloud-networking/");

    await addToGitignore(projectRoot);

    const specialistsDir = join(projectDest, "specialists");
    if (await exists(specialistsDir)) {
        const specialists = (await readdir(specialistsDir, { withFileTypes: true }))
            .filter(d => d.isDirectory())
            .map(d => d.name);
        ok(`${specialists.length} specialists loaded: ${specialists.join(", ")}`);
    }

    log("");
    log("Get started:");
    log("");
    log(`  ${DIM}# Launch Copilot from this repo (no experimental mode needed):${RESET}`);
    log(`  copilot`);
    log("");
    log(`  ${DIM}# The extension loads automatically from .github/extensions/${RESET}`);
    log("");
}

async function init() {
    log("");
    log(`${CYAN}Cloud Networking${RESET} — installing extensions`);
    log("");

    const extDir = join(COPILOT_DIR, "extensions");
    await mkdir(extDir, { recursive: true });

    // Remove individual specialist extensions that conflict with the bundle
    let removed = 0;
    for (const name of SPECIALIST_NAMES) {
        const p = join(extDir, name);
        if (await exists(p)) {
            await rm(p, { recursive: true, force: true });
            removed++;
        }
    }
    if (removed > 0) {
        ok(`Removed ${removed} individual specialist extension(s) (replaced by bundle)`);
    }

    if (await exists(EXT_DEST)) {
        info("Existing installation found — replacing...");
        await rm(EXT_DEST, { recursive: true, force: true });
    }

    await cp(EXTENSION_SRC, EXT_DEST, { recursive: true });
    ok("Extension installed to ~/.copilot/extensions/cloud-networking/");

    const specialistsDir = join(EXT_DEST, "specialists");
    if (await exists(specialistsDir)) {
        const specialists = (await readdir(specialistsDir, { withFileTypes: true }))
            .filter(d => d.isDirectory())
            .map(d => d.name);
        ok(`${specialists.length} specialists loaded: ${specialists.join(", ")}`);
    }

    log("");
    log("Get started:");
    log("");
    log(`  ${DIM}# Launch Copilot with experimental mode (required for user-level extensions):${RESET}`);
    log(`  copilot --experimental`);
    log("");
    log(`  ${DIM}# Or install per-project instead (no experimental mode needed):${RESET}`);
    log(`  cloud-networking init --project`);
    log("");
}

async function uninstall() {
    const isProject = process.argv.includes("--project");

    log("");
    log(`${CYAN}Cloud Networking${RESET} — uninstalling${isProject ? " (project-level)" : ""}`);
    log("");

    if (isProject) {
        const repoRoot = findGitRoot();
        if (!repoRoot) {
            err("Not inside a git repository.");
            process.exit(1);
        }
        const projectDest = join(repoRoot, ".github", "extensions", "cloud-networking");
        if (await exists(projectDest)) {
            await rm(projectDest, { recursive: true, force: true });
            ok("Removed .github/extensions/cloud-networking/");
        } else {
            info("No project-level installation found.");
        }
    } else {
        if (await exists(EXT_DEST)) {
            await rm(EXT_DEST, { recursive: true, force: true });
            ok("Removed ~/.copilot/extensions/cloud-networking/");
        } else {
            info("Not installed — nothing to remove.");
        }

        const extDir = join(COPILOT_DIR, "extensions");
        for (const name of SPECIALIST_NAMES) {
            const p = join(extDir, name);
            if (await exists(p)) {
                await rm(p, { recursive: true, force: true });
                ok(`Removed leftover: ${name}`);
            }
        }
    }
    log("");
}

async function status() {
    log("");
    log(`${CYAN}Cloud Networking${RESET} — status`);
    log("");

    let found = false;

    if (await exists(EXT_DEST)) {
        found = true;
        ok("User-level: installed at ~/.copilot/extensions/cloud-networking/");
        info("  Requires: copilot --experimental");

        const specialistsDir = join(EXT_DEST, "specialists");
        if (await exists(specialistsDir)) {
            const specialists = (await readdir(specialistsDir, { withFileTypes: true }))
                .filter(d => d.isDirectory());
            ok(`  ${specialists.length} specialists available`);
            for (const s of specialists) {
                info(`    • ${s.name}`);
            }
        }

        const extDir = join(COPILOT_DIR, "extensions");
        const conflicts = [];
        for (const name of SPECIALIST_NAMES) {
            if (await exists(join(extDir, name))) conflicts.push(name);
        }
        if (conflicts.length > 0) {
            err(`  ${conflicts.length} conflicting individual extension(s) found — run 'cloud-networking init' to fix`);
        }
    }

    const repoRoot = findGitRoot();
    if (repoRoot) {
        const projectDest = join(repoRoot, ".github", "extensions", "cloud-networking");
        if (await exists(projectDest)) {
            found = true;
            ok(`Project-level: installed at .github/extensions/cloud-networking/`);
            info("  Works without experimental mode");

            const specialistsDir = join(projectDest, "specialists");
            if (await exists(specialistsDir)) {
                const specialists = (await readdir(specialistsDir, { withFileTypes: true }))
                    .filter(d => d.isDirectory());
                ok(`  ${specialists.length} specialists available`);
            }
        }
    }

    if (!found) {
        err("Not installed. Run: cloud-networking init");
        info("  User-level:    cloud-networking init");
        info("  Project-level: cloud-networking init --project");
    }
    log("");
}

function showHelp() {
    log("");
    log(`${CYAN}Cloud Networking${RESET} — your cloud networking AI team`);
    log("");
    log("Usage: cloud-networking <command> [options]");
    log("");
    log("Commands:");
    log("  init              Install extensions to ~/.copilot/extensions/ (requires experimental mode)");
    log("  init --project    Install extensions to .github/extensions/ in current repo (no experimental mode needed)");
    log("  uninstall         Remove user-level extensions");
    log("  uninstall --project  Remove project-level extensions from current repo");
    log("  status            Check installation status (both user-level and project-level)");
    log("  help              Show this help");
    log("");
}

// ── Main ──────────────────────────────────────────────────────────────

const command = process.argv[2];
const flags = process.argv.slice(3);
const isProject = flags.includes("--project");

switch (command) {
    case "init":
        if (isProject) {
            await initProject();
        } else {
            await init();
        }
        break;
    case "uninstall":
    case "remove":
        await uninstall();
        break;
    case "status":
        await status();
        break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
        showHelp();
        break;
    default:
        err(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
}
