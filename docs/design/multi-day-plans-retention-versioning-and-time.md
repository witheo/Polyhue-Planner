---
title: "Multi-day plans: retention, versioning and time"
status: proposed
ticket: 8
updated: 2026-10-28
---
# Multi-day plans: retention, versioning and time

Proposed decisions for how multi-day planning handles data retention, schema versioning and time. Not yet accepted. The code survey and how these were derived are on issue #8.

## Context
The app already supports multi-day planning: blocks carry a local `scheduledDate` (`YYYY-MM-DD`), the schedule has one lane per day in week and day views, and the overlap engine is day-scoped. Storage is the `polyhue-planner.v1` key holding `{ tasks, blocks }`, and export/import use the same shape.

One mechanism does two jobs. The three-week planning window (previous, current and next calendar week) is both the navigation range and the data retention rule: `hydrate()` purges blocks outside it on every page load and every backup import. localStorage is only rewritten on the next edit, so the loss becomes permanent on the first change after load, and importing an older backup silently drops its schedule while reporting success.

Separately, the persisted payload has no `version` field and `isLocalIsoDateString` only checks a regex, so an impossible date such as `2026-99-99` passes normalization.

## Decision
Proposed, pending maintainer review:

1. **Separate the navigable range from retained data.** Stop purging blocks outside the planning window on load and import; keep them in state and storage and filter only for display. Leave the restriction on dropping outside the window as it is for now.
2. **Stay on the `v1` storage key and add `version: 1` inside the payload**, in both persisted state and backup files. Unversioned data is treated as v1, and a higher unknown version is rejected with a clear message. Validate dates and start minutes properly on load. Reserve a key bump (`v2`) for the first real shape change, such as recurrence or block ids.
3. **Keep floating local time.** A block is a local date plus a minute of day, not an instant. Document this as an invariant and cover DST transition days and a system time-zone change with tests.
4. **Past days:** render them read-only and dimmed first. Defer "move unfinished to today" until the app has a notion of a task being done.
5. **Planning window size:** keep three weeks of navigation for now. Once decision 1 lands it is a pure UI choice and can be widened or made configurable without a migration.
6. **Keep one block per task**, matching the backlog and `status` model. Revisit only if recurrence is added.

## Alternatives considered
- **Retention:** keeping the purge is the simplest option but loses data silently. Purging only blocks older than N days, never future ones, is a middle path that still deletes history.
- **Versioning:** bumping to `polyhue-planner.v2` now would need a migration and a read-the-old-key fallback while adding no new capability. An in-payload `version` makes a later bump well defined at no cost.
- **Time model:** storing UTC instants would shift a user's blocks when they travel or change system zone, which is wrong for a planner of "what I do on Tuesday".
- **Past days:** leaving them as they are keeps the status quo; adding carry-over now has no meaning without a "done" concept.

## Consequences
- The silent data-loss path closes: old and far-future blocks survive loads and imports.
- State and storage grow slowly (a few hundred bytes per block). Every consumer that assumed all blocks are in the window must filter for display; `reconcileTasks` keeps counting out-of-window blocks as scheduled, which is correct.
- Imports should report what they dropped or repaired (invalid dates or minutes), since validation becomes stricter.
- A future shape change (recurrence, block ids, sync metadata) has a defined path: the payload version plus a key bump at that point.
- Floating local time means a plan "moves with" the user across time zones, and a DST day's 23 or 25 real hours are not modelled (blocks near 01:00 to 03:00 can name a time that does not exist on spring-forward day; the lane starts at 05:00, so this only matters for imported data).

## Open questions
1. Should past schedules be kept as history, or is "plan only what is near" the intended product? This decides decision 1.
2. Is planning more than one week ahead wanted? Today it is impossible by design.
3. Is a "done" concept wanted? Carry-over of unfinished work and any recurrence depend on it.
4. Is travel across time zones a real use case, or is floating local time acceptable as a permanent rule?
5. Is it acceptable that import replaces all state with no merge?
