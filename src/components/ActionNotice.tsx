import { useEffect } from 'react';

import { usePlannerStore } from '../state/store';

const NOTICE_VISIBLE_MS = 4000;

/**
 * Polite live region for actions that had no effect (rejected drop or duration change).
 * The region stays mounted so screen readers pick up text changes; it only paints when there is a message.
 */
export function ActionNotice() {
  const notice = usePlannerStore((s) => s.notice);
  const dismissNotice = usePlannerStore((s) => s.dismissNotice);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(dismissNotice, NOTICE_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [notice, dismissNotice]);

  return (
    <div className="ph-notice-region" role="status" aria-live="polite">
      {notice ? (
        <p key={notice.id} className="ph-notice">
          {notice.message}
        </p>
      ) : null}
    </div>
  );
}
