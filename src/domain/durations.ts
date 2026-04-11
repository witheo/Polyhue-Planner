/** Smallest duration we support in the UI and store (matches 15-minute snap grid). */
export const MIN_TASK_DURATION_MINUTES = 15;

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
