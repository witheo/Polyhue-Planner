import { useEffect, useState } from 'react';

import {
  MIN_TASK_DURATION_MINUTES,
  minutesFromDurationInput,
  minutesFromSubtaskDurationInput,
  sanitizeDurationDigits,
} from '../domain/durations';
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
  const updateTaskSubtasks = usePlannerStore((s) => s.updateTaskSubtasks);
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
  const [subtaskLabelDrafts, setSubtaskLabelDrafts] = useState<string[]>([]);
  const [subtaskDurationDrafts, setSubtaskDurationDrafts] = useState<string[]>([]);

  const subtasksSig = task ? JSON.stringify(task.subtasks ?? []) : '';

  useEffect(() => {
    if (!task) return;
    setTitleDraft(task.title);
    setDescriptionDraft(task.description ?? '');
    setDurationDraft(String(task.durationMinutes));
    // Narrow deps so unrelated Zustand task reference churn does not reset drafts mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync drafts when persisted task fields change
  }, [task?.id, task?.durationMinutes, task?.title, task?.description, task?.subtasks, task?.category]);

  useEffect(() => {
    if (!task?.subtasks?.length) {
      setSubtaskLabelDrafts([]);
      setSubtaskDurationDrafts([]);
      return;
    }
    setSubtaskLabelDrafts(task.subtasks.map((s) => s.label));
    setSubtaskDurationDrafts(task.subtasks.map((s) => String(s.durationMinutes)));
  }, [task?.id, subtasksSig]);

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

  const focusDetailSubtaskRow = (taskId: string, index: number) => {
    requestAnimationFrame(() => {
      document.getElementById(`ph-detail-subtask-${taskId}-${index}`)?.focus();
    });
  };

  const focusDetailSubtaskTitleInput = (taskId: string, index: number) => {
    requestAnimationFrame(() => {
      const el = document.getElementById(
        `ph-detail-subtask-title-${taskId}-${index}`,
      ) as HTMLInputElement | null;
      if (!el) return;
      el.focus();
      el.select();
    });
  };

  const moveSubtask = (index: number, direction: 'up' | 'down') => {
    const list = task.subtasks;
    if (!list?.length) return;
    const j = direction === 'up' ? index - 1 : index + 1;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[index], next[j]] = [next[j]!, next[index]!];
    updateTaskSubtasks(task.id, next);
    focusDetailSubtaskRow(task.id, j);
  };

  const addSubtask = () => {
    const current = task.subtasks ?? [];
    const next = [
      ...current,
      { label: 'New step', durationMinutes: MIN_TASK_DURATION_MINUTES },
    ];
    updateTaskSubtasks(task.id, next);
    focusDetailSubtaskTitleInput(task.id, next.length - 1);
  };

  const removeSubtask = (index: number) => {
    const list = task.subtasks;
    if (!list?.length) return;
    const next = list.filter((_, i) => i !== index);
    updateTaskSubtasks(task.id, next);
    if (next.length > 0) {
      const focusIdx = Math.min(index, next.length - 1);
      focusDetailSubtaskRow(task.id, focusIdx);
    }
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

          <section className="ph-detail-subtasks" aria-labelledby="ph-detail-subtasks-heading">
            <h3 className="ph-detail-subtasks__title" id="ph-detail-subtasks-heading">
              Subtasks
            </h3>
            {task.subtasks && task.subtasks.length > 0 ? (
              <>
                <p id="ph-detail-subtasks-list-desc" className="ph-sr-only">
                  Steps are ordered. Edit titles and minutes; move steps up or down to reorder, or
                  remove a step.
                </p>
                <ol
                  className="ph-detail-subtasks__list"
                  aria-describedby="ph-detail-subtasks-list-desc"
                >
                  {task.subtasks.map((s, i) => {
                    const total = task.subtasks!.length;
                    const labelVal = subtaskLabelDrafts[i] ?? s.label;
                    const durVal = subtaskDurationDrafts[i] ?? String(s.durationMinutes);
                    return (
                      <li
                        key={`${task.id}-sub-slot-${i}`}
                        id={`ph-detail-subtask-${task.id}-${i}`}
                        tabIndex={-1}
                        className="ph-detail-subtasks__item"
                        aria-setsize={total}
                        aria-posinset={i + 1}
                      >
                        <div className="ph-detail-subtasks__fields">
                          <label className="ph-detail-subtasks__field ph-detail-subtasks__field--grow">
                            <span className="ph-field__label">
                              Step {i + 1} title
                            </span>
                            <input
                              id={`ph-detail-subtask-title-${task.id}-${i}`}
                              type="text"
                              className="ph-input ph-detail-subtasks__title-input"
                              value={labelVal}
                              aria-label={`Subtask ${i + 1} of ${total}, title`}
                              onChange={(e) => {
                                const v = e.target.value;
                                setSubtaskLabelDrafts((prev) => {
                                  const copy = [...prev];
                                  copy[i] = v;
                                  return copy;
                                });
                              }}
                              onBlur={() => {
                                const trimmed = labelVal.trim();
                                if (!trimmed) {
                                  setSubtaskLabelDrafts((prev) => {
                                    const copy = [...prev];
                                    copy[i] = s.label;
                                    return copy;
                                  });
                                  return;
                                }
                                if (trimmed === s.label) return;
                                const next = [...task.subtasks!];
                                next[i] = { ...next[i]!, label: trimmed };
                                updateTaskSubtasks(task.id, next);
                              }}
                            />
                          </label>
                          <label className="ph-detail-subtasks__field ph-detail-subtasks__field--mins">
                            <span className="ph-field__label">Minutes</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              className="ph-input ph-detail-subtasks__mins-input"
                              value={durVal}
                              aria-label={`Subtask ${i + 1} of ${total}, minutes`}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => {
                                const raw = sanitizeDurationDigits(e.target.value);
                                setSubtaskDurationDrafts((prev) => {
                                  const copy = [...prev];
                                  copy[i] = raw;
                                  return copy;
                                });
                              }}
                              onBlur={() => {
                                const m = minutesFromSubtaskDurationInput(durVal, s.durationMinutes);
                                const shown = String(m);
                                setSubtaskDurationDrafts((prev) => {
                                  const copy = [...prev];
                                  copy[i] = shown;
                                  return copy;
                                });
                                if (m !== s.durationMinutes) {
                                  const next = [...task.subtasks!];
                                  next[i] = { ...next[i]!, durationMinutes: m };
                                  updateTaskSubtasks(task.id, next);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <span
                          className="ph-detail-subtasks__row-controls"
                          role="group"
                          aria-label={`Step ${i + 1} of ${total} controls`}
                        >
                          <span
                            className="ph-detail-subtasks__reorder"
                            role="group"
                            aria-label={`Reorder step ${i + 1} of ${total}`}
                          >
                            <button
                              type="button"
                              className="ph-icon-btn ph-detail-subtasks__reorder-btn"
                              aria-label={`Move step ${i + 1} up`}
                              disabled={i === 0}
                              onClick={() => moveSubtask(i, 'up')}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="ph-icon-btn ph-detail-subtasks__reorder-btn"
                              aria-label={`Move step ${i + 1} down`}
                              disabled={i === total - 1}
                              onClick={() => moveSubtask(i, 'down')}
                            >
                              ↓
                            </button>
                          </span>
                          <button
                            type="button"
                            className="ph-icon-btn ph-detail-subtasks__remove-btn"
                            aria-label={`Remove step ${i + 1}`}
                            title="Remove step"
                            onClick={() => removeSubtask(i)}
                          >
                            ×
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <p className="ph-detail-subtasks__empty">No steps yet.</p>
            )}
            <button
              type="button"
              className="ph-btn ph-detail-subtasks__add"
              onClick={addSubtask}
            >
              + Add subtask
            </button>
          </section>

          <DurationPicker
            id="ph-detail-duration"
            value={durationDraft}
            onChange={onDurationChange}
            disabled={Boolean(task.subtasks?.length)}
            fieldLabel={
              task.subtasks?.length
                ? `Total minutes (sum of ${task.subtasks.length} steps, min ${MIN_TASK_DURATION_MINUTES})`
                : undefined
            }
          />

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
                <dt>Scheduled</dt>
                <dd>
                  {block.scheduledDate} · {formatTime(block.startMinuteOfDay)}
                </dd>
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
