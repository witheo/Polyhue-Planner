import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';

import { draggableTaskId } from '../dndIds';
import { DURATION_STEP_MINUTES, MIN_TASK_DURATION_MINUTES } from '../domain/durations';
import { laneCardHeightPx } from '../domain/laneLayout';
import type { Task } from '../domain/types';

type Props = {
  task: Task;
  variant: 'backlog' | 'lane';
  laneStyle?: CSSProperties;
  onRemove?: () => void;
  onDurationChange?: (minutes: number) => void;
};

export function TaskCard({ task, variant, laneStyle, onRemove, onDurationChange }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableTaskId(task.id),
    data: { taskId: task.id },
  });

  const compact = task.durationMinutes <= MIN_TASK_DURATION_MINUTES;

  const style: CSSProperties = {
    ...(variant === 'lane' ? laneStyle : { minHeight: laneCardHeightPx(task.durationMinutes) }),
    transform: CSS.Translate.toString(transform),
    /* Source card stays as a faint placeholder; DragOverlay shows the lifted clone. */
    opacity: isDragging ? 0.22 : 1,
    borderLeft: `4px solid ${task.color ?? 'var(--ph-accent)'}`,
  };

  const cardClass =
    (variant === 'backlog' ? 'ph-card ph-card--backlog' : 'ph-card ph-card--lane') +
    (compact ? ' ph-card--duration-sm' : '');

  return (
    <div
      ref={setNodeRef}
      className={cardClass}
      style={style}
      {...listeners}
      {...attributes}
    >
      <div className="ph-card__body">
        <div className="ph-card__title">{task.title}</div>
        <div className="ph-card__meta">
          {onDurationChange ? (
            <label className="ph-card__duration-label" htmlFor={`duration-${task.id}`}>
              <span className="ph-sr-only">Duration in minutes</span>
              <input
                id={`duration-${task.id}`}
                className="ph-input ph-input--inline"
                type="number"
                min={MIN_TASK_DURATION_MINUTES}
                step={DURATION_STEP_MINUTES}
                value={task.durationMinutes}
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) onDurationChange(n);
                }}
              />
              <span aria-hidden> min</span>
            </label>
          ) : (
            <>{task.durationMinutes} min</>
          )}
        </div>
      </div>
      {onRemove ? (
        <button
          type="button"
          className="ph-icon-btn"
          aria-label={`Remove ${task.title}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
