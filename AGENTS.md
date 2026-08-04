# Polyhue Planner

Colorful client-side day planner: a ticket-style backlog plus a drag-and-drop one-day timeline lane. All plan data persists in the browser's `localStorage` (key `polyhue-planner.v1`); there is no backend or database.

See `README.md` for the product overview, stack, and the full list of npm scripts (`dev`, `build`, `lint`, `test`, `preview`, `dev:with-proxy`, `brain-dump-proxy`).

## Cursor Cloud specific instructions

- Single frontend service. Start it with `npm run dev` (Vite, `http://localhost:5173`). No database, cache, or other backing service is required to run or test the core product.
- Node: `.tool-versions` pins `nodejs 24.4.1`, but CI and this environment run on Node 22, and `build`/`lint`/`test`/`dev` all pass on Node 22. Node 22 is fine; you do not need to install Node 24.
- CI checks (see `.github/workflows/ci.yml`): `npm run build`, `npm run lint`, `npm run test`. `npm run lint` currently emits one pre-existing warning in `src/components/TaskDetailPanel.tsx` (0 errors) — that warning is expected, not a regression.
- The "Import from text…" (brain dump) feature is optional and dev-only. It needs the local Node proxy (`scripts/brain-dump-proxy.mjs`, port 8787) plus `VITE_BRAIN_DUMP_PROXY_URL=http://127.0.0.1:8787` in `.env.local`. The npm wrapper scripts (`dev:with-proxy`, `brain-dump-proxy`) source a macOS-keychain helper for `CURSOR_API_KEY`; on Linux/cloud run the proxy directly with `BRAIN_DUMP_AI=0 node scripts/brain-dump-proxy.mjs` to use stub mode (no API key/network needed). The core app works without the proxy.
