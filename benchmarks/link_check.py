#!/usr/bin/env python3
"""Static link checker for skills/network-desk/specialists/*.md.

Scans every specialist file for tokens of the form ``reference/<path>``
(backtick-delimited markdown code spans) and verifies the path resolves
against ``skills/network-desk/reference/``.

Exits 0 when all links are healthy, 1 when any are broken. Prints a per-file
breakdown so CI logs flag exactly which specialist needs an edit.

Why this exists
---------------
The 3 original prototype specialists shipped with 27 of 35 reference
pointers broken (Aug 2025 audit). Dead pointers degrade quality because the
model follows them, gets nothing, and improvises (e.g. the 5-octet CIDR
hallucination flagged by the A/B benchmark judge). This script is wired
into the Pattern G evolution to prevent regression as the remaining 17
specialists land.

Usage
-----
    python benchmarks/link_check.py            # check all specialists
    python benchmarks/link_check.py vnet-architect firewall-engineer  # check named only
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SPECIALISTS_DIR = REPO_ROOT / "skills" / "network-desk" / "specialists"
REFERENCE_DIR = REPO_ROOT / "skills" / "network-desk" / "reference"

REFERENCE_LINK_RE = re.compile(r"`(reference/[^`]+?\.md)`")


def check_file(path: Path) -> tuple[int, int, list[str]]:
    """Return (total_links, broken_count, broken_paths) for one specialist."""
    text = path.read_text(encoding="utf-8")
    links = REFERENCE_LINK_RE.findall(text)
    broken: list[str] = []
    for link in links:
        # `link` is "reference/Topics/...md" — resolve against vault root.
        rel = link.removeprefix("reference/")
        target = REFERENCE_DIR / rel
        if not target.exists():
            broken.append(link)
    return len(links), len(broken), broken


def main(argv: list[str]) -> int:
    if not SPECIALISTS_DIR.is_dir():
        print(f"ERROR: specialists dir not found at {SPECIALISTS_DIR}", file=sys.stderr)
        return 2

    names = argv[1:] or None
    files: list[Path]
    if names:
        files = []
        for n in names:
            p = SPECIALISTS_DIR / (n if n.endswith(".md") else f"{n}.md")
            if not p.exists():
                print(f"ERROR: {p} does not exist", file=sys.stderr)
                return 2
            files.append(p)
    else:
        files = sorted(SPECIALISTS_DIR.glob("*.md"))

    if not files:
        print("WARN: no specialist files found")
        return 0

    print(f"link_check: scanning {len(files)} specialist file(s)\n")
    total_links = 0
    total_broken = 0
    failing_files = 0
    for f in files:
        n, broken, broken_list = check_file(f)
        total_links += n
        total_broken += broken
        status = "OK  " if broken == 0 else "FAIL"
        print(f"  [{status}] {f.name}: {n - broken}/{n} valid")
        if broken:
            failing_files += 1
            for bp in broken_list:
                print(f"          BROKEN: {bp}")

    print(f"\nsummary: {total_links - total_broken}/{total_links} valid "
          f"across {len(files)} file(s); {failing_files} file(s) failing")
    return 0 if total_broken == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
