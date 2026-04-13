import { MIN_TASK_DURATION_MINUTES } from './durations';
import type { ScheduledBlock, Task, TaskId } from './types';
import { MINUTES_IN_DAY, clampMinuteOfDay, snapMinutes } from './time';

export type BlockSpan = {
  taskId: TaskId;
  start: number;
  end: number;
};

export function taskEndMinute(task: Task, startMinute: number): number {
  return startMinute + Math.max(MIN_TASK_DURATION_MINUTES, task.durationMinutes);
}

export function spansOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function blockSpan(block: ScheduledBlock, taskById: Map<TaskId, Task>): BlockSpan | null {
  const task = taskById.get(block.taskId);
  if (!task) return null;
  const start = clampMinuteOfDay(block.startMinuteOfDay);
  const end = taskEndMinute(task, start);
  return { taskId: block.taskId, start, end };
}

export function blocksOnDate(blocks: ScheduledBlock[], scheduledDate: string): ScheduledBlock[] {
  return blocks.filter((b) => b.scheduledDate === scheduledDate);
}

export function collectSpans(
  blocks: ScheduledBlock[],
  taskById: Map<TaskId, Task>,
  excludeTaskId?: TaskId,
): BlockSpan[] {
  const out: BlockSpan[] = [];
  for (const b of blocks) {
    if (excludeTaskId && b.taskId === excludeTaskId) continue;
    const span = blockSpan(b, taskById);
    if (span) out.push(span);
  }
  return out;
}

export function placementValid(
  task: Task,
  desiredStart: number,
  blocks: ScheduledBlock[],
  taskById: Map<TaskId, Task>,
  excludeTaskId?: TaskId,
): boolean {
  const start = clampMinuteOfDay(desiredStart);
  const end = taskEndMinute(task, start);
  if (end > MINUTES_IN_DAY) return false;
  const spans = collectSpans(blocks, taskById, excludeTaskId ?? task.id);
  return !spans.some((s) => spansOverlap(start, end, s.start, s.end));
}

export function placementValidForDate(
  task: Task,
  desiredStart: number,
  blocks: ScheduledBlock[],
  scheduledDate: string,
  taskById: Map<TaskId, Task>,
  excludeTaskId?: TaskId,
): boolean {
  return placementValid(task, desiredStart, blocksOnDate(blocks, scheduledDate), taskById, excludeTaskId);
}

export function resolveDropStartForDate(
  task: Task,
  rawStartMinute: number,
  blocks: ScheduledBlock[],
  scheduledDate: string,
  taskById: Map<TaskId, Task>,
  options: { snapStep: number; excludeTaskId?: TaskId } = { snapStep: 15 },
): number | null {
  return resolveDropStart(task, rawStartMinute, blocksOnDate(blocks, scheduledDate), taskById, options);
}

/**
 * Snap then search a small window for a non-overlapping start; otherwise return null (reject drop).
 */
export function resolveDropStart(
  task: Task,
  rawStartMinute: number,
  blocks: ScheduledBlock[],
  taskById: Map<TaskId, Task>,
  options: { snapStep: number; excludeTaskId?: TaskId } = { snapStep: 15 },
): number | null {
  const snapped = snapMinutes(rawStartMinute, options.snapStep);
  const exclude = options.excludeTaskId ?? task.id;
  if (placementValid(task, snapped, blocks, taskById, exclude)) return clampMinuteOfDay(snapped);

  const stride = options.snapStep;
  for (let delta = stride; delta <= 24 * 60; delta += stride) {
    for (const sign of [-1, 1] as const) {
      const candidate = clampMinuteOfDay(snapped + sign * delta);
      if (placementValid(task, candidate, blocks, taskById, exclude)) return candidate;
    }
  }
  return null;
}
