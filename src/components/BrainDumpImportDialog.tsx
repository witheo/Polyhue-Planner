import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import {
  addTaskInputsFromApplyableDraftRows,
  draftRowsHaveApplyableTitle,
} from '../domain/brainDumpApply';
import { minutesFromDurationInput, sanitizeDurationDigits } from '../domain/durations';
import { TASK_CATEGORY_LABEL, TASK_CATEGORY_OPTIONS } from '../domain/taskCategories';
import type { TaskCategory } from '../domain/types';
import {
  formatTaskDraftDroppedSummary,
  parseTaskDraftsFromProviderPayload,
  taskDraftParseErrorMessage,
  type TaskDraft,
} from '../domain/taskDraft';
import { usePlannerStore } from '../state/store';

type DraftRow = TaskDraft & { key: string; durationInput: string };

function formatDraftSubtasksPreview(row: TaskDraft): string {
  if (!row.subtasks?.length) return '—';
  return row.subtasks.map((s) => `${s.label} (${s.durationMinutes}m)`).join('; ');
}

function proxyBaseUrl(): string | null {
  const v = import.meta.env.VITE_BRAIN_DUMP_PROXY_URL;
  return typeof v === 'string' && v.trim() !== '' ? v.trim().replace(/\/$/, '') : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BrainDumpImportDialog({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const addTasks = usePlannerStore((s) => s.addTasks);
  const titleId = useId();
  const hintId = useId();
  const thTitleId = useId();
  const thMinutesId = useId();
  const thCategoryId = useId();
  const thDescId = useId();
  const thSubtasksId = useId();
  const thActionsId = useId();

  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [skippedRowsMessage, setSkippedRowsMessage] = useState<string | null>(null);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);

  const hasApplyableRow = useMemo(() => draftRowsHaveApplyableTitle(draftRows), [draftRows]);

  const reset = useCallback(() => {
    setRaw('');
    setLoading(false);
    setFetchError(null);
    setSkippedRowsMessage(null);
    setDraftRows([]);
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      reset();
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open, reset]);

  const runProxy = async () => {
    const base = proxyBaseUrl();
    if (!base) {
      setFetchError('Set VITE_BRAIN_DUMP_PROXY_URL in .env.local (see README).');
      return;
    }
    const trimmed = raw.trim();
    if (!trimmed) return;

    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${base}/brain-dump`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: trimmed }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setFetchError('Proxy did not return JSON.');
        return;
      }

      if (!res.ok) {
        const msg =
          isRecord(data) && typeof data.error === 'string'
            ? data.error
            : `Request failed (${res.status})`;
        setFetchError(msg);
        return;
      }

      const parsed = parseTaskDraftsFromProviderPayload(data);
      if (!parsed.ok) {
        setFetchError(taskDraftParseErrorMessage(parsed.error));
        return;
      }

      setSkippedRowsMessage(
        parsed.dropped.length > 0 ? formatTaskDraftDroppedSummary(parsed.dropped) : null,
      );

      setDraftRows(
        parsed.drafts.map((d) => ({
          ...d,
          durationInput: String(d.durationMinutes),
          key:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        })),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Network error';
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (key: string, patch: Partial<DraftRow>) => {
    setDraftRows((rows) =>
      rows.map((r) => (r.key === key ? { ...r, ...patch, key: r.key } : r)),
    );
  };

  const removeRow = (key: string) => {
    setDraftRows((rows) => rows.filter((r) => r.key !== key));
  };

  const apply = () => {
    const inputs = addTaskInputsFromApplyableDraftRows(draftRows);
    if (inputs.length === 0) return;
    addTasks(inputs);
    reset();
    onClose();
  };

  const cancel = () => {
    reset();
    onClose();
  };

  const base = proxyBaseUrl();

  return (
    <dialog
      ref={dialogRef}
      className="ph-brain-dump-dialog"
      aria-labelledby={titleId}
      aria-describedby={hintId}
      aria-busy={loading}
      onCancel={(e) => {
        e.preventDefault();
        cancel();
      }}
    >
      <div className="ph-brain-dump-dialog__inner">
        <header className="ph-brain-dump-dialog__head">
          <h2 id={titleId} className="ph-brain-dump-dialog__title">
            Import from text
          </h2>
          <p id={hintId} className="ph-brain-dump-dialog__hint">
            Paste unstructured notes. The local proxy runs Cursor <code className="ph-brain-dump-dialog__code">agent</code>{' '}
            with a fixed prompt to extract tasks, categories, optional subtasks with time estimates, and durations (see{' '}
            <code className="ph-brain-dump-dialog__code">docs/brain-dump-local-ai-import.md</code>).
          </p>
        </header>

        {!base ? (
          <p className="ph-brain-dump-dialog__warn" role="status">
            Configure <code className="ph-brain-dump-dialog__code">VITE_BRAIN_DUMP_PROXY_URL</code>{' '}
            and run <code className="ph-brain-dump-dialog__code">npm run brain-dump-proxy</code> (uses{' '}
            <code className="ph-brain-dump-dialog__code">agent</code>; set{' '}
            <code className="ph-brain-dump-dialog__code">BRAIN_DUMP_AI=0</code> for a stub without the CLI).
          </p>
        ) : null}

        <label className="ph-field" htmlFor="ph-brain-dump-raw">
          <span className="ph-field__label">Brain dump</span>
          <textarea
            id="ph-brain-dump-raw"
            className="ph-input ph-brain-dump-dialog__textarea"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
            placeholder="Anything goes — errands, meeting notes, project ramble. The proxy turns it into tasks."
            disabled={loading}
          />
        </label>

        <div className="ph-brain-dump-dialog__actions">
          <button
            type="button"
            className="ph-btn ph-btn--primary"
            disabled={loading || !raw.trim() || !base}
            onClick={() => void runProxy()}
          >
            {loading ? 'Running…' : 'Run on server'}
          </button>
        </div>

        {fetchError ? (
          <p className="ph-brain-dump-dialog__error" role="alert">
            {fetchError}
          </p>
        ) : null}

        {skippedRowsMessage ? (
          <p className="ph-brain-dump-dialog__warn" role="status">
            {skippedRowsMessage}
          </p>
        ) : null}

        {draftRows.length > 0 ? (
          <div className="ph-brain-dump-dialog__preview">
            {!hasApplyableRow ? (
              <p className="ph-brain-dump-dialog__preview-status" role="status">
                Add a non-empty title to at least one row to add tasks to the backlog.
              </p>
            ) : null}
            <div className="ph-brain-dump-dialog__preview-scroll">
              <table className="ph-brain-dump-dialog__preview-table">
                <caption className="ph-brain-dump-dialog__table-caption">Preview</caption>
                <thead>
                  <tr>
                    <th id={thTitleId} scope="col">
                      Title
                    </th>
                    <th id={thMinutesId} scope="col">
                      Minutes
                    </th>
                    <th id={thCategoryId} scope="col">
                      Category
                    </th>
                    <th id={thDescId} scope="col">
                      Description
                    </th>
                    <th id={thSubtasksId} scope="col">
                      Subtasks
                    </th>
                    <th id={thActionsId} scope="col">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {draftRows.map((row) => {
                    const removeLabel = `Remove row: ${row.title.trim() || 'untitled'}`;
                    return (
                      <tr key={row.key} className="ph-brain-dump-dialog__preview-tr">
                        <td className="ph-brain-dump-dialog__preview-td">
                          <input
                            className="ph-input ph-brain-dump-dialog__table-input"
                            aria-labelledby={thTitleId}
                            value={row.title}
                            onChange={(e) => updateRow(row.key, { title: e.target.value })}
                          />
                        </td>
                        <td className="ph-brain-dump-dialog__preview-td ph-brain-dump-dialog__preview-td--narrow">
                          <input
                            className="ph-input ph-input--inline ph-brain-dump-dialog__table-input"
                            aria-labelledby={thMinutesId}
                            inputMode="numeric"
                            autoComplete="off"
                            value={row.durationInput}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => {
                              const durationInput = sanitizeDurationDigits(e.target.value);
                              const durationMinutes = minutesFromDurationInput(
                                durationInput,
                                row.durationMinutes,
                              );
                              updateRow(row.key, { durationInput, durationMinutes });
                            }}
                          />
                        </td>
                        <td className="ph-brain-dump-dialog__preview-td ph-brain-dump-dialog__preview-td--category">
                          <select
                            className="ph-input ph-brain-dump-dialog__table-input"
                            aria-labelledby={thCategoryId}
                            value={row.category ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateRow(row.key, {
                                category: v === '' ? undefined : (v as TaskCategory),
                              });
                            }}
                          >
                            <option value="">Auto</option>
                            {TASK_CATEGORY_OPTIONS.map((c) => (
                              <option key={c} value={c}>
                                {TASK_CATEGORY_LABEL[c]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="ph-brain-dump-dialog__preview-td">
                          <input
                            className="ph-input ph-brain-dump-dialog__table-input"
                            aria-labelledby={thDescId}
                            value={row.description ?? ''}
                            onChange={(e) =>
                              updateRow(row.key, {
                                description:
                                  e.target.value.trim() === '' ? undefined : e.target.value,
                              })
                            }
                            placeholder="Optional"
                          />
                        </td>
                        <td className="ph-brain-dump-dialog__preview-td ph-brain-dump-dialog__preview-td--subtasks">
                          <span
                            className="ph-brain-dump-dialog__subtasks-preview"
                            aria-labelledby={thSubtasksId}
                          >
                            {formatDraftSubtasksPreview(row)}
                          </span>
                        </td>
                        <td className="ph-brain-dump-dialog__preview-td ph-brain-dump-dialog__preview-td--actions">
                          <button
                            type="button"
                            className="ph-btn ph-btn--danger ph-brain-dump-dialog__row-remove"
                            aria-label={removeLabel}
                            onClick={() => removeRow(row.key)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <footer className="ph-brain-dump-dialog__footer">
          <button type="button" className="ph-btn" onClick={cancel}>
            Cancel
          </button>
          <button
            type="button"
            className="ph-btn ph-btn--primary"
            disabled={draftRows.length === 0 || !hasApplyableRow}
            onClick={apply}
          >
            Add to backlog
          </button>
        </footer>
      </div>
    </dialog>
  );
}
