"""Aggregate paraphrase-stability results: per-base variance across paraphrases."""
import json
import statistics
from pathlib import Path

JUDGE_DIR = Path("benchmarks/ab/results/judge")
RESULTS_DIR = Path("benchmarks/ab/results")
PARAPHRASE_IDS = [
    "vnet-hub-spoke-p1", "vnet-hub-spoke-p2",
    "fw-rule-audit-p1", "fw-rule-audit-p2",
    "lb-snat-exhaustion-p1", "lb-snat-exhaustion-p2",
    "price-er-vs-vpn-p1", "price-er-vs-vpn-p2",
    "mcn-service-mapping-p1", "mcn-service-mapping-p2",
]
AXES = ["technical_accuracy", "completeness", "actionability", "clarity", "conciseness"]


def main() -> None:
    by_base: dict[str, dict[str, list[dict]]] = {}
    winners_by_base: dict[str, list[str]] = {}

    for pid in PARAPHRASE_IDS:
        base = pid.rsplit("-p", 1)[0]
        rec = json.loads((JUDGE_DIR / f"{pid}.json").read_text(encoding="utf-8"))
        verdict = rec.get("verdict") or {}
        order = rec.get("order") or {}
        for slot in ("A", "B"):
            variant = order.get(slot)
            scores = verdict.get(slot) or {}
            by_base.setdefault(base, {}).setdefault(variant, []).append(scores)
        winners_by_base.setdefault(base, []).append(rec.get("winner_variant") or "?")

    print(f"{'base':<25}{'axis':<22}{'pg_p1':<8}{'pg_p2':<8}{'up_p1':<8}{'up_p2':<8}{'pg_delta':<10}{'up_delta':<10}")
    print("-" * 100)

    deltas_pg: list[int] = []
    deltas_up: list[int] = []
    means_pg: dict[str, list[float]] = {a: [] for a in AXES}
    means_up: dict[str, list[float]] = {a: [] for a in AXES}

    for base in sorted(by_base.keys()):
        pg_list = by_base[base].get("pattern-g", [])
        up_list = by_base[base].get("upstream", [])
        for axis in AXES:
            pg_vals = [s.get(axis) for s in pg_list if s.get(axis) is not None]
            up_vals = [s.get(axis) for s in up_list if s.get(axis) is not None]
            if len(pg_vals) < 2 or len(up_vals) < 2:
                continue
            dpg = abs(pg_vals[0] - pg_vals[1])
            dup = abs(up_vals[0] - up_vals[1])
            deltas_pg.append(dpg)
            deltas_up.append(dup)
            means_pg[axis].append(statistics.mean(pg_vals))
            means_up[axis].append(statistics.mean(up_vals))
            print(f"{base:<25}{axis:<22}{pg_vals[0]:<8}{pg_vals[1]:<8}{up_vals[0]:<8}{up_vals[1]:<8}{dpg:<10}{dup:<10}")

    print()
    print(f"Paraphrase verdict stability (winners across p1/p2 per base):")
    for base, winners in sorted(winners_by_base.items()):
        consistent = "consistent" if len(set(winners)) == 1 else "FLIPPED"
        print(f"  {base:<25} {winners}  -> {consistent}")

    print()
    print("Per-axis paraphrase delta (absolute, lower = more stable):")
    print(f"  pattern-g  mean={statistics.mean(deltas_pg):.2f}  max={max(deltas_pg)}  n={len(deltas_pg)}")
    print(f"  upstream   mean={statistics.mean(deltas_up):.2f}  max={max(deltas_up)}  n={len(deltas_up)}")

    print()
    print("Per-axis means averaged over paraphrases (closer comparison than single-pass run):")
    print(f"  {'axis':<22} {'pattern-g':<12} {'upstream':<12}")
    for axis in AXES:
        pg_m = statistics.mean(means_pg[axis]) if means_pg[axis] else 0.0
        up_m = statistics.mean(means_up[axis]) if means_up[axis] else 0.0
        print(f"  {axis:<22} {pg_m:<12.2f} {up_m:<12.2f}")


if __name__ == "__main__":
    main()
