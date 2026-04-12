import { describe, expect, it } from 'vitest';

import { MIN_TASK_DURATION_MINUTES } from './durations';
import {
  formatTaskDraftDroppedSummary,
  parseTaskDraftsFromProviderJsonText,
  parseTaskDraftsFromProviderPayload,
  taskDraftParseErrorMessage,
} from './taskDraft';

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
    expect(r.dropped).toEqual([]);
  });

  it('clamps duration below minimum', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [{ title: 'x', durationMinutes: 5 }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts[0].durationMinutes).toBe(MIN_TASK_DURATION_MINUTES);
    expect(r.dropped).toEqual([]);
  });

  it('parses duration from numeric string', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [{ title: 'x', durationMinutes: '45' }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts[0].durationMinutes).toBe(45);
  });

  it('defaults duration when field is missing', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [{ title: 'Only title' }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts).toEqual([
      { title: 'Only title', durationMinutes: MIN_TASK_DURATION_MINUTES },
    ]);
  });

  it('parses optional category', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [{ title: 'T', durationMinutes: 30, category: 'Finance' }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts[0].category).toBe('finance');
  });

  it('parses optional subtasks with clamped minutes', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [
        {
          title: 'Ship',
          durationMinutes: 90,
          subtasks: [
            { label: '  Tag  ', durationMinutes: 5 },
            { title: 'Deploy', durationMinutes: 45 },
          ],
        },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts[0].subtasks).toEqual([
      { label: 'Tag', durationMinutes: MIN_TASK_DURATION_MINUTES },
      { label: 'Deploy', durationMinutes: 45 },
    ]);
  });

  it('drops invalid subtask rows but keeps the task', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [
        {
          title: 'T',
          durationMinutes: 30,
          subtasks: [{ label: '' }, { label: 'OK', durationMinutes: 20 }, null],
        },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts[0].subtasks).toEqual([{ label: 'OK', durationMinutes: 20 }]);
  });

  it('drops invalid rows but keeps valid ones and records dropped indices', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [{ title: '' }, { title: 'ok' }, null, { title: 1 }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts).toEqual([{ title: 'ok', durationMinutes: MIN_TASK_DURATION_MINUTES }]);
    expect(r.dropped).toEqual([
      { index: 0, reason: 'title_empty' },
      { index: 2, reason: 'not_object' },
      { index: 3, reason: 'title_not_string' },
    ]);
  });

  it('rejects when no valid tasks and aggregates drops', () => {
    const r = parseTaskDraftsFromProviderPayload({
      tasks: [{ title: '   ' }, { title: 2 }],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('no_valid_tasks');
    if (r.error.code !== 'no_valid_tasks') return;
    expect(r.error.dropped).toEqual([
      { index: 0, reason: 'title_empty' },
      { index: 1, reason: 'title_not_string' },
    ]);
    expect(taskDraftParseErrorMessage(r.error)).toMatch(/No valid tasks/);
  });

  it('rejects missing tasks key', () => {
    const r = parseTaskDraftsFromProviderPayload({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('missing_tasks_key');
  });

  it('rejects non-array tasks', () => {
    const r = parseTaskDraftsFromProviderPayload({ tasks: {} });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('tasks_not_array');
  });

  it('rejects non-object root', () => {
    for (const bad of [null, [], 'tasks', 1] as const) {
      const r = parseTaskDraftsFromProviderPayload(bad);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.code).toBe('not_object');
    }
  });
});

describe('parseTaskDraftsFromProviderJsonText', () => {
  it('returns invalid_json on bad JSON', () => {
    const r = parseTaskDraftsFromProviderJsonText('{');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('invalid_json');
    expect(r.error.message).toMatch(/Invalid JSON/i);
  });

  it('parses valid JSON string same as payload parse', () => {
    const text = JSON.stringify({ tasks: [{ title: '  Z  ', durationMinutes: 12 }] });
    const r = parseTaskDraftsFromProviderJsonText(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drafts).toEqual([{ title: 'Z', durationMinutes: MIN_TASK_DURATION_MINUTES }]);
  });
});

describe('formatTaskDraftDroppedSummary', () => {
  it('returns empty string when nothing was dropped', () => {
    expect(formatTaskDraftDroppedSummary([])).toBe('');
  });

  it('lists row numbers and reasons', () => {
    const s = formatTaskDraftDroppedSummary([
      { index: 0, reason: 'title_empty' },
      { index: 2, reason: 'not_object' },
    ]);
    expect(s).toMatch(/Skipped 2 row/);
    expect(s).toMatch(/#1:/);
    expect(s).toMatch(/#3:/);
  });
});
