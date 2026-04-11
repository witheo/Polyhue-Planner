import { regularPolygonPoints } from '../domain/taskBadge';

type BadgeFaceProps = {
  sides: number;
  ringColor: string;
  /** Smaller disc for ticket header row; detail panel uses default. */
  compact?: boolean;
};

/** Badge disc + polygon (detail panel preview + ticket row). */
export function TicketBadgeFace({ sides, ringColor, compact }: BadgeFaceProps) {
  const pts = regularPolygonPoints(sides, 12, 12, 8.75);
  return (
    <div
      className={
        'ph-card__accent-badge' + (compact ? ' ph-card__accent-badge--compact' : '')
      }
      style={{ borderColor: ringColor }}
    >
      <svg
        className="ph-card__accent-badge-icon"
        viewBox="0 0 24 24"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <polygon points={pts} fill={ringColor} />
      </svg>
    </div>
  );
}
