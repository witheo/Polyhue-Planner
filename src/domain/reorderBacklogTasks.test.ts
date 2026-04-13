import { describe, expect, it } from 'vitest';

import {
  backlogTaskIdsInStoreOrder,
  mergeTasksWithBacklogOrder,
} from './reorderBacklogTasks';
import type { Task } from './types';

const base = (partial: Partial<Task> & Pick<Task, 'id' | 'title' | 'status'>): Task => ({
  durationMinutes: 30,
  createdAt: '2026-01-01T00:00:00.000Z',
  badgeSides: 6,
  badgeAccent: '#fff',
  color: '#fff',
  ...partial,
});

describe('backlogTaskIdsInStoreOrder', () => {
  it('returns backlog ids in array order', () => {
    const tasks = [
      base({ id: 'a', title: 'A', status: 'backlog' }),
      base({ id: 's', title: 'S', status: 'scheduled' }),
      base({ id: 'b', title: 'B', status: 'backlog' }),
    ];
    expect(backlogTaskIdsInStoreOrder(tasks)).toEqual(['a', 'b']);
  });
});

describe('mergeTasksWithBacklogOrder', () => {
  it('reorders only backlog slots and preserves scheduled positions', () => {
    const tasks = [
      base({ id: 'a', title: 'A', status: 'backlog' }),
      base({ id: 's', title: 'S', status: 'scheduled' }),
      base({ id: 'b', title: 'B', status: 'backlog' }),
      base({ id: 'c', title: 'C', status: 'backlog' }),
    ];
    const merged = mergeTasksWithBacklogOrder(tasks, ['c', 'a', 'b']);
    expect(merged).not.toBeNull();
    expect(merged!.map((t) => t.id)).toEqual(['c', 's', 'a', 'b']);
  });

  it('returns null when ordered ids are not a permutation', () => {
    const tasks = [
      base({ id: 'a', title: 'A', status: 'backlog' }),
      base({ id: 'b', title: 'B', status: 'backlog' }),
    ];
    expect(mergeTasksWithBacklogOrder(tasks, ['a'])).toBeNull();
    expect(mergeTasksWithBacklogOrder(tasks, ['a', 'b', 'x'])).toBeNull();
    expect(mergeTasksWithBacklogOrder(tasks, ['a', 'a'])).toBeNull();
  });

  it('accepts single backlog item unchanged order', () => {
    const tasks = [base({ id: 'only', title: 'Only', status: 'backlog' })];
    const merged = mergeTasksWithBacklogOrder(tasks, ['only']);
    expect(merged).not.toBeNull();
    expect(merged!.map((t) => t.id)).toEqual(['only']);
  });

  it('returns null when a backlog id refers to a scheduled row', () => {
    const tasks = [
      base({ id: 'a', title: 'A', status: 'backlog' }),
      base({ id: 's', title: 'S', status: 'scheduled' }),
    ];
    expect(mergeTasksWithBacklogOrder(tasks, ['s', 'a'])).toBeNull();
  });
});
