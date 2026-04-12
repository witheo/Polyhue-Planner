import { describe, expect, it } from 'vitest';

import { TASK_CATEGORY_COLOR, normalizeTaskCategory } from './taskCategories';

describe('normalizeTaskCategory', () => {
  it('returns undefined for missing or empty', () => {
    expect(normalizeTaskCategory(undefined)).toBeUndefined();
    expect(normalizeTaskCategory(null)).toBeUndefined();
    expect(normalizeTaskCategory('')).toBeUndefined();
    expect(normalizeTaskCategory('   ')).toBeUndefined();
  });

  it('normalizes slugs and aliases', () => {
    expect(normalizeTaskCategory('Work')).toBe('work');
    expect(normalizeTaskCategory('ERRANDS')).toBe('errands');
    expect(normalizeTaskCategory('errands_and_admin')).toBe('errands');
    expect(normalizeTaskCategory('bills')).toBe('finance');
    expect(normalizeTaskCategory('study')).toBe('learning');
  });

  it('maps unknown strings to other', () => {
    expect(normalizeTaskCategory('quantum physics')).toBe('other');
  });
});

describe('TASK_CATEGORY_COLOR', () => {
  it('has a hex for every canonical category', () => {
    for (const c of [
      'work',
      'personal',
      'health',
      'errands',
      'finance',
      'learning',
      'other',
    ] as const) {
      expect(TASK_CATEGORY_COLOR[c]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
