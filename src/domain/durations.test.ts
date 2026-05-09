import { describe, expect, it } from 'vitest';

import {
  MIN_TASK_DURATION_MINUTES,
  minutesFromDurationInput,
  minutesFromSubtaskDurationInput,
  sanitizeDurationDigits,
  taskDurationMinutesEffective,
} from './durations';

describe('sanitizeDurationDigits', () => {
  it('strips non-digits and allows empty', () => {
    expect(sanitizeDurationDigits('')).toBe('');
    expect(sanitizeDurationDigits('30')).toBe('30');
    expect(sanitizeDurationDigits('3a0m')).toBe('30');
  });
});

describe('minutesFromDurationInput', () => {
  it('uses fallback for blank input', () => {
    expect(minutesFromDurationInput('', 30)).toBe(30);
    expect(minutesFromDurationInput('   ', 45)).toBe(45);
  });

  it('parses integers and clamps to minimum', () => {
    expect(minutesFromDurationInput('20', 30)).toBe(20);
    expect(minutesFromDurationInput('12', 30)).toBe(MIN_TASK_DURATION_MINUTES);
    expect(minutesFromDurationInput('0', 30)).toBe(MIN_TASK_DURATION_MINUTES);
  });

  it('uses fallback for non-numeric', () => {
    expect(minutesFromDurationInput('abc', 90)).toBe(90);
  });
});

describe('minutesFromSubtaskDurationInput', () => {
  it('uses fallback for blank input', () => {
    expect(minutesFromSubtaskDurationInput('', 12)).toBe(12);
  });

  it('allows values below the task minimum', () => {
    expect(minutesFromSubtaskDurationInput('5', 15)).toBe(5);
    expect(minutesFromSubtaskDurationInput('1', 30)).toBe(1);
  });

  it('clamps non-positive to 1', () => {
    expect(minutesFromSubtaskDurationInput('0', 10)).toBe(1);
    expect(minutesFromSubtaskDurationInput('-3', 10)).toBe(1);
  });
});

describe('taskDurationMinutesEffective', () => {
  it('uses stored duration when there are no subtasks', () => {
    expect(taskDurationMinutesEffective({ durationMinutes: 45 })).toBe(45);
    expect(taskDurationMinutesEffective({ durationMinutes: 10, subtasks: [] })).toBe(
      MIN_TASK_DURATION_MINUTES,
    );
  });

  it('sums subtask minutes and clamps to task minimum', () => {
    expect(
      taskDurationMinutesEffective({
        durationMinutes: 120,
        subtasks: [{ durationMinutes: 5 }, { durationMinutes: 7 }],
      }),
    ).toBe(MIN_TASK_DURATION_MINUTES);
    expect(
      taskDurationMinutesEffective({
        durationMinutes: 15,
        subtasks: [{ durationMinutes: 20 }, { durationMinutes: 25 }],
      }),
    ).toBe(45);
  });
});
