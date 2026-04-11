import { describe, expect, it } from 'vitest';

import { placementValid, resolveDropStart, spansOverlap } from './schedule';
import type { ScheduledBlock, Task } from './types';

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
    const blocks: ScheduledBlock[] = [{ taskId: 'a', startMinuteOfDay: 120 }];
    expect(placementValid(tB, 120, blocks, map, 'b')).toBe(false);
    expect(placementValid(tB, 180, blocks, map, 'b')).toBe(true);
  });

  it('ignores the excluded task when repositioning', () => {
    const tA = task('a', 60);
    const map = new Map<string, Task>([['a', tA]]);
    const blocks: ScheduledBlock[] = [{ taskId: 'a', startMinuteOfDay: 120 }];
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
    const blocks: ScheduledBlock[] = [{ taskId: 'a', startMinuteOfDay: 120 }];
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
    const blocks: ScheduledBlock[] = [{ taskId: 'a', startMinuteOfDay: 0 }];
    expect(resolveDropStart(tB, 400, blocks, map, { snapStep: 15, excludeTaskId: 'b' })).toBeNull();
  });
});
