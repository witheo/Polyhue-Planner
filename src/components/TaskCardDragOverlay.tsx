import { MIN_TASK_DURATION_MINUTES } from '../domain/durations';
import { laneCardHeightPx } from '../domain/laneLayout';
import type { Task } from '../domain/types';

type Props = {
  task: Task;
};

/** Non-draggable visual clone for `DragOverlay` (ticket-style, not the tall lane layout). */
export function TaskCardDragOverlay({ task }: Props) {
  const compact = task.durationMinutes <= MIN_TASK_DURATION_MINUTES;
  return (
    <div
      className={`ph-card ph-card--backlog ph-card--drag-overlay${compact ? ' ph-card--duration-sm' : ''}`}
      style={{
        borderLeft: `4px solid ${task.color ?? 'var(--ph-accent)'}`,
        minHeight: laneCardHeightPx(task.durationMinutes),
      }}
    >
      <div className="ph-card__body">
        <div className="ph-card__title">{task.title}</div>
        <div className="ph-card__meta">
          {task.durationMinutes} min
        </div>
      </div>
    </div>
  );
}
