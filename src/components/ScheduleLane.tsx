import { useDroppable } from '@dnd-kit/core';
import { useMemo } from 'react';

import { MINUTES_IN_DAY, formatHourTick, formatTime } from '../domain/time';
import { usePlannerStore } from '../state/store';
import { TaskCard } from './TaskCard';

export const SCHEDULE_LANE_DROP_ID = 'schedule-lane';

/** One hour == this many CSS pixels in the lane (minute resolution inside). */
export const HOUR_HEIGHT_PX = 48;

const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;
const LANE_HEIGHT_PX = (MINUTES_IN_DAY * HOUR_HEIGHT_PX) / 60;

export function ScheduleLane() {
  const tasks = usePlannerStore((s) => s.tasks);
  const blocks = usePlannerStore((s) => s.blocks);
  const removeTask = usePlannerStore((s) => s.removeTask);
  const updateTaskDuration = usePlannerStore((s) => s.updateTaskDuration);

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const { setNodeRef, isOver } = useDroppable({ id: SCHEDULE_LANE_DROP_ID });

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let m = 0; m < MINUTES_IN_DAY; m += 60) out.push(m);
    return out;
  }, []);

  return (
    <section className={`ph-panel ph-lane${isOver ? ' ph-lane--over' : ''}`} aria-label="Today’s schedule">
      <header className="ph-panel__header">
        <h2 className="ph-panel__title">Today</h2>
        <p className="ph-panel__hint">
          One lane, {MINUTES_IN_DAY / 60} hours tall. Snaps to 15 minutes. No overlaps.
        </p>
      </header>
      <div className="ph-lane__scroll">
        <div
          ref={setNodeRef}
          data-ph-schedule-lane
          className="ph-lane__inner"
          style={{ height: LANE_HEIGHT_PX }}
        >
          <div className="ph-lane__ticks" aria-hidden>
            {ticks.map((m) => (
              <div key={m} className="ph-lane__tick" style={{ top: m * PX_PER_MINUTE }}>
                <span>{formatHourTick(m)}</span>
              </div>
            ))}
          </div>
          <div className="ph-lane__canvas">
            {blocks.map((block) => {
              const task = tasksById.get(block.taskId);
              if (!task) return null;
              const top = block.startMinuteOfDay * PX_PER_MINUTE;
              const height = Math.max(24, task.durationMinutes * PX_PER_MINUTE);
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
