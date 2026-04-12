import { useEffect, useState } from 'react';

import { minutesFromDurationInput } from '../domain/durations';
import { formatTime } from '../domain/time';
import {
  BADGE_SWATCHES,
  badgeRingForTask,
  badgeSidesForTask,
  regularPolygonPoints,
} from '../domain/taskBadge';
import { TASK_CATEGORY_LABEL, TASK_CATEGORY_OPTIONS } from '../domain/taskCategories';
import type { TaskCategory } from '../domain/types';
import { usePlannerStore } from '../state/store';
import { DurationPicker } from './DurationPicker';
import { TicketBadgeFace } from './TaskCardAccentGrid';

export function TaskDetailPanel() {
  const detailTaskId = usePlannerStore((s) => s.detailTaskId);
  const closeTaskDetail = usePlannerStore((s) => s.closeTaskDetail);
  const updateTaskTitle = usePlannerStore((s) => s.updateTaskTitle);
  const updateTaskDescription = usePlannerStore((s) => s.updateTaskDescription);
  const updateTaskDuration = usePlannerStore((s) => s.updateTaskDuration);
  const updateTaskCategory = usePlannerStore((s) => s.updateTaskCategory);
  const updateTaskBadge = usePlannerStore((s) => s.updateTaskBadge);
  const removeTask = usePlannerStore((s) => s.removeTask);

  const task = usePlannerStore((s) =>
    s.detailTaskId ? s.tasks.find((t) => t.id === s.detailTaskId) ?? null : null,
  );
  const block = usePlannerStore((s) =>
    s.detailTaskId ? s.blocks.find((b) => b.taskId === s.detailTaskId) ?? null : null,
  );

  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [durationDraft, setDurationDraft] = useState('30');

  useEffect(() => {
    if (!task) return;
    setTitleDraft(task.title);
    setDescriptionDraft(task.description ?? '');
    setDurationDraft(String(task.durationMinutes));
    // Narrow deps so unrelated Zustand task reference churn does not reset drafts mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync drafts when persisted task fields change
  }, [task?.id, task?.durationMinutes, task?.title, task?.description, task?.subtasks, task?.category]);

  const open = Boolean(detailTaskId && task);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTaskDetail();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeTaskDetail]);

  if (!open || !task) return null;

  const onDurationChange = (next: string) => {
    setDurationDraft(next);
    updateTaskDuration(
      task.id,
      minutesFromDurationInput(next, task.durationMinutes),
    );
  };

  const badgeSides = badgeSidesForTask(task);
  const badgeRing = badgeRingForTask(task);

  const onSaveTitle = () => {
    const t = titleDraft.trim();
    if (t) updateTaskTitle(task.id, t);
    else setTitleDraft(task.title);
  };

  const onSaveDescription = () => {
    const next = descriptionDraft;
    const prev = task.description ?? '';
    if (next === prev) return;
    updateTaskDescription(task.id, next);
  };

  return (
    <>
      <button
        type="button"
        className="ph-detail-backdrop"
        aria-label="Close task details"
        onClick={() => closeTaskDetail()}
      />
      <aside
        className="ph-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ph-detail-panel-heading"
      >
        <header className="ph-detail-panel__header">
          <h2 className="ph-detail-panel__heading" id="ph-detail-panel-heading">
            Task
          </h2>
          <button
            type="button"
            className="ph-icon-btn ph-detail-panel__close"
            aria-label="Close"
            onClick={() => closeTaskDetail()}
          >
            ×
          </button>
        </header>

        <div className="ph-detail-panel__body">
          <label className="ph-field ph-field--grow" htmlFor="ph-detail-title-input">
            <span className="ph-field__label">Title</span>
            <input
              id="ph-detail-title-input"
              type="text"
              className="ph-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={onSaveTitle}
            />
          </label>

          <label className="ph-field ph-field--grow" htmlFor="ph-detail-description-input">
            <span className="ph-field__label">Description</span>
            <textarea
              id="ph-detail-description-input"
              className="ph-input ph-detail-description"
              rows={1}
              placeholder="Notes (markdown later)"
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              onBlur={onSaveDescription}
            />
          </label>

          <label className="ph-field ph-field--grow" htmlFor="ph-detail-category">
            <span className="ph-field__label">Category</span>
            <select
              id="ph-detail-category"
              className="ph-input"
              value={task.category ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                updateTaskCategory(task.id, v === '' ? null : (v as TaskCategory));
              }}
            >
              <option value="">Automatic (palette by order)</option>
              {TASK_CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {TASK_CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </label>

          {task.subtasks && task.subtasks.length > 0 ? (
            <section className="ph-detail-subtasks" aria-labelledby="ph-detail-subtasks-heading">
              <h3 className="ph-detail-subtasks__title" id="ph-detail-subtasks-heading">
                Subtasks
              </h3>
              <ol className="ph-detail-subtasks__list">
                {task.subtasks.map((s, i) => (
                  <li key={`${i}-${s.label}`} className="ph-detail-subtasks__item">
                    <span className="ph-detail-subtasks__label">{s.label}</span>
                    <span className="ph-detail-subtasks__mins">{s.durationMinutes} min</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <DurationPicker id="ph-detail-duration" value={durationDraft} onChange={onDurationChange} />

          <section className="ph-detail-badge-section" aria-labelledby="ph-detail-badge-heading">
            <h3 className="ph-detail-badge-section__title" id="ph-detail-badge-heading">
              Corner badge
            </h3>
            <div className="ph-detail-badge-preview" aria-hidden>
              <TicketBadgeFace sides={badgeSides} ringColor={badgeRing} />
            </div>
            <span className="ph-field__label">Polygon (3–8 sides)</span>
            <div className="ph-detail-badge-shapes" role="group" aria-label="Badge polygon sides">
              {[3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={
                    'ph-detail-badge-shape' +
                    (badgeSides === n ? ' ph-detail-badge-shape--selected' : '')
                  }
                  aria-pressed={badgeSides === n}
                  onClick={() => updateTaskBadge(task.id, { sides: n })}
                >
                  <svg viewBox="0 0 24 24" className="ph-detail-badge-shape__svg" aria-hidden>
                    <polygon points={regularPolygonPoints(n, 12, 12, 9)} fill="currentColor" />
                  </svg>
                  <span className="ph-detail-badge-shape__label">{n}</span>
                </button>
              ))}
            </div>
            <span className="ph-field__label">Badge color</span>
            <div className="ph-detail-badge-colors" role="group" aria-label="Badge colors">
              {BADGE_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={
                    'ph-detail-badge-swatch' +
                    (badgeRing.toLowerCase() === c.toLowerCase()
                      ? ' ph-detail-badge-swatch--selected'
                      : '')
                  }
                  style={{ background: c }}
                  aria-label={`Use badge color ${c}`}
                  aria-pressed={badgeRing.toLowerCase() === c.toLowerCase()}
                  onClick={() => updateTaskBadge(task.id, { accent: c })}
                />
              ))}
            </div>
          </section>

          <dl className="ph-detail-meta">
            <div>
              <dt>Created</dt>
              <dd>{new Date(task.createdAt).toLocaleString()}</dd>
            </div>
            {block ? (
              <div>
                <dt>Scheduled start</dt>
                <dd>{formatTime(block.startMinuteOfDay)}</dd>
              </div>
            ) : (
              <div>
                <dt>Status</dt>
                <dd>Backlog</dd>
              </div>
            )}
          </dl>
        </div>

        <footer className="ph-detail-panel__footer">
          <button
            type="button"
            className="ph-btn ph-btn--danger"
            onClick={() => {
              removeTask(task.id);
              closeTaskDetail();
            }}
          >
            Delete task
          </button>
        </footer>
      </aside>
    </>
  );
}
