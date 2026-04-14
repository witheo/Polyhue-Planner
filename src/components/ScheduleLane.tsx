import { useDroppable } from '@dnd-kit/core';
import { useMemo, useState, type CSSProperties } from 'react';

import {
  addDaysLocal,
  clampDateBetween,
  clampDateIntoWeek,
  formatDayColumnLabel,
  formatWeekRangeLabel,
  getPlanningWindowBounds,
  localDateString,
  planningWeekOffsetForDate,
  startOfWeekMonday,
  weekDatesContaining,
} from '../domain/calendarDates';
import { laneCardHeightPx, LANE_PIXELS_PER_MINUTE, SCHEDULE_HOUR_HEIGHT_PX } from '../domain/laneLayout';
import { scheduleDayDropId } from '../domain/scheduleDndIds';
import {
  SCHEDULE_VIEW_END_EXCLUSIVE_MINUTE,
  SCHEDULE_VIEW_SPAN_MINUTES,
  SCHEDULE_VIEW_START_MINUTE,
  formatHourTick,
  formatTime,
} from '../domain/time';
import type { ScheduledBlock, Task, TaskId } from '../domain/types';
import { useScheduleDropPreview } from '../scheduleDropPreviewContext';
import { usePlannerStore } from '../state/store';
import { TaskCard } from './TaskCard';

/** @deprecated Use {@link SCHEDULE_HOUR_HEIGHT_PX} from `laneLayout` — kept for imports. */
export const HOUR_HEIGHT_PX = SCHEDULE_HOUR_HEIGHT_PX;

const PX_PER_MINUTE = LANE_PIXELS_PER_MINUTE;
const LANE_HEIGHT_PX = (SCHEDULE_VIEW_SPAN_MINUTES * SCHEDULE_HOUR_HEIGHT_PX) / 60;

function localMidnightFromDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

type ViewMode = 'week' | 'day';

type DayColumnProps = {
  scheduledDate: string;
  blocks: ScheduledBlock[];
  tasksById: Map<TaskId, Task>;
  dropPreviewDate: string | null;
  dropPreviewStart: number | null;
  previewTaskId: TaskId | null;
  /** Rounds the lane’s outer right edge; explicit class avoids :last-of-type quirks with the ticks column. */
  isLastDayInRow: boolean;
};

function ScheduleDayColumn({
  scheduledDate,
  blocks,
  tasksById,
  dropPreviewDate,
  dropPreviewStart,
  previewTaskId,
  isLastDayInRow,
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: scheduleDayDropId(scheduledDate) });

  const previewTask =
    previewTaskId && dropPreviewDate === scheduledDate && dropPreviewStart !== null
      ? tasksById.get(previewTaskId)
      : undefined;

  const laneStyle = {
    height: LANE_HEIGHT_PX,
    ['--ph-lane-hour' as string]: `${SCHEDULE_HOUR_HEIGHT_PX}px`,
  } as CSSProperties;

  return (
    <div className={'ph-lane__day-column' + (isLastDayInRow ? ' ph-lane__day-column--last' : '')}>
      <div
        ref={setNodeRef}
        data-ph-schedule-day
        data-ph-schedule-date={scheduledDate}
        className={`ph-lane__inner ph-lane__inner--column${isOver ? ' ph-lane__inner--over' : ''}`}
        style={laneStyle}
      >
        <div className="ph-lane__canvas ph-lane__canvas--column">
          {previewTask && dropPreviewStart !== null ? (
            <div
              className="ph-schedule-drop-ghost"
              style={{
                position: 'absolute',
                top: (dropPreviewStart - SCHEDULE_VIEW_START_MINUTE) * PX_PER_MINUTE,
                height: laneCardHeightPx(previewTask.durationMinutes),
                left: 0,
                right: 0,
              }}
              aria-hidden
            >
              <span className="ph-schedule-drop-ghost__label">
                {formatTime(dropPreviewStart)} · {previewTask.durationMinutes} min
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
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function weekTitleForOffset(weekOffset: number): string {
  if (weekOffset === 0) return 'This week';
  if (weekOffset < 0) return 'Previous week';
  return 'Next week';
}

export function ScheduleLane() {
  const tasks = usePlannerStore((s) => s.tasks);
  const blocks = usePlannerStore((s) => s.blocks);
  const dropPreview = useScheduleDropPreview();

  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(() => {
    const b = getPlanningWindowBounds();
    return clampDateBetween(localDateString(new Date()), b.rangeStart, b.rangeEnd);
  });

  const weekDates = useMemo(() => {
    const mon = startOfWeekMonday(localMidnightFromDate(new Date()));
    mon.setDate(mon.getDate() + weekOffset * 7);
    return weekDatesContaining(mon);
  }, [weekOffset]);

  const weekRangeLabel = useMemo(() => formatWeekRangeLabel(weekDates), [weekDates]);

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let m = SCHEDULE_VIEW_START_MINUTE; m < SCHEDULE_VIEW_END_EXCLUSIVE_MINUTE; m += 60) {
      out.push(m);
    }
    return out;
  }, []);

  const blocksByDate = useMemo(() => {
    const map = new Map<string, ScheduledBlock[]>();
    for (const d of weekDates) {
      map.set(d, []);
    }
    for (const b of blocks) {
      let list = map.get(b.scheduledDate);
      if (!list) {
        list = [];
        map.set(b.scheduledDate, list);
      }
      list.push(b);
    }
    return map;
  }, [blocks, weekDates]);

  const dayColumnBlocks = blocksByDate.get(selectedDate) ?? [];

  const dropPreviewDate = dropPreview?.scheduledDate ?? null;
  const dropPreviewStart = dropPreview?.startMinuteOfDay ?? null;
  const previewTaskId = dropPreview?.taskId ?? null;

  const bounds = getPlanningWindowBounds();
  const canPrevDay = selectedDate > bounds.rangeStart;
  const canNextDay = selectedDate < bounds.rangeEnd;

  const canPrevWeek = weekOffset > -1;
  const canNextWeek = weekOffset < 1;

  const ticksColStyle = {
    height: LANE_HEIGHT_PX,
    ['--ph-lane-hour' as string]: `${SCHEDULE_HOUR_HEIGHT_PX}px`,
  } as CSSProperties;

  const ticksInner = (
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
  );

  const handleTabWeek = () => {
    const o = planningWeekOffsetForDate(selectedDate);
    setWeekOffset(o);
    setViewMode('week');
  };

  const handleTabDay = () => {
    setViewMode('day');
    const b = getPlanningWindowBounds();
    setSelectedDate((sd) => clampDateBetween(clampDateIntoWeek(sd, weekDates), b.rangeStart, b.rangeEnd));
  };

  const handlePrevDay = () => {
    if (!canPrevDay) return;
    const b = getPlanningWindowBounds();
    const next = clampDateBetween(addDaysLocal(selectedDate, -1), b.rangeStart, b.rangeEnd);
    setWeekOffset(planningWeekOffsetForDate(next));
    setSelectedDate(next);
  };

  const handleNextDay = () => {
    if (!canNextDay) return;
    const b = getPlanningWindowBounds();
    const next = clampDateBetween(addDaysLocal(selectedDate, 1), b.rangeStart, b.rangeEnd);
    setWeekOffset(planningWeekOffsetForDate(next));
    setSelectedDate(next);
  };

  const handlePrevWeek = () => {
    if (!canPrevWeek) return;
    const prevDates = weekDates;
    const nextOffset = Math.max(-1, weekOffset - 1);
    const mon = startOfWeekMonday(localMidnightFromDate(new Date()));
    mon.setDate(mon.getDate() + nextOffset * 7);
    const nextDates = weekDatesContaining(mon);
    const idx = prevDates.indexOf(selectedDate);
    const pick = idx >= 0 ? nextDates[idx]! : clampDateIntoWeek(selectedDate, nextDates);
    const b = getPlanningWindowBounds();
    setWeekOffset(nextOffset);
    setSelectedDate(clampDateBetween(pick, b.rangeStart, b.rangeEnd));
  };

  const handleNextWeek = () => {
    if (!canNextWeek) return;
    const prevDates = weekDates;
    const nextOffset = Math.min(1, weekOffset + 1);
    const mon = startOfWeekMonday(localMidnightFromDate(new Date()));
    mon.setDate(mon.getDate() + nextOffset * 7);
    const nextDates = weekDatesContaining(mon);
    const idx = prevDates.indexOf(selectedDate);
    const pick = idx >= 0 ? nextDates[idx]! : clampDateIntoWeek(selectedDate, nextDates);
    const b = getPlanningWindowBounds();
    setWeekOffset(nextOffset);
    setSelectedDate(clampDateBetween(pick, b.rangeStart, b.rangeEnd));
  };

  const handleToday = () => {
    const b = getPlanningWindowBounds();
    setWeekOffset(0);
    setSelectedDate(clampDateBetween(localDateString(new Date()), b.rangeStart, b.rangeEnd));
  };

  const timeSpanHint = (
    <>
      Times {formatTime(SCHEDULE_VIEW_START_MINUTE)}–{formatTime(SCHEDULE_VIEW_END_EXCLUSIVE_MINUTE - 1)} (
      {SCHEDULE_VIEW_SPAN_MINUTES / 60}
      h). Snaps to 15 minutes. No overlaps within a day. Planning window: three weeks (last, this, next).
    </>
  );

  const weekNavRow = (
    <div className="ph-lane__week-nav" aria-label="Move between planning weeks">
      <button
        type="button"
        className="ph-lane__nav-btn ph-btn"
        onClick={handlePrevWeek}
        disabled={!canPrevWeek}
        aria-disabled={!canPrevWeek}
      >
        Previous week
      </button>
      <button type="button" className="ph-lane__nav-btn ph-btn" onClick={handleToday}>
        This week
      </button>
      <button
        type="button"
        className="ph-lane__nav-btn ph-btn"
        onClick={handleNextWeek}
        disabled={!canNextWeek}
        aria-disabled={!canNextWeek}
      >
        Next week
      </button>
      <span className="ph-lane__week-nav-label">{weekRangeLabel}</span>
    </div>
  );

  const sectionLabel =
    viewMode === 'week'
      ? `Week schedule: ${weekRangeLabel}`
      : `Day schedule: ${formatDayColumnLabel(selectedDate)}, ${weekRangeLabel}`;

  const panelTitle =
    viewMode === 'week' ? `${weekTitleForOffset(weekOffset)}` : `Day view · ${weekTitleForOffset(weekOffset)}`;

  return (
    <section className="ph-panel ph-lane" aria-label={sectionLabel}>
      <header className="ph-panel__header">
        <div className="ph-lane__header-row">
          <h2 className="ph-panel__title">{panelTitle}</h2>
          <div className="ph-lane__tabs" role="tablist" aria-label="Schedule layout">
            <button
              type="button"
              role="tab"
              className={'ph-lane__tab' + (viewMode === 'week' ? ' ph-lane__tab--active' : '')}
              aria-selected={viewMode === 'week'}
              id="ph-schedule-tab-week"
              aria-controls="ph-schedule-panel"
              onClick={handleTabWeek}
            >
              Week
            </button>
            <button
              type="button"
              role="tab"
              className={'ph-lane__tab' + (viewMode === 'day' ? ' ph-lane__tab--active' : '')}
              aria-selected={viewMode === 'day'}
              id="ph-schedule-tab-day"
              aria-controls="ph-schedule-panel"
              onClick={handleTabDay}
            >
              Day
            </button>
          </div>
        </div>
        {viewMode === 'week' ? weekNavRow : null}
        {viewMode === 'day' ? (
          <div className="ph-lane__day-nav" aria-label="Choose day in the planning window">
            <button
              type="button"
              className="ph-lane__nav-btn ph-btn"
              onClick={handlePrevDay}
              disabled={!canPrevDay}
              aria-disabled={!canPrevDay}
            >
              Previous day
            </button>
            <button type="button" className="ph-lane__nav-btn ph-btn" onClick={handleToday}>
              Today
            </button>
            <button
              type="button"
              className="ph-lane__nav-btn ph-btn"
              onClick={handleNextDay}
              disabled={!canNextDay}
              aria-disabled={!canNextDay}
            >
              Next day
            </button>
            <span className="ph-lane__day-nav-label">{formatDayColumnLabel(selectedDate)}</span>
          </div>
        ) : null}
        <p className="ph-panel__hint">
          {viewMode === 'week' ? (
            <>
              {weekRangeLabel}. Each column is one day (Mon–Sun). {timeSpanHint}
            </>
          ) : (
            <>
              {formatDayColumnLabel(selectedDate)} ({selectedDate}). {timeSpanHint}
            </>
          )}
        </p>
      </header>
      <div
        className="ph-lane__scroll"
        id="ph-schedule-panel"
        role="tabpanel"
        aria-labelledby={viewMode === 'week' ? 'ph-schedule-tab-week' : 'ph-schedule-tab-day'}
      >
        {viewMode === 'week' ? (
          <div className="ph-lane__week">
            <div className="ph-lane__week-header" aria-hidden>
              <div className="ph-lane__week-corner" />
              {weekDates.map((d) => (
                <div key={d} className="ph-lane__day-head">
                  {formatDayColumnLabel(d)}
                </div>
              ))}
            </div>
            <div className="ph-lane__week-body">
              <div className="ph-lane__ticks-col" style={ticksColStyle}>
                {ticksInner}
              </div>
              {weekDates.map((d, i) => (
                <ScheduleDayColumn
                  key={d}
                  scheduledDate={d}
                  blocks={blocksByDate.get(d) ?? []}
                  tasksById={tasksById}
                  dropPreviewDate={dropPreviewDate}
                  dropPreviewStart={dropPreviewStart}
                  previewTaskId={previewTaskId}
                  isLastDayInRow={i === weekDates.length - 1}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="ph-lane__week ph-lane__week--day">
            <div className="ph-lane__week-header ph-lane__week-header--day" aria-hidden>
              <div className="ph-lane__week-corner" />
              <div className="ph-lane__day-head ph-lane__day-head--single">{formatDayColumnLabel(selectedDate)}</div>
            </div>
            <div className="ph-lane__week-body ph-lane__week-body--day">
              <div className="ph-lane__ticks-col" style={ticksColStyle}>
                {ticksInner}
              </div>
              <ScheduleDayColumn
                scheduledDate={selectedDate}
                blocks={dayColumnBlocks}
                tasksById={tasksById}
                dropPreviewDate={dropPreviewDate}
                dropPreviewStart={dropPreviewStart}
                previewTaskId={previewTaskId}
                isLastDayInRow
              />
            </div>
          </div>
        )}
      </div>
      <footer className="ph-lane__footer">
        <span className="ph-muted">
          Tip: {formatTime(9 * 60)} → drag near the top of {viewMode === 'week' ? 'a day column' : 'the lane'}.
        </span>
      </footer>
    </section>
  );
}
