# Design docs

Durable decisions only: what was decided and why. Exploration, measurements and status stay in the ticket (see the `ticket-workflow` skill).

## Edit through the MCP

Docs here are maintained through the local `design-docs` MCP server (`scripts/design-docs-mcp.mjs`, registered in `.mcp.json`) so they keep a consistent shape. It provides:

| Tool | Purpose |
| --- | --- |
| `list_design_docs` | Title, status, ticket and last-updated for each doc; optional status filter |
| `read_design_doc` | Metadata, section headings and the full body |
| `create_design_doc` | New doc from the template; the slug comes from the title |
| `update_design_doc_section` | Replace or append to one `##` section; bumps `updated` |
| `update_design_doc_meta` | Change `status` and/or `ticket`; bumps `updated` |
| `validate_design_docs` | Report frontmatter problems across all docs |

Writes never leave this directory, and slugs are restricted to lowercase letters, digits and single hyphens. The first time you use it in Claude Code you will be asked to approve the project MCP server.

## Format

```markdown
---
title: Card faces
status: draft        # draft | proposed | accepted | superseded
ticket: 17           # optional GitHub issue number
updated: 2026-10-28  # set by the tool, YYYY-MM-DD
---
# Card faces

## Context
## Decision
## Alternatives considered
## Consequences
## Open questions
```

Hand edits are fine for typos, but run `validate_design_docs` (or `npm test`) afterwards. Tests for the server live next to it in `scripts/`.
