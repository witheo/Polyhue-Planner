import { describe, expect, it } from 'vitest';

import {
  addTaskInputsFromApplyableDraftRows,
  draftRowsHaveApplyableTitle,
} from './brainDumpApply';

describe('draftRowsHaveApplyableTitle', () => {
  it('returns false for empty list', () => {
    expect(draftRowsHaveApplyableTitle([])).toBe(false);
  });

  it('returns false when all titles are blank', () => {
    expect(
      draftRowsHaveApplyableTitle([
        { title: '   ', durationInput: '30', durationMinutes: 30 },
        { title: '', durationInput: '15', durationMinutes: 15 },
      ]),
    ).toBe(false);
  });

  it('returns true when at least one title is non-empty', () => {
    expect(
      draftRowsHaveApplyableTitle([
        { title: '', durationInput: '30', durationMinutes: 30 },
        { title: 'OK', durationInput: '30', durationMinutes: 30 },
      ]),
    ).toBe(true);
  });
});

describe('addTaskInputsFromApplyableDraftRows', () => {
  it('skips empty titles and maps durations', () => {
    expect(
      addTaskInputsFromApplyableDraftRows([
        { title: '', durationInput: '30', durationMinutes: 30 },
        { title: ' A ', durationInput: '45', durationMinutes: 45 },
        { title: 'B', durationInput: '', durationMinutes: 20 },
      ]),
    ).toEqual([
      { title: 'A', durationMinutes: 45 },
      { title: 'B', durationMinutes: 20 },
    ]);
  });

  it('includes description when present', () => {
    expect(
      addTaskInputsFromApplyableDraftRows([
        {
          title: 'T',
          durationInput: '30',
          durationMinutes: 30,
          description: 'note',
        },
      ]),
    ).toEqual([{ title: 'T', durationMinutes: 30, description: 'note' }]);
  });

  it('passes through category when present', () => {
    expect(
      addTaskInputsFromApplyableDraftRows([
        {
          title: 'T',
          durationInput: '30',
          durationMinutes: 30,
          category: 'health',
        },
      ]),
    ).toEqual([{ title: 'T', durationMinutes: 30, category: 'health' }]);
  });

  it('passes through subtasks when present', () => {
    expect(
      addTaskInputsFromApplyableDraftRows([
        {
          title: 'T',
          durationInput: '60',
          durationMinutes: 60,
          subtasks: [
            { label: 'A', durationMinutes: 30 },
            { label: 'B', durationMinutes: 30 },
          ],
        },
      ]),
    ).toEqual([
      {
        title: 'T',
        durationMinutes: 60,
        subtasks: [
          { label: 'A', durationMinutes: 30 },
          { label: 'B', durationMinutes: 30 },
        ],
      },
    ]);
  });
});
