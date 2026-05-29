# Skill: HTML Report

## Purpose

Render a Markdown report to a **self-contained, styled HTML file** using the shipped `make_html.py` renderer. HTML is the best default for a quick, shareable deliverable that opens in any browser with no dependencies on the reader's side.

Author the report with the `report-structure` skill first, then render it here.

## Locate the renderer

`make_html.py` ships inside this extension's `renderers/` directory. Resolve its path by trying these candidates in order (first that exists wins):

1. `./extensions/cloud-networking/renderers/make_html.py`  *(repo checkout)*
2. `./.github/extensions/cloud-networking/renderers/make_html.py`  *(project install)*
3. `$HOME/.copilot/extensions/cloud-networking/renderers/make_html.py`  *(user install — `%USERPROFILE%` on Windows)*

```bash
# Bash one-liner to find it
for p in ./extensions/cloud-networking/renderers \
         ./.github/extensions/cloud-networking/renderers \
         "$HOME/.copilot/extensions/cloud-networking/renderers"; do
  [ -f "$p/make_html.py" ] && RENDERERS="$p" && break
done
```

## Dependencies

```bash
pip install markdown2
```

## Invocation

```bash
python "$RENDERERS/make_html.py" \
  --input  report.md \
  --specialist firewall-engineer
# --output is OPTIONAL. Omitted → cloud-networking/firewall-engineer/reports/report.html
```

- **Pass the specialist *directory* name** (kebab-case: `firewall-engineer`, `vnet-architect`, `pricing-analyst`) as `--specialist`. The default output path is built from it, so passing a display name like `"Firewall Engineering"` would produce the wrong folder (`firewall-engineering/`).
- To control the path explicitly: `--output cloud-networking/firewall-engineer/reports/azfw-audit-20260528.html`.
- `--outdir <dir>` changes the base folder (default `cloud-networking`).

## Graceful failure

- **`ModuleNotFoundError: markdown2`** → run `pip install markdown2` and retry. If pip is unavailable, deliver the raw Markdown file and tell the user the one command needed.
- Always keep the source `.md` next to the `.html` so the report can be regenerated.

## References

- markdown2: https://github.com/trentm/python-markdown2

**Analysis only — verify against vendor documentation before applying.**
