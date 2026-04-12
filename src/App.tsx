import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { getEventCoordinates } from '@dnd-kit/utilities';
import { useRef, useState } from 'react';

import { BACKLOG_DROP_ID, Backlog } from './components/Backlog';
import { SCHEDULE_LANE_DROP_ID, ScheduleLane } from './components/ScheduleLane';
import { TaskCardDragOverlay } from './components/TaskCardDragOverlay';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { parseDraggableTaskId } from './dndIds';
import {
  ScheduleDropPreviewContext,
  type ScheduleDropPreview,
} from './scheduleDropPreviewContext';
import type { TaskId } from './domain/types';
import { usePlannerStore } from './state/store';

const SCHEDULE_SELECTOR = '[data-ph-schedule-lane]';

export default function App() {
  const pointer = useRef({ x: 0, y: 0 });
  const cleanupMove = useRef<(() => void) | null>(null);
  /** Pointer Y minus task-card top at pointer-down; keeps lane math aligned with DragOverlay (avoids stale `active.rect.translated`). */
  const scheduleGrabOffsetY = useRef<number | null>(null);
  const [scheduleDropPreview, setScheduleDropPreview] = useState<ScheduleDropPreview>(null);
  const [dragOverlayTaskId, setDragOverlayTaskId] = useState<TaskId | null>(null);

  const clientYForScheduleDrop = (event: DragMoveEvent | DragEndEvent, pointerY: number): number => {
    if (scheduleGrabOffsetY.current === null) {
      const initial = event.active.rect.current.initial;
      const ac = getEventCoordinates(event.activatorEvent);
      if (initial && ac) {
        scheduleGrabOffsetY.current = ac.y - initial.top;
      }
    }
    if (scheduleGrabOffsetY.current !== null) {
      return pointerY - scheduleGrabOffsetY.current;
    }
    const tr = event.active.rect.current.translated;
    return tr?.top ?? pointerY;
  };

  const dragOverlayTask = usePlannerStore((s) => {
    if (!dragOverlayTaskId) return null;
    return s.tasks.find((t) => t.id === dragOverlayTaskId) ?? null;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  return (
    <DndContext
      collisionDetection={pointerWithin}
      sensors={sensors}
      onDragStart={(event: DragStartEvent) => {
        setScheduleDropPreview(null);
        scheduleGrabOffsetY.current = null;
        const taskId = parseDraggableTaskId(String(event.active.id));
        setDragOverlayTaskId(taskId);
        const ac = getEventCoordinates(event.activatorEvent);
        if (ac) pointer.current = { x: ac.x, y: ac.y };
        const onMove = (e: PointerEvent) => {
          pointer.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('pointermove', onMove);
        cleanupMove.current = () => window.removeEventListener('pointermove', onMove);
      }}
      onDragMove={(event: DragMoveEvent) => {
        if (event.over?.id !== SCHEDULE_LANE_DROP_ID) {
          setScheduleDropPreview(null);
          return;
        }
        const taskId = parseDraggableTaskId(String(event.active.id));
        if (!taskId) {
          setScheduleDropPreview(null);
          return;
        }
        const el = document.querySelector(SCHEDULE_SELECTOR);
        if (!(el instanceof HTMLElement)) {
          setScheduleDropPreview(null);
          return;
        }
        const rect = el.getBoundingClientRect();
        const y = clientYForScheduleDrop(event, pointer.current.y);
        const start = usePlannerStore.getState().previewScheduleDrop(taskId, y, rect);
        setScheduleDropPreview(
          start !== null ? { taskId, startMinuteOfDay: start } : null,
        );
      }}
      onDragEnd={(event: DragEndEvent) => {
        setScheduleDropPreview(null);
        setDragOverlayTaskId(null);
        cleanupMove.current?.();
        cleanupMove.current = null;

        const taskId = parseDraggableTaskId(String(event.active.id));
        if (!taskId) return;

        const overId = event.over?.id?.toString();

        if (overId === BACKLOG_DROP_ID) {
          usePlannerStore.getState().returnToBacklog(taskId);
          return;
        }

        if (overId === SCHEDULE_LANE_DROP_ID) {
          const el = document.querySelector(SCHEDULE_SELECTOR);
          if (!(el instanceof HTMLElement)) return;
          const rect = el.getBoundingClientRect();
          const y = clientYForScheduleDrop(event, pointer.current.y);
          usePlannerStore.getState().dropOnSchedule(taskId, y, rect);
        }
      }}
    >
      <ScheduleDropPreviewContext.Provider value={scheduleDropPreview}>
        <div className="ph-app">
          <header className="ph-app__header">
            <div>
              <h1 className="ph-app__title">Polyhue Planner</h1>
              <p className="ph-app__tagline">Backlog tickets + a thin one-day lane. Drag, snap, persist.</p>
            </div>
          </header>
          <main className="ph-app__grid">
            <Backlog />
            <ScheduleLane />
          </main>
          <TaskDetailPanel />
        </div>
      </ScheduleDropPreviewContext.Provider>
      <DragOverlay
        style={{ cursor: 'grabbing' }}
        dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }}
      >
        {dragOverlayTask ? <TaskCardDragOverlay task={dragOverlayTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
