import { describe, expect, it } from 'vitest';

import { MIN_TASK_DURATION_MINUTES } from './durations';
import { parseTaskDraftsFromProviderPayload } from './taskDraft';

describe('parseTaskDraftsFromProviderPayload', () => {
  it('accepts a valid tasks array', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [
        { title: '  A  ', durationMinutes: 20, description: '  note  ' },
        { title: 'B' },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts).toEqual([
      { title: 'A', description: 'note', durationMinutes: 20 },
      { title: 'B', durationMinutes: MIN_TASK_DURATION_MINUTES },
    ]);
  });

  it('clamps duration below minimum', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [{ title: 'x', durationMinutes: 5 }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts[0].durationMinutes).toBe(MIN_TASK_DURATION_MINUTES);
  });

  it('parses duration from numeric string', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [{ title: 'x', durationMinutes: '45' }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts[0].durationMinutes).toBe(45);
  });

  it('drops invalid rows but keeps valid ones', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [{ title: '' }, { title: 'ok' }, null, { title: 1 }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts).toEqual([{ title: 'ok', durationMinutes: MIN_TASK_DURATION_MINUTES }]);
  });

  it('rejects when no valid tasks', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [{ title: '   ' }],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/No valid tasks/);
  });

  it('rejects missing tasks', () => {
    const r = parseTaskDraftsFromProviderPayload({});
    expect(r.ok).toBe(false);
  });
});
