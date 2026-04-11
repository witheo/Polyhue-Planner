import { useDroppable } from '@dnd-kit/core';
import { useMemo, type CSSProperties } from 'react';

import { laneCardHeightPx, LANE_PIXELS_PER_MINUTE, SCHEDULE_HOUR_HEIGHT_PX } from '../domain/laneLayout';
import {
  SCHEDULE_VIEW_END_EXCLUSIVE_MINUTE,
  SCHEDULE_VIEW_SPAN_MINUTES,
  SCHEDULE_VIEW_START_MINUTE,
  formatHourTick,
  formatTime,
} from '../domain/time';
import { useScheduleDropPreview } from '../scheduleDropPreviewContext';
import { usePlannerStore } from '../state/store';
import { TaskCard } from './TaskCard';

export const SCHEDULE_LANE_DROP_ID = 'schedule-lane';

/** @deprecated Use {@link SCHEDULE_HOUR_HEIGHT_PX} from `laneLayout` — kept for imports. */
export const HOUR_HEIGHT_PX = SCHEDULE_HOUR_HEIGHT_PX;

const PX_PER_MINUTE = LANE_PIXELS_PER_MINUTE;
const LANE_HEIGHT_PX = (SCHEDULE_VIEW_SPAN_MINUTES * SCHEDULE_HOUR_HEIGHT_PX) / 60;

export function ScheduleLane() {
  const tasks = usePlannerStore((s) => s.tasks);
  const blocks = usePlannerStore((s) => s.blocks);
  const removeTask = usePlannerStore((s) => s.removeTask);
  const updateTaskDuration = usePlannerStore((s) => s.updateTaskDuration);
  const dropPreview = useScheduleDropPreview();

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const { setNodeRef, isOver } = useDroppable({ id: SCHEDULE_LANE_DROP_ID });

  const previewTask = dropPreview ? tasksById.get(dropPreview.taskId) : undefined;

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let m = SCHEDULE_VIEW_START_MINUTE; m < SCHEDULE_VIEW_END_EXCLUSIVE_MINUTE; m += 60) {
      out.push(m);
    }
    return out;
  }, []);

  return (
    <section className="ph-panel ph-lane" aria-label="Today’s schedule">
      <header className="ph-panel__header">
        <h2 className="ph-panel__title">Today</h2>
        <p className="ph-panel__hint">
          Lane shows {formatTime(SCHEDULE_VIEW_START_MINUTE)}–{formatTime(SCHEDULE_VIEW_END_EXCLUSIVE_MINUTE - 1)} (
          {SCHEDULE_VIEW_SPAN_MINUTES / 60}h). Snaps to 15 minutes. No overlaps.
        </p>
      </header>
      <div className="ph-lane__scroll">
        <div
          ref={setNodeRef}
          data-ph-schedule-lane
          className={`ph-lane__inner${isOver ? ' ph-lane__inner--over' : ''}`}
          style={
            {
              height: LANE_HEIGHT_PX,
              ['--ph-lane-hour' as string]: `${SCHEDULE_HOUR_HEIGHT_PX}px`,
            } as CSSProperties
          }
        >
          <div className="ph-lane__ticks" aria-hidden>
            {ticks.map((m) => (
              <div
                key={m}
                className="ph-lane__tick"
                style={{ top: (m - SCHEDULE_VIEW_START_MINUTE) * PX_PER_MINUTE }}
              >
                <span>{formatHourTick(m)}</span>
              </div>
            ))}
          </div>
          <div className="ph-lane__canvas">
            {dropPreview && previewTask ? (
              <div
                className="ph-schedule-drop-ghost"
                style={{
                  position: 'absolute',
                  top: (dropPreview.startMinuteOfDay - SCHEDULE_VIEW_START_MINUTE) * PX_PER_MINUTE,
                  height: laneCardHeightPx(previewTask.durationMinutes),
                  left: 0,
                  right: 0,
                }}
                aria-hidden
              >
                <span className="ph-schedule-drop-ghost__label">
                  {formatTime(dropPreview.startMinuteOfDay)} · {previewTask.durationMinutes} min
                </span>
              </div>
            ) : null}
            {blocks.map((block) => {
              const task = tasksById.get(block.taskId);
              if (!task) return null;
              const top = (block.startMinuteOfDay - SCHEDULE_VIEW_START_MINUTE) * PX_PER_MINUTE;
              const height = laneCardHeightPx(task.durationMinutes);
              return (
                <TaskCard
                  key={block.taskId}
                  task={task}
                  variant="lane"
                  laneStyle={{
                    position: 'absolute',
                    top,
                    height,
                    left: 0,
                    right: 0,
                  }}
                  onDurationChange={(m) => updateTaskDuration(task.id, m)}
                  onRemove={() => removeTask(task.id)}
                />
              );
            })}
          </div>
        </div>
      </div>
      <footer className="ph-lane__footer">
        <span className="ph-muted">Tip: {formatTime(9 * 60)} → drag near the top for morning work.</span>
      </footer>
    </section>
  );
}
