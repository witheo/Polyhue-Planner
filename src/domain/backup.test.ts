import { describe, expect, it } from 'vitest';

import { parseBackup, serializeBackup } from './backup';
import type { PersistedStateV1 } from './types';

const state: PersistedStateV1 = {
  tasks: [
    { id: 'a', title: 'A', durationMinutes: 30, status: 'scheduled', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'b', title: 'B', durationMinutes: 45, status: 'backlog', createdAt: '2026-01-01T00:00:00.000Z' },
  ],
  blocks: [{ taskId: 'a', startMinuteOfDay: 360, scheduledDate: '2026-04-06' }],
};

describe('backup round trip', () => {
  it('parses what serializeBackup wrote', () => {
    const result = parseBackup(serializeBackup(state));
    expect(result).toEqual({ ok: true, state });
  });

  it('writes only tasks and blocks', () => {
    const extra = { ...state, detailTaskId: 'a' } as PersistedStateV1;
    expect(Object.keys(JSON.parse(serializeBackup(extra)))).toEqual(['tasks', 'blocks']);
  });
});

describe('parseBackup errors', () => {
  const error = (text: string) => {
    const r = parseBackup(text);
    if (r.ok) throw new Error('expected a parse error');
    return r.error;
  };

  it('rejects invalid JSON', () => {
    expect(error('{nope')).toMatch(/not valid JSON/);
  });

  it.each([
    ['a non-object', '[]'],
    ['null', 'null'],
    ['missing blocks', JSON.stringify({ tasks: [] })],
    ['non-array tasks', JSON.stringify({ tasks: {}, blocks: [] })],
  ])('rejects %s', (_label, text) => {
    expect(error(text)).toMatch(/"tasks" list and a "blocks" list/);
  });

  it('rejects a task without an id', () => {
    const bad = { tasks: [{ title: 'x', durationMinutes: 30, status: 'backlog' }], blocks: [] };
    expect(error(JSON.stringify(bad))).toBe('Task 1 is missing an id.');
  });

  it('rejects duplicate task ids', () => {
    const bad = { tasks: [state.tasks[0], state.tasks[0]], blocks: [] };
    expect(error(JSON.stringify(bad))).toMatch(/more than once/);
  });

  it('rejects a task with a non-numeric duration', () => {
    const bad = { tasks: [{ ...state.tasks[0], durationMinutes: '30' }], blocks: [] };
    expect(error(JSON.stringify(bad))).toBe('Task 1 has no valid duration.');
  });

  it('rejects a task with an unknown status', () => {
    const bad = { tasks: [{ ...state.tasks[0], status: 'done' }], blocks: [] };
    expect(error(JSON.stringify(bad))).toBe('Task 1 has an unknown status.');
  });

  it('rejects a block that points at a missing task', () => {
    const bad = { tasks: [], blocks: [{ taskId: 'ghost', startMinuteOfDay: 0, scheduledDate: '2026-04-06' }] };
    expect(error(JSON.stringify(bad))).toBe('Block 1 refers to a task that is not in the backup.');
  });

  it('rejects a block with a bad start time', () => {
    const bad = { tasks: [state.tasks[0]], blocks: [{ taskId: 'a', startMinuteOfDay: 'noon' }] };
    expect(error(JSON.stringify(bad))).toBe('Block 1 has no valid start time.');
  });
});
