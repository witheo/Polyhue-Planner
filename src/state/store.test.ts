import { beforeEach, describe, expect, it } from 'vitest';

import { localDateString } from '../domain/calendarDates';
import { spansOverlap } from '../domain/schedule';
import type { ScheduledBlock, Task } from '../domain/types';
import {
  NOTICE_DURATION_NO_FIT,
  NOTICE_NO_FREE_SLOT,
  NOTICE_OUTSIDE_WINDOW,
  NOTICE_SUBTASKS_NO_FIT,
  usePlannerStore,
} from './store';

const TODAY = localDateString(new Date());

function task(id: string, durationMinutes: number, status: Task['status'] = 'scheduled'): Task {
  return { id, title: id, durationMinutes, status, createdAt: '2026-01-01T00:00:00.000Z' };
}

function block(taskId: string, startMinuteOfDay: number): ScheduledBlock {
  return { taskId, startMinuteOfDay, scheduledDate: TODAY };
}

function seed(tasks: Task[], blocks: ScheduledBlock[]) {
  usePlannerStore.setState({ tasks, blocks, detailTaskId: null, notice: null });
}

function state() {
  return usePlannerStore.getState();
}

beforeEach(() => seed([], []));

describe('updateTaskDuration', () => {
  it('clamps to the minimum task duration', () => {
    seed([task('a', 60, 'backlog')], []);
    state().updateTaskDuration('a', 5);
    expect(state().tasks[0]!.durationMinutes).toBe(15);
  });

  it('updates a backlog task without touching blocks', () => {
    seed([task('a', 30, 'backlog')], []);
    state().updateTaskDuration('a', 90);
    expect(state().tasks[0]!.durationMinutes).toBe(90);
    expect(state().blocks).toEqual([]);
  });

  it('keeps the block in place when the new duration still fits', () => {
    seed([task('a', 60), task('b', 60)], [block('a', 300), block('b', 480)]);
    state().updateTaskDuration('a', 120);
    expect(state().tasks.find((t) => t.id === 'a')!.durationMinutes).toBe(120);
    expect(state().blocks.find((b) => b.taskId === 'a')!.startMinuteOfDay).toBe(300);
  });

  it('moves the block to a free slot when growing would overlap a neighbour', () => {
    seed([task('a', 60), task('b', 60)], [block('a', 300), block('b', 360)]);
    state().updateTaskDuration('a', 120);

    expect(state().tasks.find((t) => t.id === 'a')!.durationMinutes).toBe(120);
    const a = state().blocks.find((b) => b.taskId === 'a')!;
    const b = state().blocks.find((x) => x.taskId === 'b')!;
    expect(b.startMinuteOfDay).toBe(360);
    expect(spansOverlap(a.startMinuteOfDay, a.startMinuteOfDay + 120, 360, 420)).toBe(false);
  });

  it('rejects the change entirely when no free slot exists', () => {
    // c (midnight to 5 AM) and b (6 AM to midnight) leave no room for a to grow or move.
    seed(
      [task('a', 60), task('b', 1080), task('c', 300)],
      [block('a', 300), block('b', 360), block('c', 0)],
    );
    const before = state();
    state().updateTaskDuration('a', 120);

    expect(state().tasks).toBe(before.tasks);
    expect(state().blocks).toBe(before.blocks);
    expect(state().notice?.message).toBe(NOTICE_DURATION_NO_FIT);
  });

  it('does not set a notice when the change is applied', () => {
    seed([task('a', 60), task('b', 60)], [block('a', 300), block('b', 480)]);
    state().updateTaskDuration('a', 120);
    expect(state().notice).toBeNull();
  });

  // Growing a block in a full lane currently moves it to 4:00 AM, above the visible lane
  // (SCHEDULE_VIEW_START_MINUTE is 5:00 AM) because placement only bounds blocks to 0..1440.
  it.todo('keeps a resized block inside the visible lane (5 AM to midnight)');

  it('ignores tasks whose duration is rolled up from subtasks', () => {
    const withSubtasks: Task = {
      ...task('a', 30, 'backlog'),
      subtasks: [{ label: 's', durationMinutes: 30 }],
    };
    seed([withSubtasks], []);
    state().updateTaskDuration('a', 90);
    expect(state().tasks[0]!.durationMinutes).toBe(30);
  });
});

describe('updateTaskSubtasks', () => {
  it('rejects the change with a notice when the rolled-up duration has no free slot', () => {
    seed(
      [task('a', 60), task('b', 1080), task('c', 300)],
      [block('a', 300), block('b', 360), block('c', 0)],
    );
    const before = state();
    state().updateTaskSubtasks('a', [{ label: 'big', durationMinutes: 120 }]);

    expect(state().tasks).toBe(before.tasks);
    expect(state().notice?.message).toBe(NOTICE_SUBTASKS_NO_FIT);
  });
});

describe('dropOnSchedule', () => {
  const rect = { top: 0, height: 1140 } as DOMRect;

  it('sets a notice when there is no free slot at the drop time', () => {
    seed(
      [task('a', 120, 'backlog'), task('b', 1080), task('c', 300)],
      [block('b', 360), block('c', 0)],
    );
    state().dropOnSchedule('a', TODAY, 400, rect);

    expect(state().blocks.some((b) => b.taskId === 'a')).toBe(false);
    expect(state().notice?.message).toBe(NOTICE_NO_FREE_SLOT);
  });

  it('sets a notice when the day is outside the planning window', () => {
    seed([task('a', 60, 'backlog')], []);
    state().dropOnSchedule('a', '1999-01-01', 400, rect);

    expect(state().blocks).toEqual([]);
    expect(state().notice?.message).toBe(NOTICE_OUTSIDE_WINDOW);
  });

  it('does not set a notice on a successful drop', () => {
    seed([task('a', 60, 'backlog')], []);
    state().dropOnSchedule('a', TODAY, 400, rect);

    expect(state().blocks).toHaveLength(1);
    expect(state().notice).toBeNull();
  });
});

describe('notice', () => {
  const rect = { top: 0, height: 1140 } as DOMRect;

  it('gets a new id for a repeated rejection so it re-announces', () => {
    seed([task('a', 60, 'backlog')], []);
    state().dropOnSchedule('a', '1999-01-01', 0, rect);
    const first = state().notice!;
    state().dropOnSchedule('a', '1999-01-01', 0, rect);

    expect(state().notice!.message).toBe(first.message);
    expect(state().notice!.id).not.toBe(first.id);
  });

  it('dismissNotice clears it', () => {
    seed([task('a', 60, 'backlog')], []);
    state().dropOnSchedule('a', '1999-01-01', 0, rect);
    state().dismissNotice();
    expect(state().notice).toBeNull();
  });
});

describe('removeTask', () => {
  it('removes the task, its block, and closes its detail panel', () => {
    seed([task('a', 30), task('b', 30)], [block('a', 300), block('b', 420)]);
    usePlannerStore.setState({ detailTaskId: 'a' });
    state().removeTask('a');

    expect(state().tasks.map((t) => t.id)).toEqual(['b']);
    expect(state().blocks.map((b) => b.taskId)).toEqual(['b']);
    expect(state().detailTaskId).toBeNull();
  });
});

describe('returnToBacklog', () => {
  it('unschedules a task and drops its block', () => {
    seed([task('a', 30)], [block('a', 300)]);
    state().returnToBacklog('a');

    expect(state().tasks[0]!.status).toBe('backlog');
    expect(state().blocks).toEqual([]);
  });
});

describe('reorderBacklog', () => {
  it('reorders backlog tasks', () => {
    seed([task('a', 30, 'backlog'), task('b', 30, 'backlog'), task('c', 30, 'backlog')], []);
    state().reorderBacklog(['c', 'a', 'b']);
    expect(state().tasks.map((t) => t.id)).toEqual(['c', 'a', 'b']);
  });

  it('is a no-op when the ids are not exactly the backlog set', () => {
    seed([task('a', 30, 'backlog'), task('b', 30, 'backlog')], []);
    state().reorderBacklog(['a']);
    expect(state().tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });
});
