#!/usr/bin/env node
// Update batch-02/03/04 manifests: rewrite any `target: "Topics/<file>.md"` to
// reflect the current subfolder of that file on disk.
//
// Usage: node tools/update-manifest-paths.mjs [--dry-run]
//
// Reads vault/Topics/<subfolder>/<file>.md as the source of truth for where
// each file lives; rewrites manifest target paths accordingly. Safe to re-run.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const TOPICS = resolve(REPO_ROOT, 'extensions/network-desk/vault/Topics');
const MANIFEST_DIR = resolve(REPO_ROOT, 'tools/manifests');
const MANIFESTS = ['batch-02.json', 'batch-03.json', 'batch-04.json'];

const DRY = process.argv.includes('--dry-run');

async function buildFileIndex() {
  const idx = new Map();
  const folders = (await readdir(TOPICS, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  for (const folder of folders) {
    const files = await readdir(resolve(TOPICS, folder));
    for (const f of files) {
      if (!f.endsWith('.md')) continue;
      if (idx.has(f)) throw new Error(`Duplicate filename across subfolders: ${f}`);
      idx.set(f, `Topics/${folder}/${f}`);
    }
  }
  return idx;
}

async function main() {
  const idx = await buildFileIndex();
  console.log(`Indexed ${idx.size} files across Topics/<subfolders>.\n`);

  let totalChanged = 0;
  for (const name of MANIFESTS) {
    const path = resolve(MANIFEST_DIR, name);
    const raw = await readFile(path, 'utf8');
    const data = JSON.parse(raw);
    let changed = 0;
    for (const entry of data.moves ?? []) {
      const target = entry.target;
      if (!target?.startsWith('Topics/')) continue;
      const file = basename(target);
      const newTarget = idx.get(file);
      if (!newTarget) {
        console.warn(`  ${name}: file not found in index for target ${target}`);
        continue;
      }
      if (newTarget !== target) {
        entry.target = newTarget;
        changed++;
      }
    }
    totalChanged += changed;
    console.log(`  ${name}: ${changed} target(s) updated`);
    if (!DRY && changed > 0) {
      await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
    }
  }

  console.log(`\n${DRY ? 'Would update' : 'Updated'} ${totalChanged} target path(s).`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
