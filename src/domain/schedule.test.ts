import { describe, expect, it } from 'vitest';

import {
  blocksOnDate,
  placementValid,
  placementValidForDate,
  resolveDropStart,
  resolveDropStartForDate,
  spansOverlap,
} from './schedule';
import type { ScheduledBlock, Task } from './types';

const D = '2026-04-06';

function task(id: string, durationMinutes: number): Task {
  return {
    id,
    title: id,
    durationMinutes,
    status: 'scheduled',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('spansOverlap', () => {
  it('returns false when one interval ends exactly as the other starts', () => {
    expect(spansOverlap(60, 120, 120, 180)).toBe(false);
  });

  it('returns true when intervals share time', () => {
    expect(spansOverlap(60, 130, 120, 180)).toBe(true);
  });
});

describe('placementValid', () => {
  it('rejects overlap with an existing block', () => {
    const tA = task('a', 60);
    const tB = task('b', 60);
    const map = new Map<string, Task>([
      ['a', tA],
      ['b', tB],
    ]);
    const blocks: ScheduledBlock[] = [{ taskId: 'a', startMinuteOfDay: 120, scheduledDate: D }];
    expect(placementValid(tB, 120, blocks, map, 'b')).toBe(false);
    expect(placementValid(tB, 180, blocks, map, 'b')).toBe(true);
  });

  it('ignores the excluded task when repositioning', () => {
    const tA = task('a', 60);
    const map = new Map<string, Task>([['a', tA]]);
    const blocks: ScheduledBlock[] = [{ taskId: 'a', startMinuteOfDay: 120, scheduledDate: D }];
    expect(placementValid(tA, 120, blocks, map, 'a')).toBe(true);
  });
});

describe('resolveDropStart', () => {
  it('returns a nearby snapped slot when the exact slot is taken', () => {
    const tA = task('a', 60);
    const tB = task('b', 60);
    const map = new Map<string, Task>([
      ['a', tA],
      ['b', tB],
    ]);
    const blocks: ScheduledBlock[] = [{ taskId: 'a', startMinuteOfDay: 120, scheduledDate: D }];
    const start = resolveDropStart(tB, 125, blocks, map, { snapStep: 15, excludeTaskId: 'b' });
    expect(start).not.toBeNull();
    expect(start! % 15).toBe(0);
    expect(placementValid(tB, start!, blocks, map, 'b')).toBe(true);
  });

  it('returns null when no slot fits in the day', () => {
    const tA = task('a', 24 * 60);
    const tB = task('b', 30);
    const map = new Map<string, Task>([
      ['a', tA],
      ['b', tB],
    ]);
    const blocks: ScheduledBlock[] = [{ taskId: 'a', startMinuteOfDay: 0, scheduledDate: D }];
    expect(resolveDropStart(tB, 400, blocks, map, { snapStep: 15, excludeTaskId: 'b' })).toBeNull();
  });
});

describe('blocksOnDate / placementValidForDate', () => {
  it('filters blocks to a single local date', () => {
    const blocks: ScheduledBlock[] = [
      { taskId: 'a', startMinuteOfDay: 60, scheduledDate: '2026-04-06' },
      { taskId: 'b', startMinuteOfDay: 120, scheduledDate: '2026-04-07' },
    ];
    expect(blocksOnDate(blocks, '2026-04-06')).toEqual([blocks[0]]);
  });

  it('allows the same start time on different dates', () => {
    const tA = task('a', 60);
    const tB = task('b', 60);
    const map = new Map<string, Task>([
      ['a', tA],
      ['b', tB],
    ]);
    const blocks: ScheduledBlock[] = [
      { taskId: 'a', startMinuteOfDay: 120, scheduledDate: '2026-04-06' },
      { taskId: 'b', startMinuteOfDay: 120, scheduledDate: '2026-04-07' },
    ];
    expect(placementValidForDate(tB, 120, blocks, '2026-04-07', map, 'b')).toBe(true);
    const start = resolveDropStartForDate(tB, 120, blocks, '2026-04-07', map, {
      snapStep: 15,
      excludeTaskId: 'b',
    });
    expect(start).toBe(120);
  });
});
