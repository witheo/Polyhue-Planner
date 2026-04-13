import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';

import { draggableTaskId } from '../dndIds';
import { minutesFromDurationInput } from '../domain/durations';
import { backlogTaskIdsInStoreOrder } from '../domain/reorderBacklogTasks';
import type { TaskId } from '../domain/types';
import { usePlannerStore } from '../state/store';
import { BrainDumpImportDialog } from './BrainDumpImportDialog';
import { DurationPicker } from './DurationPicker';
import { TaskCard } from './TaskCard';

export const BACKLOG_DROP_ID = 'backlog';

function focusBacklogRow(taskId: TaskId) {
  requestAnimationFrame(() => {
    document.getElementById(`backlog-row-${taskId}`)?.focus();
  });
}

export function Backlog() {
  const allTasks = usePlannerStore((s) => s.tasks);
  const tasks = useMemo(() => allTasks.filter((t) => t.status === 'backlog'), [allTasks]);
  const addTask = usePlannerStore((s) => s.addTask);
  const removeTask = usePlannerStore((s) => s.removeTask);
  const reorderBacklog = usePlannerStore((s) => s.reorderBacklog);
  const { setNodeRef, isOver } = useDroppable({ id: BACKLOG_DROP_ID });

  const [title, setTitle] = useState('');
  const [durationInput, setDurationInput] = useState('30');
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);

  const sortableItems = useMemo(() => tasks.map((t) => draggableTaskId(t.id)), [tasks]);

  const swapBacklog = (taskId: TaskId, direction: 'up' | 'down') => {
    const ids = backlogTaskIdsInStoreOrder(usePlannerStore.getState().tasks);
    const i = ids.indexOf(taskId);
    if (i < 0) return;
    const j = direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j]!, next[i]!];
    reorderBacklog(next);
    focusBacklogRow(taskId);
  };

  return (
    <section
      ref={setNodeRef}
      className={`ph-panel ph-backlog${isOver ? ' ph-backlog--over' : ''}`}
      aria-label="Backlog"
    >
      <header className="ph-panel__header">
        <h2 className="ph-panel__title">Backlog</h2>
        <p className="ph-panel__hint">
          Click the title for details. Drag cards to reorder the backlog or move them to the
          schedule; use the arrow buttons or keyboard in the list to reorder without dragging. Drop
          on the lane to schedule; drop here to unschedule. Minimum duration 15 minutes.
        </p>
      </header>

      <form
        className="ph-composer"
        onSubmit={(e) => {
          e.preventDefault();
          const minutes = minutesFromDurationInput(durationInput, 30);
          addTask({ title, durationMinutes: minutes });
          setTitle('');
          setDurationInput('30');
        }}
      >
        <label className="ph-field ph-field--grow" htmlFor="task-title">
          <span className="ph-field__label">Title</span>
          <input
            id="task-title"
            className="ph-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Deep work block"
            autoComplete="off"
          />
        </label>
        <DurationPicker id="task-duration" value={durationInput} onChange={setDurationInput} />
        <button type="submit" className="ph-btn ph-btn--primary">
          Add
        </button>
        <button
          type="button"
          className="ph-btn"
          onClick={() => setBrainDumpOpen(true)}
        >
          Import from text…
        </button>
      </form>

      <BrainDumpImportDialog open={brainDumpOpen} onClose={() => setBrainDumpOpen(false)} />

      <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
        <ul className="ph-backlog__list">
          {tasks.map((task, index) => (
            <li
              key={task.id}
              id={`backlog-row-${task.id}`}
              className="ph-backlog__item"
              tabIndex={-1}
            >
              <TaskCard
                task={task}
                variant="backlog"
                onRemove={() => removeTask(task.id)}
                backlogReorder={{
                  canMoveUp: index > 0,
                  canMoveDown: index < tasks.length - 1,
                  onMoveUp: () => swapBacklog(task.id, 'up'),
                  onMoveDown: () => swapBacklog(task.id, 'down'),
                }}
              />
            </li>
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}
