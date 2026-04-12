# Polyhue Planner

Colorful planner that combines a ticket-style backlog with duration-sized cards you drag onto a lightweight one-day lane. Built for quick visual planning: snap to a grid, avoid overlaps, and persist locally.

## Stack

- [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Zustand](https://github.com/pmndrs/zustand) for a single client store (`src/state/store.ts`)
- [@dnd-kit](https://docs.dndkit.com/) for drag-and-drop between backlog and schedule
- Plain CSS variables, layered under `src/styles/` with `@import` from `src/styles/globals.css` (no Tailwind)

## Run locally

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

## Brain dump import (local dev)

Backlog includes **Import from text…**, which calls a small **local Node proxy** (the browser cannot run the Cursor CLI). The proxy runs **`agent`** (`-p --mode ask --output-format json`) with a fixed prompt in [`scripts/brain-dump-system-prompt.txt`](./scripts/brain-dump-system-prompt.txt) so unstructured notes become JSON tasks with optional **category** (work, personal, health, errands, finance, learning, other → ticket color), optional **subtasks** with per-step minutes, and durations. Set **`BRAIN_DUMP_AI=0`** on the proxy process to skip the model and return a single stub task.

- **Contributors — Cursor CLI, auth, env, privacy:** [`docs/brain-dump-local-ai-import.md`](./docs/brain-dump-local-ai-import.md)
- **Architecture and JSON wire format:** [`docs/brain-dump-provider-spike.md`](./docs/brain-dump-provider-spike.md)

```bash
# terminal 1 (needs `agent` on PATH + auth, unless BRAIN_DUMP_AI=0)
npm run brain-dump-proxy

# terminal 2: add to .env.local (create if needed):
# VITE_BRAIN_DUMP_PROXY_URL=http://127.0.0.1:8787

npm run dev
```

## Scripts

| Command        | Description                          |
| -------------- | ------------------------------------ |
| `npm run dev`  | Start Vite dev server                |
| `npm run build`| Typecheck + production bundle        |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint                               |
| `npm run test` | Vitest (`schedule.ts`, `laneLayout.ts`, …) |
| `npm run brain-dump-proxy` | `POST /brain-dump` → Cursor `agent` + prompt (port 8787; dev only) |

## Persistence

Plans are saved under the `localStorage` key `polyhue-planner.v1` as JSON:

`{ "tasks": Task[], "blocks": ScheduledBlock[] }`

Saves are debounced (~250ms) after each change.

## Tasks and duration

- Minimum task length is **15 minutes** (matches the 15-minute snap grid). Older saved tasks below that are **clamped up** on load.
- Backlog and lane cards share the same **height-from-duration** scale (`src/domain/laneLayout.ts`): **1px per minute**, no extra height floor (short tasks are very thin on the lane).
- **Click the ticket title** (link styling) to open the **right-hand detail flyover** (title, duration, scheduled time, delete). Lane tickets have no inline duration or × — use the panel to edit or remove.

## License

MIT — see [LICENSE](./LICENSE).
