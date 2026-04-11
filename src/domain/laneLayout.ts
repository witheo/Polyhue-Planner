import { MIN_TASK_DURATION_MINUTES } from './durations';

/** One visible hour on the Today lane (px). Must stay in sync with lane CSS `--ph-lane-hour`. */
export const SCHEDULE_HOUR_HEIGHT_PX = 60;

export const LANE_PIXELS_PER_MINUTE = SCHEDULE_HOUR_HEIGHT_PX / 60;

/** Lane + backlog cards share this floor so short tasks stay readable (matches previous lane min). */
export const LANE_MIN_CARD_HEIGHT_PX = 52;

/**
 * Pixel height for a task card from its duration — same formula for backlog and schedule lane
 * so a ticket’s visual “weight” matches between columns.
 */
export function laneCardHeightPx(durationMinutes: number): number {
  const d = Math.max(MIN_TASK_DURATION_MINUTES, durationMinutes);
  return Math.max(LANE_MIN_CARD_HEIGHT_PX, d * LANE_PIXELS_PER_MINUTE);
}
