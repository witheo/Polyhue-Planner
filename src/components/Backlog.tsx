import { useDroppable } from '@dnd-kit/core';
import { useMemo, useState } from 'react';

import { minutesFromDurationInput } from '../domain/durations';
import { usePlannerStore } from '../state/store';
import { BrainDumpImportDialog } from './BrainDumpImportDialog';
import { DurationPicker } from './DurationPicker';
import { TaskCard } from './TaskCard';

export const BACKLOG_DROP_ID = 'backlog';

export function Backlog() {
  const allTasks = usePlannerStore((s) => s.tasks);
  const tasks = useMemo(() => allTasks.filter((t) => t.status === 'backlog'), [allTasks]);
  const addTask = usePlannerStore((s) => s.addTask);
  const removeTask = usePlannerStore((s) => s.removeTask);
  const { setNodeRef, isOver } = useDroppable({ id: BACKLOG_DROP_ID });

  const [title, setTitle] = useState('');
  const [durationInput, setDurationInput] = useState('30');
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);

  return (
    <section
      ref={setNodeRef}
      className={`ph-panel ph-backlog${isOver ? ' ph-backlog--over' : ''}`}
      aria-label="Backlog"
    >
      <header className="ph-panel__header">
        <h2 className="ph-panel__title">Backlog</h2>
        <p className="ph-panel__hint">
          Click the title text for details. Drag from anywhere on the card (except the title) to
          move. Drop on the lane to schedule; drop here to unschedule. Minimum duration 15 minutes.
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

      <ul className="ph-backlog__list">
        {tasks.map((task) => (
          <li key={task.id} className="ph-backlog__item">
            <TaskCard task={task} variant="backlog" onRemove={() => removeTask(task.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
