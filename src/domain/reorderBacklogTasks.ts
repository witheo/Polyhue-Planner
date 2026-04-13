import type { Task, TaskId } from './types';

function sameMultiset(a: TaskId[], b: TaskId[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  for (let i = 0; i < sa.length; i += 1) {
    if (sa[i] !== sb[i]) return false;
  }
  return true;
}

/** Backlog task ids in the order they appear in `tasks`. */
export function backlogTaskIdsInStoreOrder(tasks: Task[]): TaskId[] {
  return tasks.filter((t) => t.status === 'backlog').map((t) => t.id);
}

/**
 * Rebuilds `tasks` so backlog rows follow `orderedBacklogIds` while scheduled rows
 * stay in place. Returns `null` if `orderedBacklogIds` is not a permutation of current backlog ids.
 */
export function mergeTasksWithBacklogOrder(
  tasks: Task[],
  orderedBacklogIds: TaskId[],
): Task[] | null {
  const currentBacklog = backlogTaskIdsInStoreOrder(tasks);
  if (!sameMultiset(currentBacklog, orderedBacklogIds)) return null;

  const queue = [...orderedBacklogIds];
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const next: Task[] = [];

  for (const t of tasks) {
    if (t.status === 'scheduled') {
      next.push(t);
      continue;
    }
    const id = queue.shift();
    if (id === undefined) return null;
    const row = byId.get(id);
    if (!row || row.status !== 'backlog') return null;
    next.push(row);
  }

  if (queue.length !== 0) return null;
  return next;
}
