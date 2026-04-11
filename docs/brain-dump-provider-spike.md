# Brain dump provider spike (GitHub #12)

Decisions for how the Polyhue app gets **structured task drafts** from an AI path during **local development**. Tracks epic: [#11](https://github.com/witheo/Polyhue-Planner/issues/11).

## Architecture

- **Standalone Node** HTTP process (not Vite middleware): clear boundary, one port, easy to document. Start beside `npm run dev` when using AI import.
- The **browser never spawns** `cursor`; it only `fetch`es the local proxy. Production builds do not include the proxy.

## Cursor CLI (verify on your machine)

CLI flags and stdin behavior **change between releases**. Before locking implementation:

1. Run `cursor agent --help` (and `cursor --version`) on your OS.
2. Confirm how the agent accepts the **prompt + user text** (argv only, stdin, or `@file`).
3. Prefer **stdin or a temp file** for the brain dump so length is not capped by `ARG_MAX`; use **`execFile` / `spawn` without a shell** so user text is not mangled by quoting.
4. Document **auth**: typically `CURSOR_API_KEY` for headless use (confirm in current docs).
5. Set subprocess **`cwd`** to this repo if the agent uses workspace context.
6. Use a **hard timeout** and kill the process tree on hang; cap input size (e.g. max bytes on request body).

Official references to re-check: [Cursor CLI](https://cursor.com/docs/cli/overview), [Headless](https://cursor.com/docs/cli/headless), [Output format](https://cursor.com/docs/cli/reference/output-format).

## Wire format (proxy → app)

The app expects **HTTP JSON** (not raw CLI stdout). The Node proxy is responsible for calling the CLI, then normalizing to:

```json
{
  "tasks": [
    {
      "title": "string (required, non-empty when trimmed)",
      "description": "optional string",
      "durationMinutes": 30
    }
  ]
}
```

Rules enforced in-app (`src/domain/taskDraft.ts`): durations are rounded and clamped to **≥ 15** minutes; invalid rows are dropped with a parse error if nothing valid remains.

**Endpoint:** `POST {PROXY_BASE}/brain-dump`  
**Request body:** `{ "raw": "<user brain dump>" }`  
**Success response:** `{ "tasks": [ ... ] }` as above.  
**Error response:** `{ "error": "human-readable message" }` with non-2xx status when appropriate.

## App configuration

Set in `.env.local` (Vite):

```bash
VITE_BRAIN_DUMP_PROXY_URL=http://127.0.0.1:8787
```

If unset, the import dialog explains that the proxy is not configured.

## Dev mock proxy

For UI work without the Cursor CLI, use the repo script:

```bash
npm run brain-dump-proxy
```

It serves `POST /brain-dump` and returns one task per non-empty line (fixed **30** minutes) so you can test the full dialog → backlog flow.

## Privacy

The full brain dump is sent to whatever the proxy / model stack uses. Document that for anyone using the feature.
