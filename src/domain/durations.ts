/** Smallest duration we support in the UI and store (matches 15-minute snap grid). */
export const MIN_TASK_DURATION_MINUTES = 15;

/** Subtask steps may be shorter than the task grid minimum (still a positive integer). */
export const MIN_SUBTASK_DURATION_MINUTES = 1;

export const DURATION_STEP_MINUTES = 15;

/** Keep only digits (empty allowed while typing). */
export function sanitizeDurationDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Parse minutes from a free-text field. Empty or non-numeric uses `fallback`.
 * Values below minimum clamp to {@link MIN_TASK_DURATION_MINUTES}.
 */
export function minutesFromDurationInput(raw: string, fallback: number): number {
  const t = raw.trim();
  if (t === '') return fallback;
  const n = Number(t);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(MIN_TASK_DURATION_MINUTES, Math.round(n));
}

/**
 * Parse minutes for a subtask text field. Unlike {@link minutesFromDurationInput}, values
 * below the task minimum are allowed; only non-positive values clamp up to 1.
 */
export function minutesFromSubtaskDurationInput(raw: string, fallback: number): number {
  const t = raw.trim();
  if (t === '') return fallback;
  const n = Number(t);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(MIN_SUBTASK_DURATION_MINUTES, Math.round(n));
}

/**
 * When a task has subtasks, total duration is the sum of step minutes (clamped to
 * {@link MIN_TASK_DURATION_MINUTES}). Otherwise uses stored `durationMinutes`.
 */
export function taskDurationMinutesEffective(task: {
  durationMinutes: number;
  subtasks?: { durationMinutes: number }[] | undefined;
}): number {
  const subs = task.subtasks;
  if (subs?.length) {
    const sum = subs.reduce((acc, s) => acc + s.durationMinutes, 0);
    return Math.max(MIN_TASK_DURATION_MINUTES, Math.round(sum));
  }
  return Math.max(MIN_TASK_DURATION_MINUTES, Math.round(task.durationMinutes));
}

/** Coerce a numeric subtask duration from provider JSON (missing/invalid → 1). */
export function subtaskDurationMinutesFromUnknown(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(MIN_SUBTASK_DURATION_MINUTES, Math.round(raw));
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return Math.max(MIN_SUBTASK_DURATION_MINUTES, Math.round(parsed));
    }
  }
  return MIN_SUBTASK_DURATION_MINUTES;
}
