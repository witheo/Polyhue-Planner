import type { CSSProperties } from 'react';

import { laneCardHeightPx } from '../domain/laneLayout';
import { badgeRingForTask, badgeSidesForTask } from '../domain/taskBadge';
import type { Task } from '../domain/types';

import { TaskTicketSubtasks } from './TaskTicketSubtasks';
import { TicketBadgeFace } from './TaskCardAccentGrid';

type Props = {
  task: Task;
};

const ACCENT_BORDER = '6px';

/** Non-draggable visual clone for `DragOverlay` — matches ticket border accent. */
export function TaskCardDragOverlay({ task }: Props) {
  const accent = badgeRingForTask(task);
  const style: CSSProperties = {
    height: laneCardHeightPx(task.durationMinutes),
    borderLeft: `${ACCENT_BORDER} solid ${accent}`,
    borderTop: `${ACCENT_BORDER} solid ${accent}`,
  };
  return (
    <div
      className="ph-card ph-card--ticket ph-card--drag-overlay ph-card__ticket-stack"
      style={style}
    >
      <div className="ph-card__ticket-grid">
        <div className="ph-card__ticket-badge-slot" aria-hidden="true">
          <TicketBadgeFace
            compact
            sides={badgeSidesForTask(task)}
            ringColor={badgeRingForTask(task)}
          />
        </div>
        <div className="ph-card__ticket-meta-slot" aria-hidden="true" />
        <div className="ph-card__body">
          <span className="ph-card__title--ticket ph-card__title-link ph-card__title-link--static">
            {task.title}
          </span>
          <TaskTicketSubtasks task={task} />
        </div>
        <div className="ph-card__actions" aria-hidden>
          <button
            type="button"
            className="ph-icon-btn ph-icon-btn--ticket ph-card__ticket-remove-sizer"
            tabIndex={-1}
            disabled
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
