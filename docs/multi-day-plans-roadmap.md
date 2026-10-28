# Multi-day plans: roadmap and design (issue #8)

Status: design + spike, no app behaviour changes. Written against `main` at b9d7b73. Everything under "ships today" was read in the code; nothing was run in a browser.

The issue was written when the app had one day lane. Most of its proposal has since landed, so this doc re-baselines it.

## 1. What already ships

| Issue #8 proposal | Status | Where |
| --- | --- | --- |
| Minimal date model | Done. Each block carries a local `YYYY-MM-DD` `scheduledDate`. There is no global `selectedDate` in the store; the selected day and week offset are view state inside `ScheduleLane`. | `ScheduledBlock` in `src/domain/types.ts`; `useState` for `selectedDate`, `weekOffset`, `viewMode` in `src/components/ScheduleLane.tsx` |
| One lane per day | Done. Week view renders seven day columns (Mon-Sun); day view renders one. Each column is a droppable keyed by date. | `ScheduleLane.tsx` (`weekDatesContaining`, `scheduleDayDropId`) |
| Overlap engine day-scoped | Done. `blocksOnDate` filters before the unchanged single-day overlap math. Blocks cannot cross midnight (`end > 1440` is rejected). | `placementValidForDate`, `resolveDropStartForDate` in `src/domain/schedule.ts` |
| Local dates, no time zones | Done by construction. Dates are built from local getters, never UTC. `addDaysLocal` anchors at noon to dodge DST. | `src/domain/calendarDates.ts` (+ `calendarDates.test.ts`) |
| Bounded horizon | Three calendar weeks (previous, current, next; 21 days). Drops outside it are rejected with `NOTICE_OUTSIDE_WINDOW`. | `getPlanningWindowBounds`; `dropOnSchedule` / `previewScheduleDrop` in `src/state/store.ts` |
| Persistence schema | Still `polyhue-planner.v1` = `{ tasks, blocks }`. `scheduledDate` was added to v1 without a version bump. | `src/state/persistence.ts`, README "Persistence" |
| Migration from the date-less shape | Implemented informally in `normalizeLoadedBlocks`: a missing or malformed `scheduledDate` becomes today (at load time). | `src/state/store.ts` |
| Backup | Export/import of the same v1 JSON shape; import runs through the same `hydrate()` as page load. | `src/domain/backup.ts`, README "Backup" |

Facts worth knowing that the code establishes:

- A task has at most one block. `dropOnSchedule` filters out the task's previous block before pushing the new one, and `reconcileTasks` derives `status` from block presence. "Same task on two days" is not representable.
- `isLocalIsoDateString` checks only the regex `^\d{4}-\d{2}-\d{2}$`. `2026-99-99` passes normalization (then falls outside the window and is purged, so harmless today; it would not be harmless if the window were removed).
- `README.md` line 3 still says "one-day lane", and `SCHEDULE_VIEW_START_MINUTE` is documented as "Today lane" in `src/domain/time.ts`. Stale wording only.

## 2. What is genuinely still open

### 2.1 Is `polyhue-planner.v2` needed?

Probably not now. v1 already carries `scheduledDate`, and the old-to-new migration exists. A version bump pays off only when the shape changes in a way old code cannot ignore. Candidates that would force it:

- an explicit `version` field (today there is none, so the only version signal is the localStorage key name);
- recurrence rules, or a block-id separate from `taskId` (needed if one task can appear on several days);
- storing a time zone or UTC offset with blocks.

None is planned. The real gap is that v1 has no in-payload `version` and `load()` does no validation beyond "tasks and blocks are arrays". Adding `version: 1` to the payload (and to the backup file) is cheap and makes any future v2 migration well-defined. Unversioned files are treated as v1.

### 2.2 Blocks are silently purged outside the window (data-loss risk)

`hydrate()` runs `purgeBlocksOutsidePlanningWindow` on every load and every import. Consequences, all from the code:

- The window moves with `now`, so a block more than roughly 1 to 2 weeks in the past is dropped the next time the app loads. Its task survives but returns to backlog (`reconcileTasks` runs after the purge). The schedule is gone; "history" cannot exist.
- localStorage is only rewritten on the next store change (`subscribe` is debounced on changes, not on load), so the loss becomes permanent on the first edit, not at load.
- Import of a backup containing blocks more than 1 to 2 weeks away silently drops them. A user restoring a backup after a month away loses the whole schedule while the import reports success (README documents the drop, the UI gives no count; I did not check the import dialog text).
- Blocks planned more than a week ahead cannot be created at all (drop rejected), so there is no forward planning beyond next week.

### 2.3 Time zones and DST

- All dates are local strings. A user who travels (or changes system zone) keeps the same `YYYY-MM-DD` and the same minute-of-day: the plan "moves" with them, which is probably what a floating-time planner wants. A block at 09:00 stays 09:00 wherever they are.
- Window bounds and `normalizeLoadedBlocks` use "now" in the current zone, so after travel the window shifts by up to a day.
- DST: blocks store minutes from midnight, not instants, so a 02:30 block on a spring-forward day is a time that does not exist, and a day has 23 or 25 real hours. `addDaysLocal` is DST-safe for date arithmetic (noon anchor); nothing models the 23/25-hour day. At the 15-minute grid this only matters for blocks near 01:00-03:00; the lane starts at 05:00 (`SCHEDULE_VIEW_START_MINUTE`) but the model allows any minute 0-1440, e.g. via import.
- Not verified: behaviour of `ScheduleLane` when the app stays open past midnight. `selectedDate` is initialized once in `useState`; I did not find a refresh, but I did not run it.
- Not verified: the DST tests in `calendarDates.test.ts` (only the helper's design was read).

### 2.4 Past-dated blocks

Today a past block is just a block on an earlier column; nothing marks it done, overdue, or movable. Because of 2.2 it also disappears within about two weeks. Open question is whether the product wants "carry over / reschedule" or "past is read-only history".

### 2.5 Recurrence

Explicitly deferred. Noted only because it is the main reason to ever need v2 (rule + exceptions, or materialized blocks with an `id`). Not designed here.

### 2.6 Sync and multi-device

A non-goal. Export/import is the only transport and is a whole-state replace (no merge). Without ids on blocks and without `updatedAt`, a future merge would have no basis. Not recommending any change until sync is actually wanted; just keep the backup format versioned so it can evolve.

### 2.7 Window size

Fixed at three weeks (`getPlanningWindowBounds`). It serves two jobs at once: UI navigation range and data retention. Those should be separated (see decision D1).

## 3. Proposed decisions

**D1. Separate "navigable range" from "retained data".**
- A: keep the purge (status quo). Simple; silent data loss.
- B: never purge on load; keep out-of-window blocks in storage and state, show only the window. Past history survives; far-future imports survive. Cost: state grows slowly; need to filter in every consumer that assumes in-window (reconcile still counts them as scheduled, which is correct).
- C: purge only blocks older than N days, never future ones.
- Recommendation: B, with `dropOnSchedule` restrictions left as is for now. Smallest change that removes the data-loss risk. Revisit growth if it ever matters (a few hundred bytes per block).

**D2. Schema versioning.**
- A: bump the key to `polyhue-planner.v2` now. Needs a migration path and a read-old-key fallback for no new capability.
- B: stay on the `v1` key; add `version: 1` inside the payload and backup file; validate dates properly on load.
- Recommendation: B. Reserve a key bump for the first real shape change (recurrence or block ids).

**D3. Time model.**
- A: floating local time (status quo).
- B: store UTC instants.
- Recommendation: A, documented. A planner of "what I do on Tuesday" is floating by nature, and B would shift blocks when the user travels. Add an invariant doc plus tests for the DST day and for system-zone change.

**D4. Past days.**
- A: leave as is. B: render past days read-only/dimmed. C: add "move unfinished to today".
- Recommendation: B first (cheap, depends on D1), defer C until there is a "done" concept.

**D5. Window size.**
- Recommendation: keep three weeks of navigation for now; once D1 lands it is a pure UI choice and can become configurable or larger without migration risk.

**D6. One block per task.**
- Keep. It matches `status` semantics and the backlog model. Revisit only with recurrence.

## 4. Suggested follow-up issues (in order)

1. **Stop purging out-of-window blocks on load and import** (D1-B). Scope: remove `purgeBlocksOutsidePlanningWindow` from `hydrate`; filter for display only; update README and `store.test.ts` (line ~183 asserts the purge). Labels: `bug`, `area:state`.
2. **Validate dates properly in `isLocalIsoDateString` and normalization.** Scope: reject impossible dates (month 13, Feb 30) and non-finite/out-of-range `startMinuteOfDay` in `normalizeLoadedBlocks`; drop or repair with a count. Labels: `enhancement`, `area:state`.
3. **Add `version: 1` to the persisted and backup payloads.** Scope: write on save/export, accept absence on load/import, reject unknown higher versions with a clear message. Labels: `enhancement`, `area:state`.
4. **Tell the user what an import dropped or repaired.** Scope: return counts from `hydrate`, show in the import result. Labels: `enhancement`, `area:ui`.
5. **Document and test the floating-local-time model.** Scope: README section; tests for DST transition days, system zone change, week boundaries at year end. Labels: `documentation`, `area:state`.
6. **Roll over "today" when the app stays open past midnight.** Scope: refresh the window bounds and default `selectedDate` on date change; only if confirmed reproducible. Labels: `bug`, `area:ui`.
7. **Render past days read-only/dimmed.** Scope: block drops and edits on days before today; visual treatment. Labels: `enhancement`, `area:ui`.
8. **Fix stale wording.** Scope: README intro "one-day lane", "Today lane" comment in `time.ts`. Labels: `documentation`. (Can fold into issue 1.)
9. **Make the planning window a UI-only setting** (after 1). Scope: widen or make configurable; no schema change. Labels: `enhancement`, `area:ui`.
10. Parked, no issue yet: recurrence, sync, block ids (these are what would justify `v2`).

## 5. Open questions for the maintainer

1. Should past schedules be kept as history, or is "plan only what is near" the intended product? This decides D1.
2. Is planning more than one week ahead wanted? Today it is impossible by design.
3. Do you want a "done" concept? D4-C and any recurrence depend on it.
4. Is travel across time zones a real use case, or is floating local time acceptable as the permanent rule?
5. Should issue #8 be closed after this doc and the follow-ups are filed, with recurrence and sync tracked separately?
6. Is it acceptable that import replaces all state (no merge)?
