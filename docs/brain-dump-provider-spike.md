# Brain dump provider spike (GitHub #12)

Decisions for how the Polyhue app gets **structured task drafts** from an AI path during **local development**. Tracks epic: [#11](https://github.com/witheo/Polyhue-Planner/issues/11).

## Architecture

- **Standalone Node** HTTP process (not Vite middleware): clear boundary, one port, easy to document. Start beside `npm run dev` when using AI import.
- The **browser never calls** Cursor; it only `fetch`es the local proxy. Production builds do not include the proxy.
- Implemented server: [`scripts/brain-dump-proxy.mjs`](../scripts/brain-dump-proxy.mjs) — uses **`@cursor/sdk`** (`Agent.create` → `send` → `run.wait()`) with instructions from [`scripts/brain-dump-system-prompt.txt`](../scripts/brain-dump-system-prompt.txt), repo root as **`local.cwd`**, request body size cap, and a wall-clock timeout that calls **`run.cancel()`** when exceeded. The proxy parses the assistant’s final text (including optional Markdown fenced JSON) into `{ "tasks": [...] }` and still tolerates a legacy `{ "type":"result", "result": "<stringified JSON>" }` wrapper if the model emits it.

## SDK and upgrades

The integration targets the public Cursor TypeScript SDK ([docs](https://cursor.com/docs/sdk/typescript)). If behavior changes after upgrading `@cursor/sdk`:

1. Re-read the SDK release notes / changelog for the version you installed.
2. Confirm **`CURSOR_API_KEY`** is set and valid for [Integrations](https://cursor.com/dashboard/integrations).
3. Optional: set **`BRAIN_DUMP_MODEL_ID`** to pin a model id; default is **`composer-2`**.
4. For very large payloads, consider a follow-up that writes `raw` to a temp file and references `@path` in the prompt.

## Wire format (proxy → app)

The app expects **HTTP JSON** (the proxy normalizes model output into this shape):

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
- **`subtasks`** is optional. When present, each entry has **`label`** (required) and **`durationMinutes`** (minutes per step; clamped in-app to **≥ 1**, unlike parent tasks which use the **≥ 15** grid minimum).
- The proxy may also accept **`title` / `step`** instead of **`label`** on subtasks and normalizes to **`label`** before responding.
- **`durationMinutes`** on the parent task is the **whole-ticket** duration; the proxy ensures it is **at least the sum** of subtask minutes when `subtasks` is non-empty.

Rules enforced in-app ([`src/domain/taskDraft.ts`](../src/domain/taskDraft.ts)): **task** `durationMinutes` rounded and clamped to **≥ 15**; **subtask** minutes rounded and clamped to **≥ 1**; invalid top-level task rows are dropped (with aggregate errors if none remain).

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

**Proxy-only env vars:** `CURSOR_API_KEY`, `BRAIN_DUMP_AGENT_TIMEOUT_MS`, `BRAIN_DUMP_MODEL_ID`, `BRAIN_DUMP_MAX_RAW_BYTES` — see header comment in [`scripts/brain-dump-proxy.mjs`](../scripts/brain-dump-proxy.mjs).

## Privacy

The full brain dump is sent to whatever the proxy / model stack uses. Document that for anyone using the feature.
