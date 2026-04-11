import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';

import { usePlannerStore } from '../state/store';
import { DurationPicker } from './DurationPicker';
import { TaskCard } from './TaskCard';

export const BACKLOG_DROP_ID = 'backlog';

export function Backlog() {
  const tasks = usePlannerStore((s) => s.tasks.filter((t) => t.status === 'backlog'));
  const addTask = usePlannerStore((s) => s.addTask);
  const removeTask = usePlannerStore((s) => s.removeTask);

  const { setNodeRef, isOver } = useDroppable({ id: BACKLOG_DROP_ID });

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);

  return (
    <section
      ref={setNodeRef}
      className={`ph-panel ph-backlog${isOver ? ' ph-backlog--over' : ''}`}
      aria-label="Backlog"
    >
      <header className="ph-panel__header">
        <h2 className="ph-panel__title">Backlog</h2>
        <p className="ph-panel__hint">Drag tickets onto today’s lane. Drop here to unschedule.</p>
      </header>

      <form
        className="ph-composer"
        onSubmit={(e) => {
          e.preventDefault();
          addTask({ title, durationMinutes: duration });
          setTitle('');
          setDuration(30);
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
        <DurationPicker id="task-duration" value={duration} onChange={setDuration} />
        <button type="submit" className="ph-btn ph-btn--primary">
          Add
        </button>
      </form>

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
