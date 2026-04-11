const MINUTES_PER_DAY = 24 * 60;

export const MINUTES_IN_DAY = MINUTES_PER_DAY;

/** First minute shown in the Today lane (5:00 AM). */
export const SCHEDULE_VIEW_START_MINUTE = 5 * 60;

/**
 * Exclusive end of the visible lane (midnight). The last full hour row is 11 PM–12 AM.
 * Span = 19 hours (5 AM … 11:59 PM) so the lane is shorter than 24h and minutes appear larger.
 */
export const SCHEDULE_VIEW_END_EXCLUSIVE_MINUTE = 24 * 60;

export const SCHEDULE_VIEW_SPAN_MINUTES =
  SCHEDULE_VIEW_END_EXCLUSIVE_MINUTE - SCHEDULE_VIEW_START_MINUTE;

export function clampMinuteOfDay(m: number): number {
  return Math.max(0, Math.min(MINUTES_PER_DAY, Math.round(m)));
}

export function snapMinutes(m: number, step: number): number {
  const s = Math.max(1, step);
  return clampMinuteOfDay(Math.round(m / s) * s);
}

/** "9:00" style label for a minute offset (floored to the hour for ticks). */
export function formatHourTick(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60) % 24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12} ${period}`;
}

export function formatTime(minuteOfDay: number): string {
  const m = clampMinuteOfDay(minuteOfDay);
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const mm = min.toString().padStart(2, '0');
  return `${hour12}:${mm} ${period}`;
}
