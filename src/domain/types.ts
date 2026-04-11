export type TaskId = string;

export type TaskStatus = 'backlog' | 'scheduled';

export type Task = {
  id: TaskId;
  title: string;
  durationMinutes: number;
  color?: string;
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
