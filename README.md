# Polyhue Planner

Colorful planner that combines a ticket-style backlog with duration-sized cards you drag onto a lightweight one-day lane. Built for quick visual planning: snap to a grid, avoid overlaps, and persist locally.

## Stack

- [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Zustand](https://github.com/pmndrs/zustand) for a single client store (`src/state/store.ts`)
- [@dnd-kit](https://docs.dndkit.com/) for drag-and-drop between backlog and schedule
- Plain CSS variables in `src/styles/globals.css` (no Tailwind)

## Run locally

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

## Scripts

| Command        | Description                          |
| -------------- | ------------------------------------ |
| `npm run dev`  | Start Vite dev server                |
| `npm run build`| Typecheck + production bundle        |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint                               |

## Persistence

Plans are saved under the `localStorage` key `polyhue-planner.v1` as JSON:

`{ "tasks": Task[], "blocks": ScheduledBlock[] }`

Saves are debounced (~250ms) after each change.

## License

MIT — see [LICENSE](./LICENSE).
