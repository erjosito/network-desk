# Network Desk — Pattern G Prototype (Tiered Skills)

This branch is a **prototype** of the "Pattern G: Tiered Skills" architecture described in [ARCHITECTURE-EVALUATION.md](./ARCHITECTURE-EVALUATION.md). It replaces the JavaScript Copilot CLI extension with a pure-markdown hierarchical skill set.

## Architecture

```
skills/network-desk/
├── SKILL.md                      ← Tier 0: Root skill (always loaded, ~7 KB)
│                                    Routing taxonomy, global guardrails, capability summary
├── specialists/                  ← Tier 1: Specialist skills (loaded on demand, 4–5 KB each)
│   ├── firewall-engineer.md         Persona + workflow + vault pointers
│   ├── vnet-architect.md
│   ├── hybrid-connectivity.md
│   └── (17 more specialists planned)
└── reference/                    ← Tier 2: Deep reference content (loaded on demand, 4–12 KB each)
    ├── Topics/                      Cross-cutting technical topics
    ├── Services/                    Cloud service pages (Azure, AWS, GCP)
    ├── Vendors/                     Firewall vendor pages (14 platforms)
    └── Patterns/                    Design patterns and architectures
```

## How It Works

1. **Tier 0 (root)** is always in context. It contains:
   - A keyword → specialist routing table (20 domains)
   - Instructions for when/how to load deeper tiers
   - Global guardrails that apply to all specialists

2. **Tier 1 (specialist)** is loaded when the model identifies the user's domain from keywords. Each specialist contains:
   - Identity/persona definition
   - Structured workflow (numbered steps)
   - Work product types
   - Pointers to Tier 2 reference pages

3. **Tier 2 (reference)** is loaded when a specialist workflow needs deep technical content — vendor-specific syntax, service limits, troubleshooting procedures, etc.

## Key Differences from the Extension Architecture

| Aspect | Extension (Pattern B) | Tiered Skills (Pattern G) |
|--------|----------------------|--------------------------|
| Runtime code | ~900 LOC JavaScript | None (pure markdown) |
| Routing | Regex-based (deterministic) | LLM reads taxonomy (probabilistic) |
| Dependencies | `@github/copilot-sdk`, `minisearch` | None |
| Install | `node bin/cli.mjs init` | Drop `skills/` folder into repo |
| Maintenance | Edit JS + markdown | Edit markdown only |
| Token budget | Full specialist always loaded | Progressive disclosure |

## Current Status

**Prototype — 3 of 20 specialists implemented:**
- ✅ Firewall Engineer
- ✅ VNet/Subnet Architect
- ✅ Hybrid Connectivity
- ⬜ 17 remaining specialists (stubs needed)

**What's validated:**
- Root skill taxonomy covers all 20 domains
- Specialist skills demonstrate the persona → workflow → vault-pointer pattern
- Reference vault (169 pages) is intact and linked

**What needs testing:**
- Routing accuracy vs. the benchmark (49 labeled queries in `benchmarks/`)
- Token efficiency (measure actual context window usage per tier combination)
- Quality of specialist responses vs. the extension baseline

## Usage

To use this skill set with GitHub Copilot CLI:

```bash
# Place skills/ directory in your repo root or ~/.copilot/skills/
# Copilot CLI will discover SKILL.md and load it automatically
```

Or reference it in a `.github/copilot-instructions.md`:

```markdown
When answering networking questions, follow the instructions in skills/network-desk/SKILL.md
```

## Benchmarking

The `benchmarks/` directory contains tools for comparing routing accuracy:

```bash
# Run the static benchmark (no API calls needed)
node benchmarks/compare-static.mjs
```

This tests whether the taxonomy in `SKILL.md` routes the 49 labeled queries to the correct specialist.
