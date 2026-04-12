# Brain dump provider spike (GitHub #12)

Decisions for how the Polyhue app gets **structured task drafts** from an AI path during **local development**. Tracks epic: [#11](https://github.com/witheo/Polyhue-Planner/issues/11).

## Architecture

- **Standalone Node** HTTP process (not Vite middleware): clear boundary, one port, easy to document. Start beside `npm run dev` when using AI import.
- The **browser never spawns** `agent`; it only `fetch`es the local proxy. Production builds do not include the proxy.
- Implemented server: [`scripts/brain-dump-proxy.mjs`](../scripts/brain-dump-proxy.mjs) — spawns **`agent -p --mode ask --output-format json`** with instructions from [`scripts/brain-dump-system-prompt.txt`](../scripts/brain-dump-system-prompt.txt), repo root as **`cwd`**, timeout and max body size enforced. The proxy unwraps Cursor’s JSON envelope when stdout is like `{ "type":"result", "result": "<stringified JSON with tasks>" }`.

## Cursor CLI (verify on your machine)

CLI flags and stdin behavior **change between releases**. If the proxy fails after an upgrade:

1. Run `agent --help` and `agent --version` on your OS.
2. Re-check [Headless](https://cursor.com/docs/cli/headless) and [Output format](https://cursor.com/docs/cli/reference/output-format).
3. The proxy passes the full prompt as **one argv string** (notes appended after the system text). For very large payloads, consider a follow-up that writes `raw` to a temp file and references `@path` in the prompt.
4. **Auth:** `CURSOR_API_KEY` and/or `agent login` (see [authentication](https://cursor.com/docs/cli/reference/authentication)).
5. Use **`spawn` without a shell** (as in the script) so user text is not mangled by quoting.

## Wire format (proxy → app)

The app expects **HTTP JSON** (the proxy normalizes agent stdout into this shape):

```json
{
  "tasks": [
    {
      "title": "string (required, non-empty when trimmed)",
      "description": "optional string",
      "durationMinutes": 90,
      "category": "work",
      "subtasks": [
        { "label": "string", "durationMinutes": 30 },
        { "label": "string", "durationMinutes": 60 }
      ]
    }
  ]
}
```

- **`category`** is optional: one of `work`, `personal`, `health`, `errands`, `finance`, `learning`, `other` — maps to ticket color in the app.
- **`subtasks`** is optional. When present, each entry has **`label`** (required) and **`durationMinutes`** (minutes, clamped in-app to **≥ 15**).
- The proxy may also accept **`title` / `step`** instead of **`label`** on subtasks and normalizes to **`label`** before responding.
- **`durationMinutes`** on the parent task is the **whole-ticket** duration; the proxy ensures it is **at least the sum** of subtask minutes when `subtasks` is non-empty.

Rules enforced in-app ([`src/domain/taskDraft.ts`](../src/domain/taskDraft.ts)): durations rounded and clamped to **≥ 15**; invalid top-level task rows are dropped (with aggregate errors if none remain).

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

## Dev proxy script

```bash
npm run brain-dump-proxy
```

Serves `POST /brain-dump` on `127.0.0.1:8787` (override with `BRAIN_DUMP_PROXY_PORT`).

**Without the model:** set `BRAIN_DUMP_AI=0` for a **stub** response (one task, fixed 30 minutes) for UI smoke.

**Proxy-only env vars:** `BRAIN_DUMP_AGENT_BIN`, `BRAIN_DUMP_AGENT_TIMEOUT_MS`, `BRAIN_DUMP_MAX_RAW_BYTES` — see header comment in [`scripts/brain-dump-proxy.mjs`](../scripts/brain-dump-proxy.mjs).

## Privacy

The full brain dump is sent to whatever the proxy / model stack uses. Document that for anyone using the feature.
