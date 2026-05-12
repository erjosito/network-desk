# Copilot Instructions

## Project: Cloud Networking Desk

This is a Copilot CLI extension pack (`@dmauser/cloud-networking`) providing 11 specialist agents for cloud networking tasks across Azure, AWS, and GCP, plus 14 firewall vendor platforms.

## Build & Run

```
# No build step — pure ES modules
node bin/cli.mjs init          # Install to ~/.copilot/extensions/
node bin/cli.mjs init --project # Install to .github/extensions/ in current repo
node bin/cli.mjs status        # Check installation
node bin/cli.mjs uninstall     # Remove
```

## Architecture

- `bin/cli.mjs` — CLI installer (init, status, uninstall)
- `extensions/cloud-networking/extension.mjs` — Main extension: routing table, tool registration, session hooks via `@github/copilot-sdk/extension`
- `extensions/cloud-networking/specialists/<name>/` — Each specialist has:
  - `agents/<name>.md` — Agent role definition (persona, workflow, guardrails)
  - `skills/<skill-name>/SKILL.md` — Deep domain expertise for each skill
- All specialists use **Pattern B** (separate files), not Pattern A (single SKILLS.md)

## Key Conventions

- **Tool naming:** `<prefix>_role`, `<prefix>_orchestrate`, `<prefix>_skill_<name>` (e.g., `fw_skill_rule_audit`)
- **Prefixes:** vnet_, fw_, lb_, dns_, pl_, hyb_, nsec_, ntsh_, vwan_, nmon_, mcn_
- **Discovery tools:** `cn_capabilities` (full map) and `cn_route` (query-based routing)
- **Routing:** Regex-based keyword detection in `onUserPromptSubmitted` hook auto-routes to the correct specialist
- **All tools use `skipPermission: true`** — they deliver read-only content (markdown), not actions
- **No external dependencies** — only `@github/copilot-sdk/extension` and `node:*` builtins
- **Guardrail:** Every specialist output ends with "Analysis only — verify against vendor documentation before applying."
- **14 firewall vendors** in firewall-engineer: Azure FW, AWS NFW, GCP FW, PAN-OS, FortiGate, Check Point, Cisco ASA/FTD, Juniper SRX, Zscaler, Sophos XG, OPNsense, pfSense, VyOS, iptables/nftables
