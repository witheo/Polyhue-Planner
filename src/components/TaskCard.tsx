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
};

export function TaskCard({ task, variant, laneStyle, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableTaskId(task.id),
    data: { taskId: task.id },
  });

  const style: React.CSSProperties = {
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
        <div className="ph-card__meta">{task.durationMinutes} min</div>
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
