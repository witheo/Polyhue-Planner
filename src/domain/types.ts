export type TaskId = string;

export type TaskStatus = 'backlog' | 'scheduled';

export type Task = {
  id: TaskId;
  title: string;
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
