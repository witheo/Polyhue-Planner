import { MIN_TASK_DURATION_MINUTES } from './durations';
import { normalizeTaskCategory } from './taskCategories';
import type { TaskCategory, TaskSubtask } from './types';

/** One row from the brain-dump provider before `addTask`. */
export type TaskDraft = {
  title: string;
  description?: string;
  subtasks?: TaskSubtask[];
  category?: TaskCategory;
  durationMinutes: number;
};

export type TaskDraftDroppedReason = 'not_object' | 'title_not_string' | 'title_empty';

export type TaskDraftDroppedRow = {
  index: number;
  reason: TaskDraftDroppedReason;
};

export type TaskDraftParseError =
  | { code: 'invalid_json'; message: string }
  | { code: 'not_object'; message: string }
  | { code: 'missing_tasks_key'; message: string }
  | { code: 'tasks_not_array'; message: string }
  | { code: 'no_valid_tasks'; message: string; dropped: TaskDraftDroppedRow[] };

export type ParseTaskDraftsResult =
  | { ok: true; drafts: TaskDraft[]; dropped: TaskDraftDroppedRow[] }
  | { ok: false; error: TaskDraftParseError };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function clampDurationMinutes(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(MIN_TASK_DURATION_MINUTES, Math.round(raw));
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return Math.max(MIN_TASK_DURATION_MINUTES, Math.round(parsed));
    }
  }
  return MIN_TASK_DURATION_MINUTES;
}

function parseOneTask(raw: unknown): TaskDraft | TaskDraftDroppedRow['reason'] {
  if (!isRecord(raw)) return 'not_object';
  const titleVal = raw.title;
  if (typeof titleVal !== 'string') return 'title_not_string';
  const title = titleVal.trim();
  if (!title) return 'title_empty';

  let description: string | undefined;
  if ('description' in raw) {
    const d = raw.description;
    if (typeof d === 'string') {
      const t = d.trim();
      if (t !== '') description = t;
    }
  }

  const durationMinutes = clampDurationMinutes(
    'durationMinutes' in raw ? raw.durationMinutes : undefined,
  );

  const subtasks = parseSubtasksFromProviderTask(raw);
  const category = normalizeTaskCategory(raw.category);

  return {
    title,
    ...(description !== undefined ? { description } : {}),
    ...(subtasks !== undefined ? { subtasks } : {}),
    ...(category !== undefined ? { category } : {}),
    durationMinutes,
  };
}

function parseSubtasksFromProviderTask(raw: Record<string, unknown>): TaskSubtask[] | undefined {
  if (!('subtasks' in raw)) return undefined;
  const arr = raw.subtasks;
  if (!Array.isArray(arr)) return undefined;
  const out: TaskSubtask[] = [];
  for (const item of arr) {
    if (!isRecord(item)) continue;
    const labelRaw = item.label ?? item.title ?? item.step;
    if (typeof labelRaw !== 'string') continue;
    const label = labelRaw.trim();
    if (!label) continue;
    const durationMinutes = clampDurationMinutes(
      'durationMinutes' in item ? item.durationMinutes : undefined,
    );
    out.push({ label, durationMinutes });
  }
  return out.length > 0 ? out : undefined;
}

/** Human-readable message for alerts and inline UI copy. */
export function taskDraftParseErrorMessage(err: TaskDraftParseError): string {
  return err.message;
}

const droppedReasonLabel: Record<TaskDraftDroppedReason, string> = {
  not_object: 'not a JSON object',
  title_not_string: 'title must be a string',
  title_empty: 'title is empty after trimming',
};

/** Short summary when some array rows were skipped but at least one task parsed. */
export function formatTaskDraftDroppedSummary(dropped: TaskDraftDroppedRow[]): string {
  if (dropped.length === 0) return '';
  const parts = dropped.map(
    (d) => `#${d.index + 1}: ${droppedReasonLabel[d.reason] ?? d.reason}`,
  );
  return `Skipped ${dropped.length} row(s): ${parts.join('; ')}.`;
}

/**
 * Validates the JSON body from `POST /brain-dump` (after `response.json()`).
 */
export function parseTaskDraftsFromProviderPayload(data: unknown): ParseTaskDraftsResult {
  if (!isRecord(data) || Array.isArray(data)) {
    return {
      ok: false,
      error: { code: 'not_object', message: 'Response must be a JSON object.' },
    };
  }
  if (!('tasks' in data)) {
    return {
      ok: false,
      error: {
        code: 'missing_tasks_key',
        message: 'Response must include a "tasks" array.',
      },
    };
  }
  const { tasks } = data;
  if (!Array.isArray(tasks)) {
    return {
      ok: false,
      error: { code: 'tasks_not_array', message: '"tasks" must be an array.' },
    };
  }

  const drafts: TaskDraft[] = [];
  const dropped: TaskDraftDroppedRow[] = [];

  tasks.forEach((item, index) => {
    const row = parseOneTask(item);
    if (typeof row === 'string') {
      dropped.push({ index, reason: row });
      return;
    }
    drafts.push(row);
  });

  if (drafts.length === 0) {
    return {
      ok: false,
      error: {
        code: 'no_valid_tasks',
        message: 'No valid tasks in "tasks" array (need non-empty string titles).',
        dropped,
      },
    };
  }

  return { ok: true, drafts, dropped };
}

/**
 * Parse provider JSON from a wire string (e.g. tests, non-fetch callers).
 * Surfaces JSON syntax errors as {@link TaskDraftParseError} with code `invalid_json`.
 */
export function parseTaskDraftsFromProviderJsonText(jsonText: string): ParseTaskDraftsResult {
  let data: unknown;
  try {
    data = JSON.parse(jsonText) as unknown;
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'parse failed';
    return {
      ok: false,
      error: { code: 'invalid_json', message: `Invalid JSON: ${detail}` },
    };
  }
  return parseTaskDraftsFromProviderPayload(data);
}
