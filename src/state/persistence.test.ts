import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce, load, save, STORAGE_KEY } from './persistence';

function stubStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage = {
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
  };
  vi.stubGlobal('localStorage', storage);
  return { data, storage };
}

afterEach(() => vi.unstubAllGlobals())

describe('load', () => {
  it('returns null when nothing is stored', () => {
    stubStorage();
    expect(load()).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    stubStorage({ [STORAGE_KEY]: '{not json' });
    expect(load()).toBeNull();
  });

  it.each([
    ['a non-object', '42'],
    ['null', 'null'],
    ['missing blocks', JSON.stringify({ tasks: [] })],
    ['missing tasks', JSON.stringify({ blocks: [] })],
    ['non-array tasks', JSON.stringify({ tasks: {}, blocks: [] })],
    ['non-array blocks', JSON.stringify({ tasks: [], blocks: 'x' })],
  ])('returns null for %s', (_label, raw) => {
    stubStorage({ [STORAGE_KEY]: raw });
    expect(load()).toBeNull();
  });

  it('returns only tasks and blocks from a valid payload', () => {
    const tasks = [{ id: 'a' }];
    const blocks = [{ taskId: 'a' }];
    stubStorage({ [STORAGE_KEY]: JSON.stringify({ tasks, blocks, extra: true }) });
    expect(load()).toEqual({ tasks, blocks });
  });

  it('returns null when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
    });
    expect(load()).toBeNull();
  });
});

describe('save', () => {
  it('writes the state under the versioned key', () => {
    const { data } = stubStorage();
    save({ tasks: [], blocks: [] });
    expect(JSON.parse(data.get(STORAGE_KEY)!)).toEqual({ tasks: [], blocks: [] });
  });

  it('swallows quota or private-mode errors', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(() => save({ tasks: [], blocks: [] })).not.toThrow();
  });
});

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls once with the latest arguments after the delay', () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d(1);
    vi.advanceTimersByTime(50);
    d(2);
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
  });
});
