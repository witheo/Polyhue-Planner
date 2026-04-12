import type { Task } from '../domain/types';

/** Read-only subtask lines for ticket face + drag overlay (hidden on short cards via container CSS). */
export function TaskTicketSubtasks({ task }: { task: Task }) {
  if (!task.subtasks?.length) return null;
  return (
    <div className="ph-card__subtasks-wrap" aria-hidden="true">
      <ul className="ph-card__subtasks">
        {task.subtasks.map((s, i) => (
          <li key={`${i}-${s.label}`} className="ph-card__subtasks__row">
            <span className="ph-card__subtasks__label">{s.label}</span>
            <span className="ph-card__subtasks__mins">{s.durationMinutes}m</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
