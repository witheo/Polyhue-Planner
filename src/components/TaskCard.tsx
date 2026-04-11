import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';

import { draggableTaskId } from '../dndIds';
import { laneCardHeightPx } from '../domain/laneLayout';
import { badgeRingForTask, badgeSidesForTask } from '../domain/taskBadge';
import type { Task } from '../domain/types';
import { usePlannerStore } from '../state/store';

import { TicketBadgeFace } from './TaskCardAccentGrid';

type Props = {
  task: Task;
  variant: 'backlog' | 'lane';
  laneStyle?: CSSProperties;
  onRemove?: () => void;
};

const ACCENT_BORDER = '6px';

export function TaskCard({ task, variant, laneStyle, onRemove }: Props) {
  const openTaskDetail = usePlannerStore((s) => s.openTaskDetail);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableTaskId(task.id),
    data: { taskId: task.id },
  });

  const accent = badgeRingForTask(task);

  const style: CSSProperties = {
    ...(variant === 'lane'
      ? laneStyle
      : {
          height: laneCardHeightPx(task.durationMinutes),
        }),
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.22 : 1,
    borderLeft: `${ACCENT_BORDER} solid ${accent}`,
    borderTop: `${ACCENT_BORDER} solid ${accent}`,
  };

  return (
    <div
      ref={setNodeRef}
      className={
        (variant === 'backlog' ? 'ph-card' : 'ph-card ph-card--lane') +
        ' ph-card--ticket ph-card__ticket-stack'
      }
      style={style}
      {...attributes}
      {...listeners}
      aria-label={`Drag to move: ${task.title}`}
    >
      <div className="ph-card__ticket-grid">
        <div className="ph-card__ticket-badge-slot">
          <TicketBadgeFace
            compact
            sides={badgeSidesForTask(task)}
            ringColor={badgeRingForTask(task)}
          />
        </div>
        <div className="ph-card__ticket-meta-slot" aria-hidden="true" />
        <div className="ph-card__body">
          <button
            type="button"
            className="ph-card__title--ticket ph-card__title-link"
            aria-label={`Open details for ${task.title}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              openTaskDetail(task.id);
            }}
          >
            {task.title}
          </button>
        </div>
        <div className="ph-card__actions">
          {onRemove ? (
            <button
              type="button"
              className="ph-icon-btn ph-icon-btn--ticket"
              aria-label={`Remove ${task.title}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              ×
            </button>
          ) : (
            <button
              type="button"
              className="ph-icon-btn ph-icon-btn--ticket ph-card__ticket-remove-sizer"
              tabIndex={-1}
              disabled
              aria-hidden
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
