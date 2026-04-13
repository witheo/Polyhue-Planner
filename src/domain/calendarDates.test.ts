import { describe, expect, it } from 'vitest';

import {
  addDaysLocal,
  clampDateBetween,
  clampDateIntoWeek,
  getPlanningWindowBounds,
  localDateString,
  startOfWeekMonday,
  weekDatesContaining,
} from './calendarDates';

describe('localDateString', () => {
  it('uses local calendar components, not UTC', () => {
    const d = new Date(2026, 3, 12, 23, 30, 0);
    expect(localDateString(d)).toBe('2026-04-12');
  });
});

describe('startOfWeekMonday', () => {
  it('returns Monday for a Wednesday in April 2026', () => {
    const wed = new Date(2026, 3, 8, 15, 0, 0);
    const mon = startOfWeekMonday(wed);
    expect(mon.getDay()).toBe(1);
    expect(localDateString(mon)).toBe('2026-04-06');
  });

  it('returns the same day when already Monday', () => {
    const mon = new Date(2026, 3, 6, 9, 0, 0);
    const start = startOfWeekMonday(mon);
    expect(localDateString(start)).toBe('2026-04-06');
  });

  it('steps back to Monday from Sunday', () => {
    const sun = new Date(2026, 3, 12, 10, 0, 0);
    const mon = startOfWeekMonday(sun);
    expect(localDateString(mon)).toBe('2026-04-06');
  });
});

describe('addDaysLocal', () => {
  it('advances across a month boundary', () => {
    expect(addDaysLocal('2026-04-30', 1)).toBe('2026-05-01');
  });
});

describe('clampDateBetween', () => {
  it('clamps below min', () => {
    expect(clampDateBetween('2026-01-01', '2026-04-01', '2026-04-30')).toBe('2026-04-01');
  });

  it('clamps above max', () => {
    expect(clampDateBetween('2026-12-31', '2026-04-01', '2026-04-30')).toBe('2026-04-30');
  });

  it('returns date when in range', () => {
    expect(clampDateBetween('2026-04-15', '2026-04-01', '2026-04-30')).toBe('2026-04-15');
  });
});

describe('getPlanningWindowBounds', () => {
  it('returns 21 consecutive days from Monday of prior week through Sunday two weeks ahead', () => {
    const wed = new Date(2026, 3, 8, 12, 0, 0);
    const { rangeStart, rangeEnd } = getPlanningWindowBounds(wed);
    expect(rangeStart).toBe('2026-03-30');
    expect(rangeEnd).toBe('2026-04-19');
    expect(addDaysLocal(rangeStart, 20)).toBe(rangeEnd);
  });
});

describe('clampDateIntoWeek', () => {
  it('returns the date when it is in the week list', () => {
    const week = ['2026-04-06', '2026-04-07', '2026-04-08'];
    expect(clampDateIntoWeek('2026-04-07', week)).toBe('2026-04-07');
  });

  it('returns Monday when the date is outside the week list', () => {
    const week = ['2026-04-06', '2026-04-07', '2026-04-08'];
    expect(clampDateIntoWeek('2026-05-01', week)).toBe('2026-04-06');
  });
});

describe('weekDatesContaining', () => {
  it('returns Mon through Sun for a mid-week anchor', () => {
    const wed = new Date(2026, 3, 8, 12, 0, 0);
    expect(weekDatesContaining(wed)).toEqual([
      '2026-04-06',
      '2026-04-07',
      '2026-04-08',
      '2026-04-09',
      '2026-04-10',
      '2026-04-11',
      '2026-04-12',
    ]);
  });
});
