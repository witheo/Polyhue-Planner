---
name: ticket-workflow
description: How to scope, build and wrap up GitHub tickets in Polyhue Planner. Use when starting, planning, parallelising or finishing a ticket, or deciding what a spike should produce.
---

# Working tickets in Polyhue Planner

This is guidance, not a rulebook. Follow it where it fits and say why when you deviate.

## 1. Start by classifying the ticket

| Kind | Typical signal | Deliverable |
|---|---|---|
| **Work** | Acceptance criteria describe behaviour | A PR that closes the issue |
| **Spike** | Labelled `spike`, asks questions, "recommendation" | Findings and follow-up tickets |
| **Decision** | A choice that will constrain later work | A short design doc, linked from the ticket |

Check that the ticket is still accurate before building. Several early tickets described a one-day lane after the app became week-based.

## 2. Work tickets -> PRs

- Branch from `main` (or from the parent branch if stacking, and base the PR on that parent so the diff stays small).
- Add tests at the right level: unit tests for store and domain logic, Playwright e2e for anything a user does, and keep `e2e/a11y.spec.ts` (axe) green.
- Before opening the PR run `npm test`, `npm run lint`, `npm run build` and `E2E_PORT=<free port> npx playwright test`.
- PR body: summary, what you left out and why, test plan, and `Closes #N`. Closing keywords only fire when the PR merges into `main`, so for stacked PRs close the issue by hand once the work lands.
- Push and open the PR when the work is finished; the maintainer has standing permission on file for that.

## 3. Spikes -> findings, not files

The output of a spike is knowledge, so put it where the ticket lives:

- Post the result as a comment on the issue (or edit the description): the question, the method, the numbers with their caveats, what you could not measure, and a recommendation.
- File follow-up issues for anything worth doing: title, one-line scope, labels. Link them from the comment.
- Keep prototype code on a branch for reference.
- Open a PR only when the deliverable itself belongs in `main`, for example a flag-gated prototype others will build on, or a durable decision doc. Say why in the PR description. Otherwise close the loop with the comment and the new issues.

## 4. Design docs

Durable decisions can live in the repo. Keep exploration and status in tickets; keep the doc to what was decided and why. The intent is to maintain design docs through a docs MCP rather than ad-hoc file edits, so they stay structured (title, status, linked ticket, last updated). That MCP does not exist yet; until it does, ask before adding a design doc.

## 5. Parallel agents

- Each agent works in its own worktree, on its own branch, with its own `E2E_PORT`. Playwright reuses whatever server holds the port, and the maintainer's dev server on 5173 serves their uncommitted edits.
- Tell each agent which files are off limits (anything the maintainer has uncommitted) and to commit but not push.
- Only parallelise tickets with disjoint files. Tickets that share the task detail panel or the store should run one at a time.
- Review every diff and re-run the checks yourself; an agent's report is a claim, not evidence.

## 6. Gotchas we have already hit

- Drag in e2e: grab cards near their top-left (the title button swallows `pointerdown`), drop on the top part of a target card, and wait ~300 ms after a drop before clicking anything.
- dnd-kit's keyboard activator sits on the whole card, so inner buttons must stop `keydown` propagation.
- The notice region is `.ph-notice-region`; dnd-kit has its own `role="status"` regions, so do not locate it by role.
- Blocks must start at or after the lane start (`SCHEDULE_VIEW_START_MINUTE`); placement takes a `minStartMinute`.
- Object URLs for downloads must not be revoked synchronously.
