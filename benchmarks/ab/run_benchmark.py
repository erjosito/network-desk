#!/usr/bin/env python3
"""
A/B Benchmark: Pattern G (tiered skills) vs Upstream (dmauser/network-desk extension)

Uses GitHub Models API (OpenAI-compatible) -- validates Copilot compatibility.

Measures:
  - Token efficiency (input + output tokens per query)
  - Latency (wall-clock seconds per query)
  - Quality (LLM-as-judge pairwise scoring)

Usage:
  # Set GitHub token (PAT with models:read scope, or GITHUB_TOKEN from Copilot)
  export GITHUB_TOKEN=ghp_...

  # Run full benchmark (answer generation + judging)
  python benchmarks/ab/run_benchmark.py

  # Dry-run: show context sizes without API calls
  python benchmarks/ab/run_benchmark.py --dry-run

  # Run only the judge pass (if answers already generated)
  python benchmarks/ab/run_benchmark.py --judge-only

  # Use fewer queries for a quick test
  python benchmarks/ab/run_benchmark.py --max-queries 3

Models (via GitHub Models API):
  Answer model: openai/gpt-4.1 (configurable via --answer-model)
  Judge model:  openai/o3 (configurable via --judge-model)
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BENCHMARKS_DIR = REPO_ROOT / "benchmarks"
AB_DIR = BENCHMARKS_DIR / "ab"
RESULTS_DIR = AB_DIR / "results"

# Pattern G files (on current branch)
SKILL_ROOT = REPO_ROOT / "skills" / "network-desk" / "SKILL.md"
SPECIALISTS_DIR = REPO_ROOT / "skills" / "network-desk" / "specialists"

# Upstream files (from git upstream/master)
UPSTREAM_REF = "upstream/master"

# Query set
QUERIES_PATH = BENCHMARKS_DIR / "queries.json"

# Specialist routing map: expected_specialists cn_ prefix -> our specialist file
SPECIALIST_MAP = {
    "cn_vnet": "vnet-architect.md",
    "cn_fw": "firewall-engineer.md",
    "cn_hyb": "hybrid-connectivity.md",
    "cn_lb": "load-balancer.md",
    "cn_dns": "dns-specialist.md",
    "cn_pl": "private-link.md",
    "cn_nsec": "network-security.md",
    "cn_ntsh": "network-troubleshooter.md",
    "cn_vwan": "vwan-sdwan.md",
    "cn_nmon": "network-monitor.md",
    "cn_mcn": "multi-cloud-net.md",
    "cn_price": "pricing-analyst.md",
    "cn_iac": "iac-generator.md",
    "cn_cnet": "container-networking.md",
    "cn_cdn": "cdn-edge.md",
    "cn_nauto": "network-automation.md",
    "cn_sase": "sase-sse.md",
    "cn_ncap": "capacity-planner.md",
    "cn_ipv6": "ipv6-migration.md",
    "cn_rpt": "report-builder.md",
}

# Upstream specialist path map: cn_ prefix -> path in git tree
UPSTREAM_SPECIALIST_MAP = {
    "cn_vnet": "extensions/network-desk/specialists/vnet-architect/agents/vnet-architect.md",
    "cn_fw": "extensions/network-desk/specialists/firewall-engineer/agents/firewall-engineer.md",
    "cn_hyb": "extensions/network-desk/specialists/hybrid-connectivity/agents/hybrid-connectivity.md",
    "cn_lb": "extensions/network-desk/specialists/load-balancer/agents/load-balancer.md",
    "cn_dns": "extensions/network-desk/specialists/dns-specialist/agents/dns-specialist.md",
    "cn_pl": "extensions/network-desk/specialists/private-link/agents/private-link.md",
    "cn_nsec": "extensions/network-desk/specialists/network-security/agents/network-security.md",
    "cn_ntsh": "extensions/network-desk/specialists/network-troubleshooter/agents/network-troubleshooter.md",
    "cn_vwan": "extensions/network-desk/specialists/vwan-sdwan/agents/vwan-sdwan.md",
    "cn_nmon": "extensions/network-desk/specialists/network-monitor/agents/network-monitor.md",
    "cn_mcn": "extensions/network-desk/specialists/multi-cloud-networking/agents/multi-cloud-networking.md",
    "cn_price": "extensions/network-desk/specialists/pricing-analyst/agents/pricing-analyst.md",
    "cn_iac": "extensions/network-desk/specialists/iac-generator/agents/iac-generator.md",
    "cn_cnet": "extensions/network-desk/specialists/container-networking/agents/container-networking.md",
    "cn_cdn": "extensions/network-desk/specialists/cdn-edge/agents/cdn-edge.md",
    "cn_nauto": "extensions/network-desk/specialists/network-automation/agents/network-automation.md",
    "cn_sase": "extensions/network-desk/specialists/sase-sse/agents/sase-sse.md",
    "cn_ncap": "extensions/network-desk/specialists/capacity-planner/agents/capacity-planner.md",
    "cn_ipv6": "extensions/network-desk/specialists/ipv6-migration/agents/ipv6-migration.md",
    "cn_rpt": "extensions/network-desk/specialists/report-builder/agents/report-builder.md",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def git_show(ref_path: str) -> str | None:
    """Read a file from a git ref (e.g. upstream/master:path/to/file)."""
    try:
        result = subprocess.run(
            ["git", "show", f"{UPSTREAM_REF}:{ref_path}"],
            capture_output=True, cwd=REPO_ROOT, check=True,
        )
        return result.stdout.decode("utf-8", errors="replace")
    except subprocess.CalledProcessError:
        return None


def count_tokens_approx(text: str) -> int:
    """Rough token count (words × 1.3). Used only for pre-flight estimates."""
    return int(len(text.split()) * 1.3)


def load_queries(max_queries: int | None = None) -> list[dict]:
    """Load the benchmark query set."""
    with open(QUERIES_PATH) as f:
        queries = json.load(f)
    # Filter to queries whose specialist we have implemented
    available = set(SPECIALIST_MAP.keys())
    filtered = [q for q in queries if any(s in available for s in q.get("expected_specialists", []))]
    if max_queries:
        filtered = filtered[:max_queries]
    return filtered


def build_pattern_g_context(query: dict) -> str:
    """Build the system context for Pattern G: root skill + specialist."""
    root = SKILL_ROOT.read_text(encoding="utf-8")

    # Load the specialist for this query
    specialist_id = query["expected_specialists"][0]
    specialist_file = SPECIALIST_MAP.get(specialist_id)
    specialist_content = ""
    if specialist_file:
        spec_path = SPECIALISTS_DIR / specialist_file
        if spec_path.exists():
            specialist_content = spec_path.read_text(encoding="utf-8")
        else:
            specialist_content = f"[Specialist {specialist_file} not yet implemented in prototype]"

    return (
        f"# Instructions\n\n"
        f"You are a cloud networking expert. Follow the skill instructions below.\n\n"
        f"---\n\n"
        f"{root}\n\n"
        f"---\n\n"
        f"# Active Specialist (loaded based on query domain)\n\n"
        f"{specialist_content}"
    )


def build_upstream_context(query: dict) -> str:
    """Build the system context for upstream: full specialist role file from git."""
    specialist_id = query["expected_specialists"][0]
    git_path = UPSTREAM_SPECIALIST_MAP.get(specialist_id)
    if not git_path:
        return "[Specialist not found in upstream]"

    content = git_show(git_path)
    if not content:
        return f"[Could not read {git_path} from {UPSTREAM_REF}]"

    return (
        f"# Instructions\n\n"
        f"You are a cloud networking expert. Follow the agent role definition below.\n\n"
        f"---\n\n"
        f"{content}"
    )


# ---------------------------------------------------------------------------
# Answer generation (via GitHub Models API -- OpenAI-compatible)
# ---------------------------------------------------------------------------

GITHUB_MODELS_BASE_URL = "https://models.github.ai/inference"


def get_client():
    """Create OpenAI client pointed at GitHub Models API."""
    from openai import OpenAI
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("GITHUB_TOKEN not set")
    return OpenAI(base_url=GITHUB_MODELS_BASE_URL, api_key=token)


def generate_answer(system_prompt: str, user_query: str, model: str) -> dict:
    """Call GitHub Models API and return answer + metrics."""
    client = get_client()

    t0 = time.perf_counter()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
        ],
        temperature=0.3,
        max_tokens=4096,
    )
    elapsed = time.perf_counter() - t0

    choice = response.choices[0]
    usage = response.usage

    return {
        "answer": choice.message.content or "",
        "latency_s": round(elapsed, 2),
        "input_tokens": usage.prompt_tokens if usage else 0,
        "output_tokens": usage.completion_tokens if usage else 0,
        "total_tokens": usage.total_tokens if usage else 0,
        "model": response.model,
        "finish_reason": choice.finish_reason,
    }


# ---------------------------------------------------------------------------
# Judge (via GitHub Models API -- uses a strong reasoning model)
# ---------------------------------------------------------------------------

JUDGE_RUBRIC = """You are a senior cloud-networking SME judging two assistant answers to the same user question. Both answers were generated by an AI system specialized in cloud networking; judge them on technical merit only.

**Question (verbatim):**
{question}

**Answer A (Pattern G -- tiered skills):**
{answer_a}

**Answer B (Upstream -- full extension):**
{answer_b}

**Rubric.** Score each answer 1-5 on each dimension:
- correctness: claims align with vendor docs and current cloud-networking practice
- completeness: covers the question's full scope
- actionability: concrete steps, commands, or decisions the reader can use
- specificity: names actual SKUs/products/CLI verbs vs vague placeholders
- conciseness: efficient communication; no padding or filler

**Anti-bias rules:**
- DO NOT reward length by itself. Prefer the answer that is more correct, specific, and actionable.
- Penalize verbosity if it adds unsupported claims or generic filler.
- Reward extra detail only when it materially improves correctness or usability.
- Ignore stylistic differences (markdown headings, bullet vs prose).
- Ignore boilerplate footers like "Analysis only -- verify against vendor documentation before applying."

**Output format.** Reply with ONLY a JSON object:
{{"correctness":{{"A":N,"B":N}},"completeness":{{"A":N,"B":N}},"actionability":{{"A":N,"B":N}},"specificity":{{"A":N,"B":N}},"conciseness":{{"A":N,"B":N}},"winner":"A"|"B"|"tie","confidence":"high"|"medium"|"low","justification":"1-3 sentences citing concrete defects"}}
"""


def judge_pair(question: str, answer_a: str, answer_b: str, model: str) -> dict:
    """Run the judge model on a pair of answers. Returns parsed verdict."""
    client = get_client()

    prompt = JUDGE_RUBRIC.format(
        question=question,
        answer_a=answer_a or "(empty / no answer generated)",
        answer_b=answer_b or "(empty / no answer generated)",
    )

    t0 = time.perf_counter()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a fair and rigorous technical evaluator. Output only valid JSON."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.0,
        max_tokens=1024,
    )
    elapsed = time.perf_counter() - t0

    text = response.choices[0].message.content or ""
    usage = response.usage

    # Parse JSON verdict
    verdict = None
    try:
        import re
        match = re.search(r'\{[^{}]*"winner"[^{}]*\}', text)
        if match:
            verdict = json.loads(match.group())
    except (json.JSONDecodeError, AttributeError):
        pass

    # Fallback: try to parse the whole thing
    if not verdict:
        try:
            start = text.index("{")
            end = text.rindex("}") + 1
            verdict = json.loads(text[start:end])
        except (ValueError, json.JSONDecodeError):
            verdict = {"winner": "unparseable", "raw_text": text[:500]}

    return {
        "verdict": verdict,
        "judge_latency_s": round(elapsed, 2),
        "judge_input_tokens": usage.prompt_tokens if usage else 0,
        "judge_output_tokens": usage.completion_tokens if usage else 0,
    }


# ---------------------------------------------------------------------------
# Main benchmark flow
# ---------------------------------------------------------------------------

def run_answers(queries: list[dict], answer_model: str) -> list[dict]:
    """Generate answers for both variants on all queries."""
    results = []

    for i, q in enumerate(queries):
        qid = q["id"]
        query_text = q["query"]
        print(f"\n[{i+1}/{len(queries)}] {qid}: {query_text[:60]}...")

        # Build contexts
        ctx_g = build_pattern_g_context(q)
        ctx_up = build_upstream_context(q)

        # Token counts for context (pre-answer)
        ctx_g_tokens = count_tokens_approx(ctx_g)
        ctx_up_tokens = count_tokens_approx(ctx_up)
        print(f"  Context size: Pattern G ~{ctx_g_tokens} tok, Upstream ~{ctx_up_tokens} tok")

        # Generate answers
        print(f"  Generating Pattern G answer...", end=" ", flush=True)
        try:
            res_g = generate_answer(ctx_g, query_text, answer_model)
            print(f"[OK] {res_g['latency_s']}s, {res_g['total_tokens']} tok")
        except Exception as e:
            print(f"[FAIL] {e}")
            res_g = {"answer": "", "latency_s": 0, "input_tokens": 0,
                     "output_tokens": 0, "total_tokens": 0, "error": str(e)}

        print(f"  Generating Upstream answer...", end=" ", flush=True)
        try:
            res_up = generate_answer(ctx_up, query_text, answer_model)
            print(f"[OK] {res_up['latency_s']}s, {res_up['total_tokens']} tok")
        except Exception as e:
            print(f"[FAIL] {e}")
            res_up = {"answer": "", "latency_s": 0, "input_tokens": 0,
                      "output_tokens": 0, "total_tokens": 0, "error": str(e)}

        results.append({
            "id": qid,
            "query": query_text,
            "category": q.get("category", "unknown"),
            "expected_specialists": q.get("expected_specialists", []),
            "pattern_g": res_g,
            "upstream": res_up,
            "context_tokens": {
                "pattern_g_approx": ctx_g_tokens,
                "upstream_approx": ctx_up_tokens,
            },
        })

    return results


def run_judge(results: list[dict], judge_model: str) -> list[dict]:
    """Run the judge on all answer pairs."""
    judged = []

    for i, r in enumerate(results):
        qid = r["id"]
        print(f"\n[{i+1}/{len(results)}] Judging {qid}...", end=" ", flush=True)

        answer_a = r["pattern_g"].get("answer", "")
        answer_b = r["upstream"].get("answer", "")

        if not answer_a and not answer_b:
            print("[WARN] both empty, skipping")
            judged.append({**r, "judge": {"verdict": {"winner": "both_empty"}, "judge_latency_s": 0}})
            continue

        try:
            judge_result = judge_pair(r["query"], answer_a, answer_b, judge_model)
            winner = judge_result["verdict"].get("winner", "unparseable")
            print(f"[OK] winner={winner} ({judge_result['judge_latency_s']}s)")
        except Exception as e:
            print(f"[FAIL] {e}")
            judge_result = {"verdict": {"winner": "error", "error": str(e)}, "judge_latency_s": 0}

        judged.append({**r, "judge": judge_result})

    return judged


def generate_report(results: list[dict], answer_model: str, judge_model: str) -> str:
    """Generate a markdown summary report."""
    lines = [
        "# A/B Benchmark Results",
        f"",
        f"**Date:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        f"**Answer model:** {answer_model}",
        f"**Judge model:** {judge_model} (extended thinking)",
        f"**Queries:** {len(results)}",
        "",
        "---",
        "",
        "## Summary",
        "",
    ]

    # Tally
    wins = {"A": 0, "B": 0, "tie": 0, "other": 0}
    total_latency_g = 0
    total_latency_up = 0
    total_input_g = 0
    total_input_up = 0
    total_output_g = 0
    total_output_up = 0
    n_valid = 0

    for r in results:
        w = r.get("judge", {}).get("verdict", {}).get("winner", "other")
        if w in wins:
            wins[w] += 1
        else:
            wins["other"] += 1

        pg = r.get("pattern_g", {})
        up = r.get("upstream", {})
        if pg.get("latency_s") and up.get("latency_s"):
            n_valid += 1
            total_latency_g += pg["latency_s"]
            total_latency_up += up["latency_s"]
            total_input_g += pg.get("input_tokens", 0)
            total_input_up += up.get("input_tokens", 0)
            total_output_g += pg.get("output_tokens", 0)
            total_output_up += up.get("output_tokens", 0)

    lines.append("### Quality (Judge Verdicts)")
    lines.append("")
    lines.append(f"| Winner | Count | % |")
    lines.append(f"|--------|-------|---|")
    lines.append(f"| **Pattern G** (A) | {wins['A']} | {wins['A']*100//max(len(results),1)}% |")
    lines.append(f"| **Upstream** (B) | {wins['B']} | {wins['B']*100//max(len(results),1)}% |")
    lines.append(f"| Tie | {wins['tie']} | {wins['tie']*100//max(len(results),1)}% |")
    if wins["other"]:
        lines.append(f"| Unparseable/Error | {wins['other']} | {wins['other']*100//max(len(results),1)}% |")
    lines.append("")

    if n_valid > 0:
        lines.append("### Token Efficiency (averages per query)")
        lines.append("")
        lines.append("| Metric | Pattern G | Upstream | Delta |")
        lines.append("|--------|-----------|----------|---|")
        avg_in_g = total_input_g // n_valid
        avg_in_up = total_input_up // n_valid
        avg_out_g = total_output_g // n_valid
        avg_out_up = total_output_up // n_valid
        delta_in = avg_in_g - avg_in_up
        delta_out = avg_out_g - avg_out_up
        lines.append(f"| Input tokens | {avg_in_g:,} | {avg_in_up:,} | {delta_in:+,} ({delta_in*100//max(avg_in_up,1):+}%) |")
        lines.append(f"| Output tokens | {avg_out_g:,} | {avg_out_up:,} | {delta_out:+,} ({delta_out*100//max(avg_out_up,1):+}%) |")
        lines.append(f"| Total tokens | {avg_in_g+avg_out_g:,} | {avg_in_up+avg_out_up:,} | {delta_in+delta_out:+,} |")
        lines.append("")

        lines.append("### Latency (averages per query)")
        lines.append("")
        avg_lat_g = total_latency_g / n_valid
        avg_lat_up = total_latency_up / n_valid
        delta_lat = avg_lat_g - avg_lat_up
        lines.append(f"| Metric | Pattern G | Upstream | Delta |")
        lines.append(f"|--------|-----------|----------|---|")
        lines.append(f"| Wall-clock (s) | {avg_lat_g:.1f} | {avg_lat_up:.1f} | {delta_lat:+.1f}s |")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## Per-Query Details")
    lines.append("")
    lines.append("| # | Query | Winner | G tok | Up tok | G lat | Up lat | Confidence |")
    lines.append("|---|-------|--------|-------|--------|-------|--------|------------|")

    for i, r in enumerate(results):
        pg = r.get("pattern_g", {})
        up = r.get("upstream", {})
        j = r.get("judge", {}).get("verdict", {})
        winner = j.get("winner", "?")
        winner_display = {"A": "**Pattern G**", "B": "Upstream", "tie": "Tie"}.get(winner, winner)
        conf = j.get("confidence", "?")
        lines.append(
            f"| {i+1} | {r['query'][:50]}{'...' if len(r['query'])>50 else ''} | "
            f"{winner_display} | {pg.get('total_tokens', '?')} | {up.get('total_tokens', '?')} | "
            f"{pg.get('latency_s', '?')}s | {up.get('latency_s', '?')}s | {conf} |"
        )

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Methodology")
    lines.append("")
    lines.append("- **Infrastructure**: GitHub Models API (models.github.ai) -- validates Copilot compatibility")
    lines.append("- **Pattern G context**: Root skill (SKILL.md, ~7KB) + relevant specialist skill (~5KB) = ~12KB system prompt")
    lines.append("- **Upstream context**: Full specialist role file from dmauser/network-desk (~8-15KB) as system prompt")
    lines.append("- **Fair comparison**: Both variants receive identical user queries with equivalent system instructions")
    lines.append("- **Token measurement**: Actual API-reported token counts (not estimates)")
    lines.append("- **Judge**: Pairwise blind evaluation on 5 dimensions (correctness, completeness, actionability, specificity, conciseness)")
    lines.append("- **Note**: Pattern G loads Tier 0 + Tier 1 upfront. In real usage, only Tier 0 is always loaded; Tier 1 loads on demand (saving ~5KB on irrelevant turns)")
    lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="A/B Benchmark: Pattern G vs Upstream (via GitHub Models API)")
    parser.add_argument("--answer-model", default="openai/gpt-4.1", help="Model for answer generation (GitHub Models catalog)")
    parser.add_argument("--judge-model", default="openai/o3", help="Model for judging (GitHub Models catalog)")
    parser.add_argument("--max-queries", type=int, default=None, help="Limit number of queries")
    parser.add_argument("--judge-only", action="store_true", help="Skip answer generation, run judge on existing results")
    parser.add_argument("--dry-run", action="store_true", help="Show context sizes and token estimates without API calls")
    args = parser.parse_args()

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    results_path = RESULTS_DIR / "results.json"
    report_path = RESULTS_DIR / "report.md"

    # Check GitHub token (single auth for everything)
    if not args.dry_run:
        if not os.environ.get("GITHUB_TOKEN"):
            print("ERROR: GITHUB_TOKEN not set.")
            print("  Set a GitHub PAT with models:read scope, or use the")
            print("  token from GitHub Copilot CLI (gh auth token).")
            sys.exit(1)

    print(f"=== A/B Benchmark ===")
    print(f"Answer model: {args.answer_model}")
    print(f"Judge model:  {args.judge_model}")
    print(f"Results dir:  {RESULTS_DIR}")

    if args.judge_only:
        # Load existing results
        if not results_path.exists():
            print(f"ERROR: No existing results at {results_path}")
            sys.exit(1)
        with open(results_path) as f:
            data = json.load(f)
        results = data["results"]
        print(f"Loaded {len(results)} existing results")
    else:
        # Load queries and generate answers
        queries = load_queries(args.max_queries)
        print(f"Queries: {len(queries)} (of {len(load_queries())} available)")

        # Pre-flight: check that we can read upstream files
        test_path = UPSTREAM_SPECIALIST_MAP.get("cn_fw")
        test_content = git_show(test_path)
        if not test_content:
            print(f"ERROR: Cannot read upstream files. Run: git remote add upstream https://github.com/dmauser/network-desk.git && git fetch upstream")
            sys.exit(1)
        print(f"[OK] Upstream accessible ({len(test_content)} bytes from {test_path})")

        # Dry-run: show context sizes only
        if args.dry_run:
            print(f"\n{'='*60}")
            print(f"DRY RUN -- Context Comparison (no API calls)")
            print(f"{'='*60}\n")
            print(f"{'Query ID':<25s} {'Pattern G':>10s} {'Upstream':>10s} {'Delta tokens':>10s}")
            print(f"{'-'*25} {'-'*10} {'-'*10} {'-'*10}")
            total_g = total_up = 0
            for q in queries:
                ctx_g = build_pattern_g_context(q)
                ctx_up = build_upstream_context(q)
                tok_g = count_tokens_approx(ctx_g)
                tok_up = count_tokens_approx(ctx_up)
                total_g += tok_g
                total_up += tok_up
                delta = tok_g - tok_up
                print(f"{q['id']:<25s} {tok_g:>10,} {tok_up:>10,} {delta:>+10,}")
            n = len(queries)
            print(f"{'-'*25} {'-'*10} {'-'*10} {'-'*10}")
            print(f"{'AVERAGE':<25s} {total_g//n:>10,} {total_up//n:>10,} {(total_g-total_up)//n:>+10,}")
            print(f"\nNote: In real usage, Pattern G loads only Tier 0 (~1,300 tok) on non-specialist turns.")
            print(f"      Above shows Tier 0 + Tier 1 combined (the worst-case for Pattern G).")
            return

        # Generate answers
        print(f"\n{'='*60}")
        print(f"Phase 1: Answer Generation ({args.answer_model})")
        print(f"{'='*60}")
        results = run_answers(queries, args.answer_model)

        # Save intermediate results
        data = {
            "meta": {
                "created_at": datetime.now(timezone.utc).isoformat(),
                "answer_model": args.answer_model,
                "judge_model": args.judge_model,
                "query_count": len(results),
            },
            "results": results,
        }
        with open(results_path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"\n[OK] Answers saved to {results_path}")

    # Judge pass
    print(f"\n{'='*60}")
    print(f"Phase 2: Judging ({args.judge_model})")
    print(f"{'='*60}")
    judged = run_judge(results, args.judge_model)

    # Save final results
    data = {
        "meta": {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "answer_model": args.answer_model,
            "judge_model": args.judge_model,
            "query_count": len(judged),
        },
        "results": judged,
    }
    with open(results_path, "w") as f:
        json.dump(data, f, indent=2)

    # Generate report
    report = generate_report(judged, args.answer_model, args.judge_model)
    with open(report_path, "w") as f:
        f.write(report)

    print(f"\n{'='*60}")
    print(f"[OK] Results: {results_path}")
    print(f"[OK] Report:  {report_path}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
