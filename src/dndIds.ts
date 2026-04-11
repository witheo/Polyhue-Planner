const DRAG_PREFIX = 'task-';

export function draggableTaskId(taskId: string): string {
  return `${DRAG_PREFIX}${taskId}`;
}

export function parseDraggableTaskId(id: string | undefined): string | null {
  if (!id?.startsWith(DRAG_PREFIX)) return null;
  return id.slice(DRAG_PREFIX.length);
}
