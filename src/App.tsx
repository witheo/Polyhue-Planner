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
import { useRef, useState } from 'react';

import { TaskCardDragOverlay } from './components/TaskCardDragOverlay';

import { BACKLOG_DROP_ID, Backlog } from './components/Backlog';
import { SCHEDULE_LANE_DROP_ID, ScheduleLane } from './components/ScheduleLane';
import { parseDraggableTaskId } from './dndIds';
import {
  ScheduleDropPreviewContext,
  type ScheduleDropPreview,
} from './scheduleDropPreviewContext';
import type { TaskId } from './domain/types';
import { usePlannerStore } from './state/store';

const SCHEDULE_SELECTOR = '[data-ph-schedule-lane]';

function clientYForScheduleDrop(event: DragMoveEvent, pointer: { x: number; y: number }): number {
  const tr = event.active.rect.current.translated;
  if (tr) {
    return tr.top + tr.height / 2;
  }
  return pointer.y;
}

export default function App() {
  const pointer = useRef({ x: 0, y: 0 });
  const cleanupMove = useRef<(() => void) | null>(null);
  const [scheduleDropPreview, setScheduleDropPreview] = useState<ScheduleDropPreview>(null);
  const [dragOverlayTaskId, setDragOverlayTaskId] = useState<TaskId | null>(null);

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
        const taskId = parseDraggableTaskId(String(event.active.id));
        setDragOverlayTaskId(taskId);
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
        const y = clientYForScheduleDrop(event, pointer.current);
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
          const tr = event.active.rect.current.translated;
          const y = tr ? tr.top + tr.height / 2 : pointer.current.y;
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
