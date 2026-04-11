import { describe, expect, it } from 'vitest';

import { MIN_TASK_DURATION_MINUTES, minutesFromDurationInput, sanitizeDurationDigits } from './durations';

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
