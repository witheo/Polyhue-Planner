import { minutesFromDurationInput } from './durations';
import type { TaskCategory, TaskSubtask } from './types';

/** Draft row shape needed to build store inputs (matches dialog `DraftRow` fields used on apply). */
export type DraftRowForApply = {
  title: string;
  durationInput: string;
  durationMinutes: number;
  description?: string;
  subtasks?: TaskSubtask[];
  category?: TaskCategory;
};

export type AddTaskInputFromDraft = {
  title: string;
  durationMinutes: number;
  description?: string;
  subtasks?: TaskSubtask[];
  category?: TaskCategory;
};

export function draftRowsHaveApplyableTitle(rows: DraftRowForApply[]): boolean {
  return rows.some((r) => r.title.trim() !== '');
}

/**
 * Maps preview rows to `addTask` / `addTasks` inputs; skips rows with empty trimmed titles.
 */
export function addTaskInputsFromApplyableDraftRows(
  rows: DraftRowForApply[],
): AddTaskInputFromDraft[] {
  const out: AddTaskInputFromDraft[] = [];
  for (const row of rows) {
    const title = row.title.trim();
    if (!title) continue;
    const durationMinutes = minutesFromDurationInput(row.durationInput, row.durationMinutes);
    out.push({
      title,
      durationMinutes,
      ...(row.description !== undefined && row.description !== ''
        ? { description: row.description }
        : {}),
      ...(row.subtasks !== undefined && row.subtasks.length > 0 ? { subtasks: row.subtasks } : {}),
      ...(row.category !== undefined ? { category: row.category } : {}),
    });
  }
  return out;
}
