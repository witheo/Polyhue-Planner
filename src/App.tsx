import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useRef } from 'react';

import { BACKLOG_DROP_ID, Backlog } from './components/Backlog';
import { SCHEDULE_LANE_DROP_ID, ScheduleLane } from './components/ScheduleLane';
import { parseDraggableTaskId } from './dndIds';
import { usePlannerStore } from './state/store';

const SCHEDULE_SELECTOR = '[data-ph-schedule-lane]';

export default function App() {
  const pointer = useRef({ x: 0, y: 0 });
  const cleanupMove = useRef<(() => void) | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  return (
    <DndContext
      collisionDetection={pointerWithin}
      sensors={sensors}
      onDragStart={() => {
        const onMove = (e: PointerEvent) => {
          pointer.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('pointermove', onMove);
        cleanupMove.current = () => window.removeEventListener('pointermove', onMove);
      }}
      onDragEnd={(event: DragEndEvent) => {
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
          usePlannerStore.getState().dropOnSchedule(taskId, pointer.current.y, rect);
        }
      }}
    >
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
    </DndContext>
  );
}
