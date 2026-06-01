# Skill: Mermaid Network Diagram Generation (`vnet_skill_network_diagram`)

Generate Mermaid `flowchart` and `architecture-beta` network diagrams from topology descriptions — the **default** diagram format because it renders inline in GitHub, VS Code, and most chat clients without setup. Owns the diagram-generation workflow (identify networks → subnets → appliances → connections → layout → style → validate), the always-offer-alternatives discipline (Excalidraw / draw.io as opt-in), the icon-selection hierarchy (official cloud icon → emoji → plain text), and the readability rules (2-level depth, `<br/>` line breaks, multi-diagram split for 10+ VNets). The exact shape table, connection-type syntax, labeling rules, hub-spoke / multi-region / AWS TGW templates, and icon-pack references live in the vault.

---

## Knowledge loading contract

This is a **thin specialist skill**. It owns the *Mermaid-first* default, the icon-selection hierarchy, the alternative-format offer, the depth-2 rule, and the per-environment colour-coding convention. The shape table, syntax for each connection type, labelling rules, and full ready-to-paste templates (hub-spoke / multi-region / AWS TGW) all live in the vault.

Mandatory steps every time you use this skill:

1. Call `cn_vault_page({ page: "Mermaid-Network-Diagram-Generation" })` for canonical shape table, connection-type syntax, labelling rules, generation workflow, ready-to-paste templates, and icon-pack reference list.
2. Cite the vault page when quoting Mermaid syntax — do not invent flowchart or `architecture-beta` constructs.
3. For draw.io or Excalidraw output (opt-in only), redirect to the sibling skills (don't generate by default).

If a topology / pattern isn't covered, fall back to `cn_search({ query: "<keywords>", specialist: "cn_vnet" })`.

---

## When to use network-diagram

| Scenario | Behaviour |
|---|---|
| "Diagram our hub-spoke" | Mermaid `flowchart TB` from the hub-spoke template; substitute CIDRs |
| "Multi-region with global peering" | Multi-region template; one subgraph per region |
| "AWS Transit Gateway topology" | TGW template; per-VPC subgraphs around a single TGW node |
| "I want it in Excalidraw" | Redirect: `cn_skill({ specialist: "cn_vnet", skill: "excalidraw-diagram" })` |
| "Give me the draw.io version" | Redirect: `cn_skill({ specialist: "cn_vnet", skill: "drawio-diagram" })` |
| 10+ VNets in one diagram | Split — one overview (VNets as single nodes) + per-VNet detail diagrams |
| Address planning / CIDR allocation | Redirect: `cn_skill({ specialist: "cn_vnet", skill: "address-planner" })` (then diagram from the plan) |
| Hub-spoke design (NOT just the picture) | Redirect: `cn_skill({ specialist: "cn_vnet", skill: "hub-spoke-design" })` |
| Cloud-specific architecture decision | Redirect to the relevant design skill before diagramming |

---

## Reference pages (load these first)

| Topic | Vault page | Load with |
|---|---|---|
| Canonical Mermaid network-diagram generation — shape table, connection-type syntax, labelling rules, icon hierarchy, ready-to-paste templates (hub-spoke, multi-region, AWS TGW), generation workflow, readability rules | [[Mermaid-Network-Diagram-Generation]] | `cn_vault_page({ page: "Mermaid-Network-Diagram-Generation" })` |
| Drawio companion (opt-in alternative) | [[Drawio-Diagram-Generation]] | `cn_vault_page({ page: "Drawio-Diagram-Generation" })` |
| Excalidraw companion (opt-in alternative) | [[Excalidraw-Diagram-Generation]] | `cn_vault_page({ page: "Excalidraw-Diagram-Generation" })` |

Row #1 is mandatory.

---

## Required inputs — collect before answering

1. **VNets/VPCs in scope** — names, CIDRs, regions.
2. **Subnets** — within each network, with CIDR + purpose.
3. **Appliances** — firewalls, gateways, load balancers, bastion, with IPs.
4. **Connections** — peerings, VPNs, ExpressRoute, internet egress paths.
5. **Cloud(s)** — drives icon set.
6. **Layout preference** — top-down (default for hierarchical) or left-right (for pipelines/flows).
7. **Scale** — 10+ VNets implies splitting into overview + detail diagrams.

---

## Workflow

1. **Collect inputs** above.
2. **Load `Mermaid-Network-Diagram-Generation`**.
3. **Apply the 7-step generation workflow** from the vault (identify networks → subnets → appliances → connections → layout → style → validate).
4. **Pick layout direction** — `TB` for hierarchical hub-spoke, `LR` for pipelines / traffic-flow diagrams.
5. **Pick icons in this order** — official cloud icon set (`logos:microsoft-azure`, `logos:aws`, `logos:google-cloud`, `logos:kubernetes`); emoji fallback for chat clients / vendor firewalls without stencils; plain canonical product names as the last resort.
6. **Reuse the matching template** — hub-spoke / multi-region / AWS TGW. Don't reinvent.
7. **Apply labelling rules** — include CIDRs on all VNets and subnets; include IPs on firewalls and gateways; label connections with type + protocol; use `<br/>` for line breaks.
8. **Apply colour coding** — hub blue, prod green, dev orange (style directives).
9. **Validate** — every CIDR matches the input address plan; no orphaned nodes; connection types are accurate; no nested subgraphs > 2 levels.
10. **Emit the diagram in a fenced ```mermaid block, then append the alternative-format offer**.
11. **If user asks to save** — write to `network-desk/vnet-architect/diagrams/<topic>-<YYYYMMDD>.mmd`.

---

## Output format

Every network-diagram answer should emit:

1. **Inputs interpreted** — short table of VNets / subnets / appliances assumed.
2. **The Mermaid diagram** in a fenced ```mermaid block, with consistent shape conventions.
3. **Legend** as a brief bullet list — node shape → meaning; line style → connection type.
4. **Alternative-format offer** — the standard "Want this in Excalidraw / draw.io? Say so and I'll call `excalidraw-diagram` / `drawio-diagram`" footer.
5. **What this excludes** — design decisions (use design skills), pricing, security analysis.
6. **Footer** — `Analysis only — verify against vendor documentation before applying.`

---

## Common workflow mistakes (do not repeat these)

1. **Defaulting to draw.io / Excalidraw.** Mermaid is the default; only generate alternative formats when the user explicitly asks. Always offer them in the footer.
2. **Generic shape with no icon.** A box labelled "Firewall" with no icon and no IP / product name loses context. Always use canonical product name + icon when possible.
3. **Nested subgraphs beyond 2 levels.** Region → VNet → subnet works; Region → VNet → subnet → microsegment does not render usefully.
4. **No CIDRs on VNets/subnets.** Diagrams without CIDRs are decorative, not operational. Include CIDR on every VNet and subnet label.
5. **Forgetting `<br/>` in long labels.** Wide nodes break the layout. Use `<br/>` to wrap.
6. **One diagram with 20+ VNets.** Unreadable. Split into one overview + per-VNet detail diagrams.
7. **Inventing Mermaid syntax.** If unsure of `architecture-beta` directives or icon refs, load the vault page first.
8. **Skipping the alternative-format offer.** Users often want Excalidraw for whiteboard-style design reviews; mention it.
9. **Colour-coding without consistency.** If hub is blue once, it's blue everywhere. Define the palette in the legend.
10. **Saving without a date in the filename.** `hub-spoke.mmd` collides; `hub-spoke-3region-20260528.mmd` doesn't.
11. **Diagramming before the design exists.** If the user is asking "should this be hub-spoke or mesh?" — redirect to the design skill first.

**Analysis only — verify against vendor documentation before applying.**
