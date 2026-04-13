function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Local calendar day as `YYYY-MM-DD` (not UTC). */
export function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${pad2(m)}-${pad2(day)}`;
}

/** Monday 00:00:00 local time for the week containing `d`. */
export function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const dow = copy.getDay();
  const daysFromMonday = (dow + 6) % 7;
  copy.setDate(copy.getDate() - daysFromMonday);
  return copy;
}

/** Add whole days to a local `YYYY-MM-DD` string; uses noon to reduce DST edge issues. */
export function addDaysLocal(dateStr: string, delta: number): string {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const mo = parts[1];
  const day = parts[2];
  if (y === undefined || mo === undefined || day === undefined) return dateStr;
  const d = new Date(y, mo - 1, day, 12, 0, 0, 0);
  d.setDate(d.getDate() + delta);
  return localDateString(d);
}

/** If `dateStr` appears in `weekDates`, return it; otherwise the first day (Monday) of the list. */
export function clampDateIntoWeek(dateStr: string, weekDates: string[]): string {
  if (weekDates.length === 0) return dateStr;
  return weekDates.includes(dateStr) ? dateStr : weekDates[0]!;
}

/** Inclusive clamp for `YYYY-MM-DD` strings (lexicographic order matches calendar order). */
export function clampDateBetween(dateStr: string, minStr: string, maxStr: string): string {
  if (dateStr < minStr) return minStr;
  if (dateStr > maxStr) return maxStr;
  return dateStr;
}

/**
 * Three navigable weeks centered on the calendar week containing `now`:
 * previous week Monday through following week Sunday (21 days, inclusive).
 */
export function getPlanningWindowBounds(now: Date = new Date()): { rangeStart: string; rangeEnd: string } {
  const mon = startOfWeekMonday(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0));
  const rangeStart = addDaysLocal(localDateString(mon), -7);
  const rangeEnd = addDaysLocal(rangeStart, 20);
  return { rangeStart, rangeEnd };
}

/** Seven local dates Monday → Sunday for the week containing `anchor`. */
export function weekDatesContaining(anchor: Date): string[] {
  const monday = startOfWeekMonday(anchor);
  const out: string[] = [];
  const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 12, 0, 0, 0);
  for (let i = 0; i < 7; i += 1) {
    out.push(localDateString(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isLocalIsoDateString(s: string): boolean {
  return ISO_DATE.test(s);
}

export function formatDayColumnLabel(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const mo = parts[1];
  const day = parts[2];
  if (y === undefined || mo === undefined || day === undefined) return dateStr;
  const dt = new Date(y, mo - 1, day, 12, 0, 0, 0);
  const wd = dt.toLocaleDateString(undefined, { weekday: 'short' });
  const md = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${wd} ${md}`;
}

export function formatWeekRangeLabel(weekDates: string[]): string {
  if (weekDates.length === 0) return '';
  const toNoon = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y!, m! - 1, d!, 12, 0, 0, 0);
  };
  const a = toNoon(weekDates[0]!);
  const b = toNoon(weekDates[weekDates.length - 1]!);
  const sameYear = a.getFullYear() === b.getFullYear();
  const startOpts: Intl.DateTimeFormatOptions = sameYear
    ? { weekday: 'short', month: 'short', day: 'numeric' }
    : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  const endOpts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  return `${a.toLocaleDateString(undefined, startOpts)} – ${b.toLocaleDateString(undefined, endOpts)}`;
}
