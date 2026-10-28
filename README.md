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

Backlog includes **Import from text…**, which calls a small **local Node proxy** (the browser cannot call Cursor directly). The proxy uses the Cursor **`@cursor/sdk`** local agent with a fixed prompt in [`scripts/brain-dump-system-prompt.txt`](./scripts/brain-dump-system-prompt.txt) so unstructured notes become JSON tasks with optional **category** (work, personal, health, errands, finance, learning, other → ticket color), optional **subtasks** with per-step minutes, and durations. Set **`BRAIN_DUMP_AI=0`** on the proxy process to skip the model and return a single stub task.

- **Contributors — API key, env, privacy:** [`docs/brain-dump-local-ai-import.md`](./docs/brain-dump-local-ai-import.md)
- **Architecture and JSON wire format:** [`docs/brain-dump-provider-spike.md`](./docs/brain-dump-provider-spike.md)

**One terminal** — Vite + brain-dump proxy together (still set `VITE_BRAIN_DUMP_PROXY_URL` in `.env.local` as below):

```bash
npm run dev:with-proxy
```

**Two terminals** — same thing split out:

```bash
# terminal 1 (needs CURSOR_API_KEY unless BRAIN_DUMP_AI=0)
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
| `npm run dev:with-proxy` | **Vite +** brain-dump proxy (same as two terminals below) |
| `npm run brain-dump-proxy` | `POST /brain-dump` → Cursor `@cursor/sdk` local agent + prompt (port 8787; dev only) |

## Persistence

Plans are saved under the `localStorage` key `polyhue-planner.v1` as JSON:

`{ "tasks": Task[], "blocks": ScheduledBlock[] }`

Saves are debounced (~250ms) after each change.

### Backup (export / import)

The header has **Export** and **Import** buttons for moving a plan between browsers or keeping a copy.

- **Export** downloads `polyhue-planner-backup.json`, the same `{ "tasks": [...], "blocks": [...] }` shape as above (pretty-printed).
- **Import** reads a `.json` file, validates it, and asks before replacing a non-empty plan. A file that is not valid JSON or has the wrong shape shows an error and leaves the current plan untouched.
- Import normalizes like a page load: statuses follow scheduled blocks, durations below 15 minutes clamp up, and blocks outside the three-week planning window are dropped.

## Tasks and duration

- Minimum task length is **15 minutes** (matches the 15-minute snap grid). Older saved tasks below that are **clamped up** on load.
- Backlog and lane cards share the same **height-from-duration** scale (`src/domain/laneLayout.ts`): **1px per minute**, no extra height floor (short tasks are very thin on the lane).
- **Click the ticket title** (link styling) to open the **right-hand detail flyover** (title, duration, scheduled time, delete). Lane tickets have no inline duration or × — use the panel to edit or remove.

## Accessibility

Baseline, checked in CI with [axe](https://github.com/dequelabs/axe-core) (WCAG 2.1 A/AA) over the empty planner, a populated planner, the task detail panel and the brain-dump dialog (`e2e/a11y.spec.ts`):

- Cards are focusable `group`s (not buttons, since they contain buttons); the title opens details, and the up/down/remove buttons are labelled per task.
- The backlog can be reordered from the keyboard with the **Move up / Move down** buttons.
- The scrollable schedule panel is focusable so it can be scrolled with the keyboard.
- Rejected drops and duration changes are announced through a polite `aria-live` region.

Known limitations and the next increment:

- **No keyboard path to schedule a task.** dnd-kit's keyboard sensor lifts a card, but arrow keys never change the drop target (backlog or lane), so drag-and-drop is pointer-only. Next: a "Schedule…" action on each card (pick day and start time) that calls the same store drop logic.
- **Drag announcements are raw ids.** dnd-kit's default live region reads internal ids ("Draggable item task-… was dropped over …"). Next: custom `accessibility.announcements` and screen-reader instructions on `DndContext` using task titles and day/time.
- Colour contrast of the ticket accents has not been audited beyond what axe checks in the states above.

## License

MIT — see [LICENSE](./LICENSE).
