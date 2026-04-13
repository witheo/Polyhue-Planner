import {
  useDraggable,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, RefCallback } from 'react';

import { draggableTaskId } from '../dndIds';
import { laneCardHeightPx } from '../domain/laneLayout';
import { badgeRingForTask, badgeSidesForTask } from '../domain/taskBadge';
import type { Task } from '../domain/types';
import { usePlannerStore } from '../state/store';

import { TicketBadgeFace } from './TaskCardAccentGrid';
import { TaskTicketSubtasks } from './TaskTicketSubtasks';

type Props = {
  task: Task;
  variant: 'backlog' | 'lane';
  laneStyle?: CSSProperties;
  onRemove?: () => void;
  backlogReorder?: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
  };
};

const ACCENT_BORDER = '6px';
const LANE_ACCENT_BORDER = '4px';

type ChromeProps = {
  task: Task;
  variant: 'backlog' | 'lane';
  laneStyle?: CSSProperties;
  onRemove?: () => void;
  backlogReorder?: Props['backlogReorder'];
  setNodeRef: RefCallback<HTMLElement>;
  style: CSSProperties;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  isDragging: boolean;
};

function TaskCardChrome({
  task,
  variant,
  laneStyle,
  onRemove,
  backlogReorder,
  setNodeRef,
  style,
  attributes,
  listeners,
  isDragging,
}: ChromeProps) {
  const openTaskDetail = usePlannerStore((s) => s.openTaskDetail);

  const accent = badgeRingForTask(task);
  const accentBorder = variant === 'lane' ? LANE_ACCENT_BORDER : ACCENT_BORDER;

  const mergedStyle: CSSProperties = {
    ...(variant === 'lane'
      ? laneStyle
      : {
          height: laneCardHeightPx(task.durationMinutes),
        }),
    ...style,
    opacity: isDragging ? 0.22 : style.opacity ?? 1,
    borderLeft: `${accentBorder} solid ${accent}`,
    borderTop: `${accentBorder} solid ${accent}`,
  };

  return (
    <div
      ref={setNodeRef}
      className={
        (variant === 'backlog' ? 'ph-card' : 'ph-card ph-card--lane') +
        ' ph-card--ticket ph-card__ticket-stack'
      }
      style={mergedStyle}
      {...attributes}
      {...listeners}
      aria-label={
        task.subtasks?.length
          ? `Drag to move: ${task.title}. ${task.subtasks.length} subtasks.`
          : `Drag to move: ${task.title}`
      }
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
          <TaskTicketSubtasks task={task} />
        </div>
        <div className="ph-card__actions">
          {variant === 'backlog' && backlogReorder ? (
            <span className="ph-card__backlog-reorder" role="group" aria-label={`Reorder ${task.title} in backlog`}>
              <button
                type="button"
                className="ph-icon-btn ph-icon-btn--ticket ph-card__reorder-btn"
                aria-label={`Move ${task.title} up in backlog`}
                disabled={!backlogReorder.canMoveUp}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  backlogReorder.onMoveUp();
                }}
              >
                ↑
              </button>
              <button
                type="button"
                className="ph-icon-btn ph-icon-btn--ticket ph-card__reorder-btn"
                aria-label={`Move ${task.title} down in backlog`}
                disabled={!backlogReorder.canMoveDown}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  backlogReorder.onMoveDown();
                }}
              >
                ↓
              </button>
            </span>
          ) : null}
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

function LaneTaskCard({ task, laneStyle, onRemove }: Pick<Props, 'task' | 'laneStyle' | 'onRemove'>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableTaskId(task.id),
    data: { taskId: task.id },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <TaskCardChrome
      task={task}
      variant="lane"
      laneStyle={laneStyle}
      onRemove={onRemove}
      setNodeRef={setNodeRef}
      style={style}
      attributes={attributes}
      listeners={listeners}
      isDragging={isDragging}
    />
  );
}

function BacklogTaskCard({ task, onRemove, backlogReorder }: Pick<Props, 'task' | 'onRemove' | 'backlogReorder'>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: draggableTaskId(task.id),
    data: { taskId: task.id },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TaskCardChrome
      task={task}
      variant="backlog"
      onRemove={onRemove}
      backlogReorder={backlogReorder}
      setNodeRef={setNodeRef}
      style={style}
      attributes={attributes}
      listeners={listeners}
      isDragging={isDragging}
    />
  );
}

export function TaskCard(props: Props) {
  if (props.variant === 'lane') {
    return <LaneTaskCard task={props.task} laneStyle={props.laneStyle} onRemove={props.onRemove} />;
  }
  return (
    <BacklogTaskCard task={props.task} onRemove={props.onRemove} backlogReorder={props.backlogReorder} />
  );
}
