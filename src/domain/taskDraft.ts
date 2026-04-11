import { MIN_TASK_DURATION_MINUTES } from './durations';

/** One row from the brain-dump provider before `addTask`. */
export type TaskDraft = {
  title: string;
  description?: string;
  durationMinutes: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseOneTask(raw: unknown): TaskDraft | null {
  if (!isRecord(raw)) return null;
  const titleVal = raw.title;
  if (typeof titleVal !== 'string') return null;
  const title = titleVal.trim();
  if (!title) return null;

  let description: string | undefined;
  if ('description' in raw) {
    const d = raw.description;
    if (typeof d === 'string') {
      const t = d.trim();
      if (t !== '') description = t;
    }
  }

  let durationMinutes = MIN_TASK_DURATION_MINUTES;
  if ('durationMinutes' in raw) {
    const n = raw.durationMinutes;
    if (typeof n === 'number' && Number.isFinite(n)) {
      durationMinutes = Math.max(MIN_TASK_DURATION_MINUTES, Math.round(n));
    } else if (typeof n === 'string' && n.trim() !== '') {
      const parsed = Number(n);
      if (Number.isFinite(parsed)) {
        durationMinutes = Math.max(MIN_TASK_DURATION_MINUTES, Math.round(parsed));
      }
    }
  }

  if (!Number.isFinite(durationMinutes)) {
    return null;
  }

  return { title, ...(description !== undefined ? { description } : {}), durationMinutes };
}

export type ParseTaskDraftsResult =
  | { ok: true; drafts: TaskDraft[] }
  | { ok: false; error: string };

/**
 * Validates the JSON body from `POST /brain-dump` (after `response.json()`).
 */
export function parseTaskDraftsFromProviderPayload(data: unknown): ParseTaskDraftsResult {
  if (!isRecord(data)) {
    return { ok: false, error: 'Response must be a JSON object.' };
  }
  if (!('tasks' in data)) {
    return { ok: false, error: 'Response must include a "tasks" array.' };
  }
  const { tasks } = data;
  if (!Array.isArray(tasks)) {
    return { ok: false, error: '"tasks" must be an array.' };
  }

  const drafts: TaskDraft[] = [];
  for (const item of tasks) {
    const row = parseOneTask(item);
    if (row) drafts.push(row);
  }

  if (drafts.length === 0) {
    return { ok: false, error: 'No valid tasks in "tasks" array (need non-empty titles).' };
  }

  return { ok: true, drafts };
}
