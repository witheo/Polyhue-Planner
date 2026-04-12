# Local AI brain dump import (contributors)

How to **enable and test** **Import from text…** locally. Parent epic: [#11](https://github.com/witheo/Polyhue-Planner/issues/11). Wire format: [`brain-dump-provider-spike.md`](./brain-dump-provider-spike.md).

## How the app talks to a provider

The UI `fetch`es `VITE_BRAIN_DUMP_PROXY_URL` + `/brain-dump`. The repo proxy ([`scripts/brain-dump-proxy.mjs`](../scripts/brain-dump-proxy.mjs)) runs **`agent`** with [`scripts/brain-dump-system-prompt.txt`](../scripts/brain-dump-system-prompt.txt) so unstructured notes become JSON: tasks with titles, optional descriptions, **durations**, and optional **`subtasks`** (each with **`label`** + **`durationMinutes`**).

## Prerequisites

1. **Node.js** (same as the main app).
2. **Cursor CLI (`agent`)** on your PATH — [installation](https://cursor.com/docs/cli/installation):

   ```bash
   curl https://cursor.com/install -fsS | bash
   ```

   Verify: `agent --version`

3. **Authentication** — [Cursor CLI authentication](https://cursor.com/docs/cli/reference/authentication):

   - `agent login` (recommended), or  
   - `export CURSOR_API_KEY=…` for headless use.

## Environment variables

**Vite (`.env.local`):**

```bash
VITE_BRAIN_DUMP_PROXY_URL=http://127.0.0.1:8787
```

**Proxy process (same shell as `npm run brain-dump-proxy`, or export globally):**

- `BRAIN_DUMP_AI=0` — skip `agent`; return one **stub** task (no API key needed).
- `BRAIN_DUMP_PROXY_PORT` — listen port (default `8787`).
- `BRAIN_DUMP_AGENT_BIN` — default `agent`.
- `BRAIN_DUMP_AGENT_TIMEOUT_MS` — default `180000`.
- `BRAIN_DUMP_MAX_RAW_BYTES` — max `raw` body size (default 96 KiB).
- `BRAIN_DUMP_DEBUG=1` — log extra detail when the agent response cannot be parsed into `{ "tasks": [...] }` (check the terminal running `npm run brain-dump-proxy`).

## Run

**Terminal 1**

```bash
npm run brain-dump-proxy
```

**Terminal 2**

```bash
npm run dev
```

Backlog → **Import from text…** → paste notes → **Run on server** → review preview (including **Subtasks** column when present) → **Add to backlog**.

## Privacy

**Treat the brain dump as sensitive.** With the default proxy (`BRAIN_DUMP_AI` unset), notes are sent to Cursor / the model via `agent` per your account. With **`BRAIN_DUMP_AI=0`**, only the local stub runs and nothing is sent to the model. Do not paste secrets into the import field.
