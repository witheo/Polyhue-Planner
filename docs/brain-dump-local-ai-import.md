# Local AI brain dump import (contributors)

How to **enable and test** **Import from text…** locally. Parent epic: [#11](https://github.com/witheo/Polyhue-Planner/issues/11). Wire format: [`brain-dump-provider-spike.md`](./brain-dump-provider-spike.md).

## How the app talks to a provider

The UI `fetch`es `VITE_BRAIN_DUMP_PROXY_URL` + `/brain-dump`. The repo proxy ([`scripts/brain-dump-proxy.mjs`](../scripts/brain-dump-proxy.mjs)) runs the Cursor **`@cursor/sdk`** local agent with [`scripts/brain-dump-system-prompt.txt`](../scripts/brain-dump-system-prompt.txt) so unstructured notes become JSON: tasks with titles, optional descriptions, **durations**, and optional **`subtasks`** (each with **`label`** + **`durationMinutes`**).

## Prerequisites

1. **Node.js** (same as the main app).
2. **Dependencies** — from the repo root, `npm install` (installs `@cursor/sdk`).
3. **Authentication** — a **user API key** or **team service-account API key** with the [Cursor TypeScript SDK](https://cursor.com/docs/sdk/typescript):

   - Create a key under [Cursor Dashboard → Integrations](https://cursor.com/dashboard/integrations) (or your team’s service accounts), then  
   - `export CURSOR_API_KEY=…` in the same environment as `npm run brain-dump-proxy`.

   Team Admin API keys are not supported by the SDK yet. The proxy does **not** use the Cursor CLI (`agent`).

## Environment variables

**Vite (`.env.local`):**

```bash
VITE_BRAIN_DUMP_PROXY_URL=http://127.0.0.1:8787
```

**Proxy process (same shell as `npm run brain-dump-proxy` / `npm run dev:with-proxy`, or export globally):**

- `BRAIN_DUMP_AI=0` — skip the model; return one **stub** task (no API key needed).
- `CURSOR_API_KEY` — required when `BRAIN_DUMP_AI` is not `0`.
- `BRAIN_DUMP_PROXY_PORT` — listen port (default `8787`).
- `BRAIN_DUMP_AGENT_TIMEOUT_MS` — max wait for one SDK run (default `180000`).
- `BRAIN_DUMP_MODEL_ID` — model id for the agent (default `composer-2`).
- `BRAIN_DUMP_MAX_RAW_BYTES` — max `raw` body size (default 96 KiB).
- `BRAIN_DUMP_DEBUG=1` — log extra detail when the model response cannot be parsed into `{ "tasks": [...] }` (check the terminal running `npm run brain-dump-proxy`).

## Run

**Single terminal** (Vite + proxy):

```bash
npm run dev:with-proxy
```

**Or two terminals**

```bash
npm run brain-dump-proxy
```

```bash
npm run dev
```

Backlog → **Import from text…** → paste notes → **Run on server** → review preview (including **Subtasks** column when present) → **Add to backlog**.

## Privacy

**Treat the brain dump as sensitive.** With the default proxy (`BRAIN_DUMP_AI` unset), notes are sent to Cursor / the model via the SDK per your account and [SDK usage / billing](https://cursor.com/docs/sdk/typescript). With **`BRAIN_DUMP_AI=0`**, only the local stub runs and nothing is sent to the model. Do not paste secrets into the import field.
