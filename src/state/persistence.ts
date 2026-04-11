import type { PersistedStateV1 } from '../domain/types';

export const STORAGE_KEY = 'polyhue-planner.v1';

export function load(): PersistedStateV1 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const tasks = (parsed as PersistedStateV1).tasks;
    const blocks = (parsed as PersistedStateV1).blocks;
    if (!Array.isArray(tasks) || !Array.isArray(blocks)) return null;
    return { tasks, blocks };
  } catch {
    return null;
  }
}

export function save(state: PersistedStateV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: T) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
