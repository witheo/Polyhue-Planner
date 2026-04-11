import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';

import { draggableTaskId } from '../dndIds';
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

  const style: CSSProperties = {
    ...(variant === 'lane' ? laneStyle : {}),
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
    borderLeft: `4px solid ${task.color ?? 'var(--ph-accent)'}`,
  };

  return (
    <div
      ref={setNodeRef}
      className={variant === 'backlog' ? 'ph-card ph-card--backlog' : 'ph-card ph-card--lane'}
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
                min={5}
                step={5}
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
