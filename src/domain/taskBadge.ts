import type { Task } from './types';

/** Fields needed to resolve badge appearance (full `Task` or a minimal pick). */
export type TaskBadgeFields = Pick<Task, 'badgeSides' | 'badgeAccent' | 'color'>;

export const BADGE_SIDES_MIN = 3;
export const BADGE_SIDES_MAX = 8;

/** Ring colors pickable in task detail (subset + neutrals). */
export const BADGE_SWATCHES = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#95E1D3',
  '#D191FF',
  '#6C63FF',
  '#FFB86C',
  '#E8ECF5',
] as const;

export function clampBadgeSides(n: number): number {
  return Math.min(BADGE_SIDES_MAX, Math.max(BADGE_SIDES_MIN, Math.round(Number(n))));
}

export function badgeSidesForTask(task: TaskBadgeFields): number {
  return clampBadgeSides(task.badgeSides ?? 6);
}

export function badgeRingForTask(task: TaskBadgeFields): string {
  return task.badgeAccent ?? task.color ?? '#6c63ff';
}

function roundSvgCoord(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/** Regular n-gon in SVG coords; first vertex at top (−90°). */
export function regularPolygonPoints(sides: number, cx: number, cy: number, r: number): string {
  const n = clampBadgeSides(sides);
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const x = roundSvgCoord(cx + r * Math.cos(a));
    const y = roundSvgCoord(cy + r * Math.sin(a));
    pts.push(`${x},${y}`);
  }
  return pts.join(' ');
}
