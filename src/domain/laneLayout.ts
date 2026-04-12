import { MIN_TASK_DURATION_MINUTES } from './durations';

/**
 * Pixel height for a 15-minute task — backlog and lane scale linearly from here (30 min → 2×).
 * Lane time scale is derived so block height still matches duration on the grid.
 */
export const BACKLOG_TICKET_MIN_HEIGHT_PX = 56;

/** One visible hour on the Today lane (px). Must stay in sync with lane CSS `--ph-lane-hour`. */
export const LANE_PIXELS_PER_MINUTE = BACKLOG_TICKET_MIN_HEIGHT_PX / MIN_TASK_DURATION_MINUTES;

export const SCHEDULE_HOUR_HEIGHT_PX = LANE_PIXELS_PER_MINUTE * 60;

/**
 * Ticket inner height (px) at which layout switches to a stacked header row
 * (badge | meta) and a second row for title + actions; title uses two-line clamp.
 */
export const TICKET_TWO_ROW_LAYOUT_MIN_PX = 52;

/**
 * Ticket **content-box** height (px) before subtask lines may appear on the card.
 * Must stay below the content-box height of a 30-minute ticket (~90px after border + padding) so
 * rounding/subpixel layout does not hide subtasks on common durations. Keep in sync with
 * `@container ticket (min-height: …)` for `.ph-card__subtasks-wrap` in task-card.css.
 */
export const TICKET_SUBTASKS_VISIBLE_MIN_PX = 72;

/**
 * Pixel height for a task card from its duration — same formula for backlog and schedule lane.
 * Backlog and drag overlay should use this as explicit `height` (not only `min-height`) so
 * ticket container queries match lane tiles.
 */
export function laneCardHeightPx(durationMinutes: number): number {
  const d = Math.max(MIN_TASK_DURATION_MINUTES, durationMinutes);
  return Math.max(
    1,
    Math.round((d * BACKLOG_TICKET_MIN_HEIGHT_PX) / MIN_TASK_DURATION_MINUTES),
  );
}
