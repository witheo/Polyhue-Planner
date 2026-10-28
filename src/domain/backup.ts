import type { PersistedStateV1 } from './types';

export const BACKUP_FILENAME = 'polyhue-planner-backup.json';

export type BackupParseResult =
  | { ok: true; state: PersistedStateV1 }
  | { ok: false; error: string };

export function serializeBackup(state: PersistedStateV1): string {
  return JSON.stringify({ tasks: state.tasks, blocks: state.blocks }, null, 2);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validates the shape of a backup file without touching app state. The store still normalizes
 * (clamps durations, drops out-of-window blocks) when the parsed state is applied.
 */
export function parseBackup(text: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!isRecord(raw) || !Array.isArray(raw.tasks) || !Array.isArray(raw.blocks)) {
    return { ok: false, error: 'Backup must contain a "tasks" list and a "blocks" list.' };
  }

  const ids = new Set<string>();
  for (const [i, t] of raw.tasks.entries()) {
    const n = i + 1;
    if (!isRecord(t)) return { ok: false, error: `Task ${n} is not an object.` };
    if (typeof t.id !== 'string' || t.id === '') {
      return { ok: false, error: `Task ${n} is missing an id.` };
    }
    if (ids.has(t.id)) return { ok: false, error: `Task id "${t.id}" appears more than once.` };
    ids.add(t.id);
    if (typeof t.title !== 'string') return { ok: false, error: `Task ${n} is missing a title.` };
    if (typeof t.durationMinutes !== 'number' || !Number.isFinite(t.durationMinutes)) {
      return { ok: false, error: `Task ${n} has no valid duration.` };
    }
    if (t.status !== 'backlog' && t.status !== 'scheduled') {
      return { ok: false, error: `Task ${n} has an unknown status.` };
    }
  }

  for (const [i, b] of raw.blocks.entries()) {
    const n = i + 1;
    if (!isRecord(b)) return { ok: false, error: `Block ${n} is not an object.` };
    if (typeof b.taskId !== 'string' || !ids.has(b.taskId)) {
      return { ok: false, error: `Block ${n} refers to a task that is not in the backup.` };
    }
    if (typeof b.startMinuteOfDay !== 'number' || !Number.isFinite(b.startMinuteOfDay)) {
      return { ok: false, error: `Block ${n} has no valid start time.` };
    }
    if (b.scheduledDate !== undefined && typeof b.scheduledDate !== 'string') {
      return { ok: false, error: `Block ${n} has an invalid date.` };
    }
  }

  return { ok: true, state: { tasks: raw.tasks, blocks: raw.blocks } as PersistedStateV1 };
}
