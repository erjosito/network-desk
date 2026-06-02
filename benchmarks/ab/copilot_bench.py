#!/usr/bin/env python3
"""A/B benchmark harness: Pattern G (skill plugin) vs Upstream (extension).

Spawns Copilot CLI in non-interactive mode for each variant + query and
captures the JSONL session output. Then runs a judge pass that re-uses
Copilot CLI itself (a stronger model with high reasoning) to score the
two answers head-to-head.

Subcommands:
  run --variant {upstream,pattern-g} [--ids ...] [--max N]
      Install the variant if needed, run each query, save per-query
      stdout JSONL plus a parsed result JSON.
  judge [--ids ...]
      For every query that has results from both variants, build a
      side-by-side judge prompt, run it through Copilot CLI, parse the
      JSON verdict.
  report
      Aggregate everything under results/ into a single CSV + markdown
      summary in results/_summary/.

Models / flags are fixed at module scope so both variants run apples-to-apples.

Run from the repo root; requires `copilot` (>=1.0.40) on PATH and Node>=18
for the upstream installer.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import shutil
import statistics
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
QUERIES_FILE = REPO_ROOT / "benchmarks" / "queries.json"
AB_DIR = REPO_ROOT / "benchmarks" / "ab"
RESULTS_DIR = AB_DIR / "results"
PATTERN_G_PLUGIN = AB_DIR / "pattern-g-plugin"
PATTERN_G_SKILL_SRC = PATTERN_G_PLUGIN / ".claude-plugin" / "skills" / "network-desk"
USER_SKILLS_DIR = Path.home() / ".copilot" / "skills"
USER_SKILL_DST = USER_SKILLS_DIR / "network-desk"
UPSTREAM_WORKTREE = AB_DIR / "temp" / "upstream"

ANSWER_MODEL = "gpt-5.5"
ANSWER_EFFORT = "medium"
JUDGE_MODEL = "claude-opus-4.6"
JUDGE_EFFORT = "high"

ANSWER_TIMEOUT_S = 600
JUDGE_TIMEOUT_S = 600

PATTERN_G_SPECIALISTS = {"cn_vnet", "cn_fw", "cn_hyb"}

# Containment: prevent the model from going off-task with file-writing or
# graphics skills that other users happen to have installed. Both variants
# get the same exclusion list so the comparison stays fair.
#
# Copilot CLI exposes each loaded skill as a top-level tool whose name is
# the skill's bare directory name (no "skill=" or "skill()" wrapping), so
# `--excluded-tools "excalidraw"` is the correct form. The harness was
# previously trying `--deny-tool "skill(excalidraw)"`, which the CLI
# rejected ("Unknown tool name in the tool excludedlist"). Keep this list
# in sync with whatever skills/tools are installed on the runner; any
# entry not actually registered is silently ignored.
EXCLUDED_TOOLS = [
    # Productivity / diagram skills the model latched onto during the
    # first smoke run (produced a 2.7k-line .excalidraw under diagrams/).
    "excalidraw",
    "pptx",
    "docx",
    "xlsx",
    "web-artifacts-builder",
    "azure-lab",
    "loop",
    "expense-report",
    "powerpoint",
    "word-doc",
    "excel",
    "svg-to-ppt",
    "visual-explainer",
    "webpage-builder",
    "generate-slides",
    "generate-visual-plan",
    "generate-web-diagram",
    "markitdown",
    # File-write / shell tools — belt-and-suspenders against side-effects.
    "apply_patch",
    "write",
    "create",
    "edit",
    "shell",
    "bash",
    "powershell",
]

ANSWER_SUFFIX = (
    "\n\nAnswer in concise Markdown text only. "
    "Do not create or edit any files. Do not run any shell commands. "
    "Do not generate diagrams; describe them in text if needed."
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def run_copilot(
    prompt: str,
    *,
    model: str,
    effort: str,
    extra_args: list[str] | None = None,
    timeout_s: int = ANSWER_TIMEOUT_S,
) -> tuple[list[dict], str, str, int, int]:
    """Run `copilot -p` non-interactively, parse JSONL stdout, return events+raw."""
    cmd = [
        "copilot",
        "-p", prompt,
        "--allow-all-tools",
        "--no-ask-user",
        "--no-custom-instructions",
        "--output-format", "json",
        "--no-color",
        "--model", model,
        "--effort", effort,
    ]
    for tool in EXCLUDED_TOOLS:
        cmd.extend(["--excluded-tools", tool])
    if extra_args:
        cmd.extend(extra_args)
    start = time.monotonic()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout_s,
        )
        stdout, stderr, rc = proc.stdout, proc.stderr, proc.returncode
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout.decode("utf-8", "replace") if exc.stdout else ""
        stderr = exc.stderr.decode("utf-8", "replace") if exc.stderr else ""
        rc = -1
    wall_ms = int((time.monotonic() - start) * 1000)
    events: list[dict] = []
    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return events, stdout, stderr, rc, wall_ms


def extract_metrics(events: list[dict], wall_ms: int) -> dict[str, Any]:
    """Collapse a JSONL event stream into the metrics we care about."""
    content_parts: list[str] = []
    tool_calls: list[str] = []
    skills_invoked: list[str] = []
    output_tokens = 0
    api_duration_ms = 0
    session_duration_ms = 0
    premium_requests = 0
    session_id = None
    model = None
    skills_loaded: list[str] = []
    mcp_servers_loaded: list[str] = []
    lines_added = 0
    lines_removed = 0
    files_modified: list[str] = []
    for e in events:
        t = e.get("type")
        data = e.get("data") or {}
        if t == "assistant.message":
            content = data.get("content")
            if content:
                content_parts.append(content)
            output_tokens += int(data.get("outputTokens") or 0)
            model = model or data.get("model")
            for tc in data.get("toolRequests") or []:
                if isinstance(tc, dict):
                    name = tc.get("name") or tc.get("toolName")
                    args = tc.get("arguments") or {}
                else:
                    name = str(tc)
                    args = {}
                if not name:
                    continue
                tool_calls.append(name)
                # The `skill` tool surfaces every user/plugin skill as a
                # single registered tool whose `arguments.skill` field
                # identifies the actual invocation target. Track that
                # separately so we can tell whether `network-desk` was
                # actually invoked vs merely loaded.
                if name == "skill":
                    sk = args.get("skill") if isinstance(args, dict) else None
                    if sk:
                        skills_invoked.append(str(sk))
        elif t == "session.skills_loaded":
            skills_loaded = [s.get("name") for s in (data.get("skills") or []) if s.get("name")]
        elif t == "session.mcp_servers_loaded":
            mcp_servers_loaded = [s.get("name") for s in (data.get("servers") or []) if s.get("name")]
        elif t == "result":
            usage = e.get("usage") or {}
            session_id = e.get("sessionId")
            premium_requests = float(usage.get("premiumRequests") or 0)
            api_duration_ms = int(usage.get("totalApiDurationMs") or 0)
            session_duration_ms = int(usage.get("sessionDurationMs") or wall_ms)
            changes = usage.get("codeChanges") or {}
            lines_added = int(changes.get("linesAdded") or 0)
            lines_removed = int(changes.get("linesRemoved") or 0)
            files_modified = list(changes.get("filesModified") or [])
    network_skill_loaded = any(s == "network-desk" for s in skills_loaded)
    network_skill_invoked = "network-desk" in skills_invoked
    cn_tools_called = [c for c in tool_calls if c.startswith("cn_")]
    # Treat the answer as "on-architecture" when the variant's own
    # entry-point was actually used. Pattern-G enters through the
    # `network-desk` skill; the upstream extension exposes its router
    # under the `cn_*` tool prefix.
    architecture_used = network_skill_invoked or bool(cn_tools_called)
    return {
        "content": "\n\n".join(content_parts).strip(),
        "tool_calls": tool_calls,
        "skills_invoked": skills_invoked,
        "output_tokens": output_tokens,
        "api_duration_ms": api_duration_ms,
        "session_duration_ms": session_duration_ms,
        "wall_ms": wall_ms,
        "premium_requests": premium_requests,
        "session_id": session_id,
        "model": model,
        "skills_count": len(skills_loaded),
        "mcp_servers_count": len(mcp_servers_loaded),
        "network_skill_loaded": network_skill_loaded,
        "network_skill_invoked": network_skill_invoked,
        "cn_tools_called": cn_tools_called,
        "architecture_used": architecture_used,
        "lines_added": lines_added,
        "lines_removed": lines_removed,
        "files_modified": files_modified,
        "contaminated": bool(lines_added or lines_removed or files_modified),
    }


# ── Variant installers ──────────────────────────────────────────────────────

def install_pattern_g() -> None:
    """Copy the pattern-g skill into the user-level skills directory.

    Copilot CLI's --plugin-dir flag only loads MCP servers, not skills; the
    canonical way to surface a skill in a session is to drop it under
    ~/.copilot/skills/<name>/. We use copy (not symlink) so the install
    works regardless of developer permissions on Windows.
    """
    if not PATTERN_G_SKILL_SRC.exists():
        raise FileNotFoundError(
            f"Pattern G skill source missing: {PATTERN_G_SKILL_SRC}"
        )
    print("  installing pattern-g user-level skill …", flush=True)
    USER_SKILLS_DIR.mkdir(parents=True, exist_ok=True)
    if USER_SKILL_DST.exists():
        shutil.rmtree(USER_SKILL_DST)
    shutil.copytree(PATTERN_G_SKILL_SRC, USER_SKILL_DST)


def uninstall_pattern_g() -> None:
    if USER_SKILL_DST.exists():
        print("  uninstalling pattern-g user-level skill …", flush=True)
        shutil.rmtree(USER_SKILL_DST, ignore_errors=True)


def install_upstream() -> None:
    if not UPSTREAM_WORKTREE.exists():
        AB_DIR.joinpath("temp").mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["git", "worktree", "add", "-f", str(UPSTREAM_WORKTREE), "upstream/master"],
            check=True, cwd=REPO_ROOT,
        )
    print(f"  installing upstream user-level extension …", flush=True)
    subprocess.run(
        ["node", str(UPSTREAM_WORKTREE / "bin" / "cli.mjs"), "init"],
        check=True, cwd=UPSTREAM_WORKTREE,
    )


def uninstall_upstream() -> None:
    if not UPSTREAM_WORKTREE.exists():
        return
    print("  uninstalling upstream user-level extension …", flush=True)
    subprocess.run(
        ["node", str(UPSTREAM_WORKTREE / "bin" / "cli.mjs"), "uninstall"],
        cwd=UPSTREAM_WORKTREE,
    )


# ── Per-variant runner ──────────────────────────────────────────────────────

def run_variant_query(variant: str, query: dict) -> tuple[list[dict], str, str, int, int]:
    extra_args: list[str] = []
    if variant == "upstream":
        extra_args.append("--experimental")
    elif variant == "pattern-g":
        # Skill is installed at ~/.copilot/skills/network-desk/ by
        # install_pattern_g(); no extra CLI flag is needed.
        pass
    else:
        raise ValueError(f"Unknown variant: {variant}")
    prompt = query["query"] + ANSWER_SUFFIX
    return run_copilot(
        prompt,
        model=ANSWER_MODEL,
        effort=ANSWER_EFFORT,
        extra_args=extra_args,
    )


def cmd_run(args) -> int:
    queries = json.loads(QUERIES_FILE.read_text(encoding="utf-8"))
    if args.ids:
        wanted = set(s.strip() for s in args.ids.split(",") if s.strip())
        queries = [q for q in queries if q["id"] in wanted]
    elif args.pattern_g_only:
        queries = [
            q for q in queries
            if set(q.get("expected_specialists") or []) <= PATTERN_G_SPECIALISTS
            and q.get("expected_specialists")
        ]
    if args.max:
        queries = queries[: args.max]
    if not queries:
        print("No queries selected.", file=sys.stderr)
        return 1

    variant = args.variant
    out_dir = RESULTS_DIR / variant
    out_dir.mkdir(parents=True, exist_ok=True)

    if variant == "upstream":
        install_upstream()
    elif variant == "pattern-g":
        install_pattern_g()

    failures = 0
    try:
        for i, q in enumerate(queries, 1):
            qid = q["id"]
            if args.skip_existing and (out_dir / f"{qid}.json").exists():
                print(f"[{variant} {i}/{len(queries)}] {qid} (skipped: already exists)")
                continue
            print(f"[{variant} {i}/{len(queries)}] {qid}: {q['query'][:60]}", flush=True)
            events, stdout, stderr, rc, wall_ms = run_variant_query(variant, q)
            (out_dir / f"{qid}.jsonl").write_text(stdout, encoding="utf-8")
            if stderr:
                (out_dir / f"{qid}.stderr.log").write_text(stderr, encoding="utf-8")
            metrics = extract_metrics(events, wall_ms)
            result = {
                "id": qid,
                "variant": variant,
                "query": q["query"],
                "expected_specialists": q.get("expected_specialists"),
                "category": q.get("category"),
                "exit_code": rc,
                "metrics": metrics,
                "ts": now_iso(),
            }
            (out_dir / f"{qid}.json").write_text(
                json.dumps(result, indent=2), encoding="utf-8"
            )
            if rc != 0:
                failures += 1
                print(f"  FAIL rc={rc}", flush=True)
            else:
                contam = " CONTAM" if metrics["contaminated"] else ""
                arch_flag = ""
                if not metrics["architecture_used"]:
                    arch_flag = " ARCH_BYPASSED"
                elif variant == "pattern-g" and not metrics["network_skill_invoked"]:
                    arch_flag = " SKILL_NOT_INVOKED"
                print(
                    f"  wall={wall_ms}ms api={metrics['api_duration_ms']}ms "
                    f"out={metrics['output_tokens']}t premium={metrics['premium_requests']:g} "
                    f"tools={len(metrics['tool_calls'])} "
                    f"cn_tools={len(metrics['cn_tools_called'])} "
                    f"skills_invoked={','.join(metrics['skills_invoked']) or '-'}"
                    f"{arch_flag}{contam}",
                    flush=True,
                )
    finally:
        if variant == "upstream":
            uninstall_upstream()
        elif variant == "pattern-g":
            uninstall_pattern_g()

    return 0 if failures == 0 else 2


# ── Judge ───────────────────────────────────────────────────────────────────

JUDGE_PROMPT = """You are a strict, terse judge for cloud-networking answers.

Question:
{question}

Expected topic specialists (for context): {specialists}

--- Answer A ---
{answer_a}

--- Answer B ---
{answer_b}

Score each answer independently on a 0-10 scale (0=useless, 10=excellent) for:
  technical_accuracy, completeness, actionability, clarity, conciseness

Then pick the winner. Penalize hallucinated vendor flags, wrong CLI syntax,
or guidance that contradicts the platform documentation. Reward concrete,
verifiable detail; do not reward verbosity.

Return ONE single-line JSON object, NO markdown, NO commentary, exactly:
{{"A":{{"technical_accuracy":N,"completeness":N,"actionability":N,"clarity":N,"conciseness":N}},"B":{{"technical_accuracy":N,"completeness":N,"actionability":N,"clarity":N,"conciseness":N}},"winner":"A"|"B"|"tie","reason":"<=160 chars"}}
"""


def parse_judge_json(text: str) -> dict | None:
    """Pull the single-line JSON verdict out of the judge's response."""
    if not text:
        return None
    candidates: list[str] = []
    for line in text.splitlines():
        stripped = line.strip().lstrip("`").rstrip("`").strip()
        if stripped.startswith("{") and stripped.endswith("}"):
            candidates.append(stripped)
    # Also try the whole blob, in case the model used multi-line JSON
    blob = text.strip()
    if blob.startswith("{") and blob.endswith("}"):
        candidates.append(blob)
    for cand in candidates:
        try:
            obj = json.loads(cand)
            if isinstance(obj, dict) and "winner" in obj and "A" in obj and "B" in obj:
                return obj
        except json.JSONDecodeError:
            continue
    return None


def cmd_judge(args) -> int:
    queries = json.loads(QUERIES_FILE.read_text(encoding="utf-8"))
    qmap = {q["id"]: q for q in queries}
    pg_dir = RESULTS_DIR / "pattern-g"
    up_dir = RESULTS_DIR / "upstream"
    judge_dir = RESULTS_DIR / "judge"
    judge_dir.mkdir(parents=True, exist_ok=True)

    pg_ids = {p.stem for p in pg_dir.glob("*.json") if not p.stem.startswith("_")}
    up_ids = {p.stem for p in up_dir.glob("*.json") if not p.stem.startswith("_")}
    common = sorted(pg_ids & up_ids)
    if args.ids:
        wanted = set(s.strip() for s in args.ids.split(",") if s.strip())
        common = [qid for qid in common if qid in wanted]
    if not common:
        print("No paired results found to judge.", file=sys.stderr)
        return 1

    for i, qid in enumerate(common, 1):
        out_path = judge_dir / f"{qid}.json"
        if args.skip_existing and out_path.exists():
            print(f"[judge {i}/{len(common)}] {qid} (skipped)")
            continue
        q = qmap.get(qid)
        if not q:
            print(f"[judge {i}/{len(common)}] {qid} unknown query id, skipping")
            continue
        pg = json.loads((pg_dir / f"{qid}.json").read_text(encoding="utf-8"))
        up = json.loads((up_dir / f"{qid}.json").read_text(encoding="utf-8"))
        pg_text = pg["metrics"]["content"] or "(no answer text)"
        up_text = up["metrics"]["content"] or "(no answer text)"

        rng = random.Random(qid)
        order = ["pattern-g", "upstream"]
        rng.shuffle(order)
        first, second = order
        ans_first = pg_text if first == "pattern-g" else up_text
        ans_second = pg_text if second == "pattern-g" else up_text

        prompt = JUDGE_PROMPT.format(
            question=q["query"],
            specialists=",".join(q.get("expected_specialists") or []) or "(none)",
            answer_a=ans_first,
            answer_b=ans_second,
        )
        print(f"[judge {i}/{len(common)}] {qid}", flush=True)
        events, stdout, stderr, rc, wall_ms = run_copilot(
            prompt,
            model=JUDGE_MODEL,
            effort=JUDGE_EFFORT,
            timeout_s=JUDGE_TIMEOUT_S,
        )
        (judge_dir / f"{qid}.jsonl").write_text(stdout, encoding="utf-8")
        if stderr:
            (judge_dir / f"{qid}.stderr.log").write_text(stderr, encoding="utf-8")
        metrics = extract_metrics(events, wall_ms)
        verdict = parse_judge_json(metrics["content"])
        if verdict:
            mapped_winner = first if verdict["winner"] == "A" else (
                second if verdict["winner"] == "B" else "tie"
            )
        else:
            mapped_winner = None
        record = {
            "id": qid,
            "query": q["query"],
            "category": q.get("category"),
            "expected_specialists": q.get("expected_specialists"),
            "order": {"A": first, "B": second},
            "verdict": verdict,
            "winner_variant": mapped_winner,
            "judge_model": JUDGE_MODEL,
            "judge_effort": JUDGE_EFFORT,
            "judge_metrics": metrics,
            "exit_code": rc,
            "ts": now_iso(),
        }
        out_path.write_text(json.dumps(record, indent=2), encoding="utf-8")
        if verdict:
            print(
                f"  winner={mapped_winner} (slot {verdict['winner']}) "
                f"reason: {verdict.get('reason', '')[:120]}"
            )
        else:
            print(f"  could not parse verdict; raw len={len(metrics['content'])}")
    return 0


# ── Report ──────────────────────────────────────────────────────────────────


def safe_mean(xs):
    xs = [x for x in xs if isinstance(x, (int, float))]
    return round(statistics.mean(xs), 1) if xs else None


def cmd_report(args) -> int:
    summary_dir = RESULTS_DIR / "_summary"
    summary_dir.mkdir(parents=True, exist_ok=True)

    rows: list[dict] = []
    per_variant: dict[str, list[dict]] = {"pattern-g": [], "upstream": []}
    for variant in ("pattern-g", "upstream"):
        for path in sorted((RESULTS_DIR / variant).glob("*.json")):
            if path.stem.startswith("_"):
                continue
            try:
                rec = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            m = rec.get("metrics") or {}
            row = {
                "id": rec.get("id"),
                "variant": variant,
                "category": rec.get("category"),
                "exit_code": rec.get("exit_code"),
                "wall_ms": m.get("wall_ms"),
                "api_ms": m.get("api_duration_ms"),
                "session_ms": m.get("session_duration_ms"),
                "out_tokens": m.get("output_tokens"),
                "premium_requests": m.get("premium_requests"),
                "tool_calls": len(m.get("tool_calls") or []),
                "cn_tool_calls": len(m.get("cn_tools_called") or []),
                "skills_loaded": m.get("skills_count"),
                "network_skill_loaded": m.get("network_skill_loaded"),
                "network_skill_invoked": m.get("network_skill_invoked"),
                "architecture_used": m.get("architecture_used"),
                "contaminated": m.get("contaminated"),
                "lines_added": m.get("lines_added"),
            }
            rows.append(row)
            per_variant[variant].append(row)

    judge_rows: dict[str, dict] = {}
    judge_dir = RESULTS_DIR / "judge"
    if judge_dir.exists():
        for p in sorted(judge_dir.glob("*.json")):
            try:
                rec = json.loads(p.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            judge_rows[rec["id"]] = rec

    # Per-row CSV (answer runs)
    csv_path = summary_dir / "runs.csv"
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        import csv
        fieldnames = [
            "id", "variant", "category", "exit_code",
            "wall_ms", "api_ms", "session_ms",
            "out_tokens", "premium_requests",
            "tool_calls", "cn_tool_calls", "skills_loaded",
            "network_skill_loaded", "network_skill_invoked",
            "architecture_used", "contaminated", "lines_added",
        ]
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(r)

    # Aggregates
    agg = {}
    for variant, items in per_variant.items():
        if not items:
            continue
        agg[variant] = {
            "queries": len(items),
            "p50_wall_ms": int(statistics.median(x["wall_ms"] for x in items if x["wall_ms"])),
            "p95_wall_ms": int(_quantile([x["wall_ms"] for x in items if x["wall_ms"]], 0.95)),
            "p50_api_ms": int(statistics.median(x["api_ms"] for x in items if x["api_ms"])) if any(x["api_ms"] for x in items) else None,
            "mean_out_tokens": safe_mean(x["out_tokens"] for x in items),
            "mean_premium_requests": safe_mean(x["premium_requests"] for x in items),
            "mean_tool_calls": safe_mean(x["tool_calls"] for x in items),
            "mean_cn_tool_calls": safe_mean(x["cn_tool_calls"] for x in items),
            "contaminated_count": sum(1 for x in items if x.get("contaminated")),
            "architecture_used_rate": (
                sum(1 for x in items if x.get("architecture_used")) / len(items)
            ),
            "network_skill_load_rate": (
                sum(1 for x in items if x.get("network_skill_loaded")) / len(items)
                if variant == "pattern-g" else None
            ),
            "network_skill_invoke_rate": (
                sum(1 for x in items if x.get("network_skill_invoked")) / len(items)
                if variant == "pattern-g" else None
            ),
        }

    # Judge tally
    winners = {"pattern-g": 0, "upstream": 0, "tie": 0, "unparsed": 0}
    per_query_scores: list[dict] = []
    for qid, rec in judge_rows.items():
        winner = rec.get("winner_variant")
        if winner in winners:
            winners[winner] += 1
        else:
            winners["unparsed"] += 1
        verdict = rec.get("verdict") or {}
        order = rec.get("order") or {}
        per_query_scores.append({
            "id": qid,
            "winner_variant": winner,
            "reason": (verdict.get("reason") or "")[:160],
            "A": verdict.get("A"),
            "B": verdict.get("B"),
            "order": order,
        })

    # Per-axis score aggregates (mapped back to variant names)
    axis_totals = {
        "pattern-g": {k: [] for k in ("technical_accuracy", "completeness", "actionability", "clarity", "conciseness")},
        "upstream":  {k: [] for k in ("technical_accuracy", "completeness", "actionability", "clarity", "conciseness")},
    }
    for rec in judge_rows.values():
        verdict = rec.get("verdict") or {}
        order = rec.get("order") or {}
        for slot in ("A", "B"):
            variant = order.get(slot)
            scores = verdict.get(slot) or {}
            for axis in axis_totals["pattern-g"]:
                if variant in axis_totals and axis in scores:
                    axis_totals[variant][axis].append(scores[axis])
    axis_means = {
        variant: {axis: safe_mean(vals) for axis, vals in by_axis.items()}
        for variant, by_axis in axis_totals.items()
    }

    summary_obj = {
        "generated": now_iso(),
        "answer_model": ANSWER_MODEL,
        "answer_effort": ANSWER_EFFORT,
        "judge_model": JUDGE_MODEL,
        "judge_effort": JUDGE_EFFORT,
        "aggregates": agg,
        "judge_winners": winners,
        "judge_axis_means": axis_means,
        "per_query": per_query_scores,
    }
    (summary_dir / "summary.json").write_text(
        json.dumps(summary_obj, indent=2), encoding="utf-8"
    )

    md = render_markdown(summary_obj, rows, judge_rows)
    (summary_dir / "summary.md").write_text(md, encoding="utf-8")
    print(f"Wrote {csv_path}")
    print(f"Wrote {summary_dir / 'summary.json'}")
    print(f"Wrote {summary_dir / 'summary.md'}")
    return 0


def _quantile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    k = (len(values) - 1) * q
    f = int(k)
    c = min(f + 1, len(values) - 1)
    if f == c:
        return values[f]
    return values[f] + (values[c] - values[f]) * (k - f)


def render_markdown(summary: dict, rows: list[dict], judge_rows: dict) -> str:
    lines: list[str] = []
    lines.append("# Network Desk A/B Benchmark — Pattern G vs Upstream")
    lines.append(f"_Generated: {summary['generated']}_")
    lines.append("")
    lines.append(
        f"**Answer model:** `{summary['answer_model']}` (effort `{summary['answer_effort']}`) — "
        f"both variants run through Copilot CLI subprocess."
    )
    lines.append(
        f"**Judge model:** `{summary['judge_model']}` (effort `{summary['judge_effort']}`) — "
        f"answer order randomized per query to neutralize position bias."
    )
    lines.append("")
    lines.append("## Latency & token efficiency")
    lines.append("")
    lines.append("| metric | pattern-g | upstream |")
    lines.append("|---|---|---|")
    pg = summary["aggregates"].get("pattern-g") or {}
    up = summary["aggregates"].get("upstream") or {}
    def cell(d, k):
        v = d.get(k)
        return "—" if v is None else str(v)
    for k, label in [
        ("queries", "queries run"),
        ("p50_wall_ms", "p50 wall (ms)"),
        ("p95_wall_ms", "p95 wall (ms)"),
        ("p50_api_ms", "p50 LLM api (ms)"),
        ("mean_out_tokens", "mean output tokens (JSONL)"),
        ("mean_premium_requests", "mean premium requests"),
        ("mean_tool_calls", "mean tool calls"),
        ("mean_cn_tool_calls", "mean cn_* tool calls"),
        ("contaminated_count", "contaminated runs (wrote files)"),
        ("architecture_used_rate", "architecture-used rate"),
        ("network_skill_load_rate", "network-desk skill load rate"),
        ("network_skill_invoke_rate", "network-desk skill invoke rate"),
    ]:
        lines.append(f"| {label} | {cell(pg, k)} | {cell(up, k)} |")
    lines.append("")
    lines.append("## Judge verdict (head-to-head)")
    lines.append("")
    w = summary["judge_winners"]
    lines.append(
        f"- Pattern G wins: **{w['pattern-g']}**  · Upstream wins: **{w['upstream']}**  "
        f"· Ties: **{w['tie']}**  · Unparsed: **{w['unparsed']}**"
    )
    lines.append("")
    lines.append("### Mean judge scores per axis (0-10)")
    lines.append("")
    lines.append("| axis | pattern-g | upstream |")
    lines.append("|---|---|---|")
    am = summary["judge_axis_means"]
    for axis in ("technical_accuracy", "completeness", "actionability", "clarity", "conciseness"):
        lines.append(f"| {axis} | {am['pattern-g'].get(axis) if am['pattern-g'].get(axis) is not None else '—'} | {am['upstream'].get(axis) if am['upstream'].get(axis) is not None else '—'} |")
    lines.append("")
    lines.append("## Per-query verdicts")
    lines.append("")
    lines.append("| id | winner | reason |")
    lines.append("|---|---|---|")
    for qid in sorted(judge_rows):
        rec = judge_rows[qid]
        verdict = rec.get("verdict") or {}
        winner = rec.get("winner_variant") or "?"
        reason = (verdict.get("reason") or "").replace("|", "\\|")[:160]
        lines.append(f"| {qid} | {winner} | {reason} |")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("Raw per-query results live under `results/<variant>/<id>.{json,jsonl}`. ")
    lines.append("Per-judgement details live under `results/judge/<id>.{json,jsonl}`.")
    return "\n".join(lines) + "\n"


# ── CLI plumbing ────────────────────────────────────────────────────────────


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    pr = sub.add_parser("run", help="Run a variant against the query set.")
    pr.add_argument("--variant", choices=["upstream", "pattern-g"], required=True)
    pr.add_argument("--ids", help="Comma-separated query ids.")
    pr.add_argument("--max", type=int, help="Cap the query count.")
    pr.add_argument("--pattern-g-only", action="store_true",
                    help="Filter to queries whose specialists are a subset of Pattern G coverage.")
    pr.add_argument("--skip-existing", action="store_true",
                    help="Don't re-run queries whose result JSON already exists.")
    pr.set_defaults(func=cmd_run)

    pj = sub.add_parser("judge", help="Judge paired answers head-to-head.")
    pj.add_argument("--ids")
    pj.add_argument("--skip-existing", action="store_true")
    pj.set_defaults(func=cmd_judge)

    pa = sub.add_parser("report", help="Aggregate everything into a summary.")
    pa.set_defaults(func=cmd_report)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
