import type { TaskCategory } from './types';

/** Fixed display order in dropdowns (excludes implicit uncategorized). */
export const TASK_CATEGORY_OPTIONS: TaskCategory[] = [
  'work',
  'personal',
  'health',
  'errands',
  'finance',
  'learning',
  'other',
];

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  work: 'Work',
  personal: 'Personal / life',
  health: 'Health',
  errands: 'Errands & admin',
  finance: 'Finance',
  learning: 'Learning',
  other: 'Other',
};

/** Ticket L color and default badge accent per category (aligned with existing planner palette). */
export const TASK_CATEGORY_COLOR: Record<TaskCategory, string> = {
  work: '#6C63FF',
  personal: '#FF6B6B',
  health: '#4ECDC4',
  errands: '#FFE66D',
  finance: '#D191FF',
  learning: '#95E1D3',
  other: '#8892a8',
};

/**
 * Map provider / AI strings to a canonical category. Unknown labels become `other`.
 * Returns `undefined` when the field is missing so callers can fall back (e.g. palette rotation).
 */
export function normalizeTaskCategory(raw: unknown): TaskCategory | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') return undefined;
  const s = raw.trim().toLowerCase();
  if (!s) return undefined;

  const key = s.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const alias: Record<string, TaskCategory> = {
    work: 'work',
    job: 'work',
    career: 'work',
    personal: 'personal',
    life: 'personal',
    home: 'personal',
    family: 'personal',
    health: 'health',
    wellness: 'health',
    medical: 'health',
    fitness: 'health',
    errands: 'errands',
    admin: 'errands',
    administration: 'errands',
    chores: 'errands',
    errands_and_admin: 'errands',
    errands_admin: 'errands',
    finance: 'finance',
    money: 'finance',
    bills: 'finance',
    banking: 'finance',
    learning: 'learning',
    education: 'learning',
    study: 'learning',
    school: 'learning',
    other: 'other',
    misc: 'other',
    miscellaneous: 'other',
    uncategorized: 'other',
    general: 'other',
  };

  if (key in alias) return alias[key]!;
  if (TASK_CATEGORY_OPTIONS.includes(key as TaskCategory)) return key as TaskCategory;
  return 'other';
}

export function colorForTaskCategory(category: TaskCategory | undefined): string | undefined {
  return category !== undefined ? TASK_CATEGORY_COLOR[category] : undefined;
}
