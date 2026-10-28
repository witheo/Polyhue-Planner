import { useRef } from 'react';

import { BACKUP_FILENAME, parseBackup, serializeBackup } from '../domain/backup';
import { usePlannerStore } from '../state/store';

const CONFIRM_REPLACE = 'Replace your current plan with the imported backup? This cannot be undone.';

export function BackupControls() {
  const fileInput = useRef<HTMLInputElement>(null);

  const exportPlan = () => {
    const { tasks, blocks } = usePlannerStore.getState();
    const url = URL.createObjectURL(
      new Blob([serializeBackup({ tasks, blocks })], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = BACKUP_FILENAME;
    document.body.append(a);
    a.click();
    a.remove();
    // Revoking synchronously can cancel the download in Chromium; give it a tick to start.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importFile = async (file: File) => {
    const { notify, replaceState } = usePlannerStore.getState();
    const result = parseBackup(await file.text());
    if (!result.ok) {
      notify(`Import failed: ${result.error}`);
      return;
    }
    // Existing data is only replaced after the file parsed and the user confirmed.
    const hasData = usePlannerStore.getState().tasks.length > 0;
    if (hasData && !window.confirm(CONFIRM_REPLACE)) return;
    replaceState(result.state);
  };

  return (
    <div className="ph-backup" role="group" aria-label="Backup">
      <button type="button" className="ph-btn" onClick={exportPlan}>
        Export
      </button>
      <button type="button" className="ph-btn" onClick={() => fileInput.current?.click()}>
        Import
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="Import backup file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so choosing the same file again still fires onChange.
          e.target.value = '';
          if (file) void importFile(file);
        }}
      />
    </div>
  );
}
