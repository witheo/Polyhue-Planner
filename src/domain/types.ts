export type TaskId = string;

export type TaskStatus = 'backlog' | 'scheduled';

/** High-level bucket for ticket color (brain dump + detail picker). */
export type TaskCategory =
  | 'work'
  | 'personal'
  | 'health'
  | 'errands'
  | 'finance'
  | 'learning'
  | 'other';

/** Ordered sub-step from brain-dump / AI import; each has its own time estimate. */
export type TaskSubtask = {
  label: string;
  durationMinutes: number;
};

export type Task = {
  id: TaskId;
  title: string;
  /**
   * Plain text for now; stored as-is (leading/trailing space preserved) for future markdown.
   */
  description?: string;
  /** Optional ordered steps with per-step minute estimates (e.g. from brain dump). */
  subtasks?: TaskSubtask[];
  /** Optional category for color mapping; older saved tasks may omit this. */
  category?: TaskCategory;
  durationMinutes: number;
  /** Ticket L-border accent; kept in sync with `badgeAccent` when set via detail badge swatches. */
  color?: string;
  /** Corner badge polygon: triangle (3) through octagon (8). Default 6. */
  badgeSides?: number;
  /** Badge ring / polygon fill; defaults to `color`. Updated together with `color` in the store. */
  badgeAccent?: string;
  status: TaskStatus;
  createdAt: string;
};

export type ScheduledBlock = {
  taskId: TaskId;
  /** Start of the block within the day, minutes from midnight (0..1440). */
  startMinuteOfDay: number;
};

export type PersistedStateV1 = {
  tasks: Task[];
  blocks: ScheduledBlock[];
};
