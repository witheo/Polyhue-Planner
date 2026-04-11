import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { minutesFromDurationInput, sanitizeDurationDigits } from '../domain/durations';
import { parseTaskDraftsFromProviderPayload, type TaskDraft } from '../domain/taskDraft';
import { usePlannerStore } from '../state/store';

type DraftRow = TaskDraft & { key: string; durationInput: string };

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
  const addTask = usePlannerStore((s) => s.addTask);
  const titleId = useId();
  const hintId = useId();

  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);

  const reset = useCallback(() => {
    setRaw('');
    setLoading(false);
    setFetchError(null);
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
        setFetchError(parsed.error);
        return;
      }

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
    for (const row of draftRows) {
      const title = row.title.trim();
      if (!title) continue;
      const durationMinutes = minutesFromDurationInput(
        row.durationInput,
        row.durationMinutes,
      );
      addTask({
        title,
        durationMinutes,
        ...(row.description !== undefined && row.description !== ''
          ? { description: row.description }
          : {}),
      });
    }
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
            Paste a rough list. A local proxy splits it into tasks (see{' '}
            <code className="ph-brain-dump-dialog__code">docs/brain-dump-provider-spike.md</code>).
          </p>
        </header>

        {!base ? (
          <p className="ph-brain-dump-dialog__warn" role="status">
            Configure <code className="ph-brain-dump-dialog__code">VITE_BRAIN_DUMP_PROXY_URL</code>{' '}
            and run <code className="ph-brain-dump-dialog__code">npm run brain-dump-proxy</code> for
            a mock server.
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
            placeholder="One line per task (mock proxy), or any text your real proxy understands."
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

        {draftRows.length > 0 ? (
          <div className="ph-brain-dump-dialog__preview">
            <h3 className="ph-brain-dump-dialog__preview-title">Preview</h3>
            <ul className="ph-brain-dump-dialog__rows">
              {draftRows.map((row) => (
                <li key={row.key} className="ph-brain-dump-dialog__row">
                  <label className="ph-field ph-field--grow">
                    <span className="ph-field__label">Title</span>
                    <input
                      className="ph-input"
                      value={row.title}
                      onChange={(e) => updateRow(row.key, { title: e.target.value })}
                    />
                  </label>
                  <label className="ph-field">
                    <span className="ph-field__label">Minutes</span>
                    <input
                      className="ph-input ph-input--inline"
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
                  </label>
                  <label className="ph-field ph-brain-dump-dialog__row-desc">
                    <span className="ph-field__label">Description</span>
                    <input
                      className="ph-input"
                      value={row.description ?? ''}
                      onChange={(e) =>
                        updateRow(row.key, {
                          description: e.target.value.trim() === '' ? undefined : e.target.value,
                        })
                      }
                      placeholder="Optional"
                    />
                  </label>
                  <button
                    type="button"
                    className="ph-btn ph-btn--danger ph-brain-dump-dialog__row-remove"
                    onClick={() => removeRow(row.key)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <footer className="ph-brain-dump-dialog__footer">
          <button type="button" className="ph-btn" onClick={cancel}>
            Cancel
          </button>
          <button
            type="button"
            className="ph-btn ph-btn--primary"
            disabled={draftRows.length === 0}
            onClick={apply}
          >
            Add to backlog
          </button>
        </footer>
      </div>
    </dialog>
  );
}
