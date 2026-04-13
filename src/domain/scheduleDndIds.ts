export const SCHEDULE_DAY_PREFIX = 'schedule-day:';

export function scheduleDayDropId(scheduledDate: string): string {
  return `${SCHEDULE_DAY_PREFIX}${scheduledDate}`;
}

export function parseScheduleDayDropId(overId: string | number | undefined): string | null {
  const s = String(overId ?? '');
  if (!s.startsWith(SCHEDULE_DAY_PREFIX)) return null;
  const date = s.slice(SCHEDULE_DAY_PREFIX.length);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}
