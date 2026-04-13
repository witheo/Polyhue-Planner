import { create } from 'zustand';

import {
  getPlanningWindowBounds,
  isLocalIsoDateString,
  localDateString,
} from '../domain/calendarDates';
import { MIN_TASK_DURATION_MINUTES } from '../domain/durations';
import { mergeTasksWithBacklogOrder } from '../domain/reorderBacklogTasks';
import { placementValidForDate, resolveDropStartForDate } from '../domain/schedule';
import { clampBadgeSides } from '../domain/taskBadge';
import { colorForTaskCategory } from '../domain/taskCategories';
import type { ScheduledBlock, Task, TaskCategory, TaskId } from '../domain/types';
import { SCHEDULE_VIEW_SPAN_MINUTES, SCHEDULE_VIEW_START_MINUTE } from '../domain/time';
import { debounce, load, save } from './persistence';

const PALETTE = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#D191FF', '#6C63FF'];

function normalizeLoadedBlocks(raw: unknown): ScheduledBlock[] {
  if (!Array.isArray(raw)) return [];
  const today = localDateString(new Date());
  return raw.map((item): ScheduledBlock => {
    const o = item as Record<string, unknown>;
    const taskId = String(o.taskId ?? '');
    const startMinuteOfDay = Number(o.startMinuteOfDay);
    const sd = o.scheduledDate;
    const scheduledDate =
      typeof sd === 'string' && isLocalIsoDateString(sd) ? sd : today;
    return { taskId, startMinuteOfDay, scheduledDate };
  });
}

/** Drop blocks outside the three-week planning window (prev / current / next calendar week). */
function purgeBlocksOutsidePlanningWindow(blocks: ScheduledBlock[]): ScheduledBlock[] {
  const { rangeStart, rangeEnd } = getPlanningWindowBounds();
  return blocks.filter((b) => b.scheduledDate >= rangeStart && b.scheduledDate <= rangeEnd);
}

function reconcileTasks(tasks: Task[], blocks: ScheduledBlock[]): Task[] {
  const scheduled = new Set(blocks.map((b) => b.taskId));
  return tasks.map((t) => ({
    ...t,
    status: scheduled.has(t.id) ? 'scheduled' : 'backlog',
  }));
}

function taskMap(tasks: Task[]): Map<TaskId, Task> {
  return new Map(tasks.map((t) => [t.id, t]));
}

function computeResolvedScheduleStart(
  taskId: TaskId,
  scheduledDate: string,
  clientY: number,
  columnContentRect: DOMRect,
  tasks: Task[],
  blocks: ScheduledBlock[],
): number | null {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const relativeY = clientY - columnContentRect.top;
  const clampedY = Math.max(0, Math.min(columnContentRect.height, relativeY));
  const rawStart =
    SCHEDULE_VIEW_START_MINUTE +
    (clampedY / columnContentRect.height) * SCHEDULE_VIEW_SPAN_MINUTES;
  const map = taskMap(tasks);
  return resolveDropStartForDate(task, rawStart, blocks, scheduledDate, map, {
    snapStep: 15,
    excludeTaskId: taskId,
  });
}

function clampSubtasks(subtasks: Task['subtasks']): Task['subtasks'] {
  if (!subtasks?.length) return undefined;
  const next = subtasks
    .map((s) => ({
      label: s.label.trim(),
      durationMinutes: Math.max(
        MIN_TASK_DURATION_MINUTES,
        Math.round(s.durationMinutes),
      ),
    }))
    .filter((s) => s.label !== '');
  return next.length > 0 ? next : undefined;
}

function clampTaskDurations(tasks: Task[]): Task[] {
  return tasks.map((t) => ({
    ...t,
    durationMinutes: Math.max(
      MIN_TASK_DURATION_MINUTES,
      Math.round(t.durationMinutes),
    ),
    subtasks: clampSubtasks(t.subtasks),
  }));
}

function pickColorForNewTask(
  input: { color?: string; category?: TaskCategory },
  rotateIndex: number,
): string {
  if (input.color) return input.color;
  const fromCat = colorForTaskCategory(input.category);
  if (fromCat) return fromCat;
  return PALETTE[rotateIndex % PALETTE.length];
}

const initial = load();
const initialBlocks = purgeBlocksOutsidePlanningWindow(normalizeLoadedBlocks(initial?.blocks));
const initialTasks = initial?.tasks?.length
  ? clampTaskDurations(reconcileTasks(initial.tasks as Task[], initialBlocks))
  : [];

type Store = {
  tasks: Task[];
  blocks: ScheduledBlock[];
  detailTaskId: TaskId | null;
  openTaskDetail: (id: TaskId) => void;
  closeTaskDetail: () => void;
  addTask: (input: {
    title: string;
    durationMinutes: number;
    color?: string;
    description?: string;
    subtasks?: Task['subtasks'];
    category?: TaskCategory;
  }) => void;
  /** Append several backlog tasks in one store update (palette indices follow existing task count). */
  addTasks: (
    inputs: Array<{
      title: string;
      durationMinutes: number;
      color?: string;
      description?: string;
      subtasks?: Task['subtasks'];
      category?: TaskCategory;
    }>,
  ) => void;
  updateTaskTitle: (id: TaskId, title: string) => void;
  updateTaskDescription: (id: TaskId, description: string) => void;
  updateTaskDuration: (id: TaskId, durationMinutes: number) => void;
  updateTaskCategory: (id: TaskId, category: TaskCategory | null) => void;
  updateTaskBadge: (id: TaskId, patch: { sides?: number; accent?: string }) => void;
  removeTask: (id: TaskId) => void;
  /** Drop onto a day column: local `scheduledDate`, anchor Y, column content rect. */
  dropOnSchedule: (
    taskId: TaskId,
    scheduledDate: string,
    clientY: number,
    columnContentRect: DOMRect,
  ) => void;
  /** Resolved snapped start for UI preview; same rules as drop without mutating. */
  previewScheduleDrop: (
    taskId: TaskId,
    scheduledDate: string,
    clientY: number,
    columnContentRect: DOMRect,
  ) => number | null;
  returnToBacklog: (taskId: TaskId) => void;
  /** Reorders backlog tasks in store order; no-op if ids are not exactly the current backlog set. */
  reorderBacklog: (orderedBacklogIds: TaskId[]) => void;
};

export const usePlannerStore = create<Store>((set, get) => ({
  tasks: initialTasks,
  blocks: initialBlocks,
  detailTaskId: null,

  openTaskDetail: (id) => {
    if (!get().tasks.some((t) => t.id === id)) return;
    set({ detailTaskId: id });
  },

  closeTaskDetail: () => set({ detailTaskId: null }),

  addTask: ({ title, durationMinutes, color, description, subtasks, category }) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const rotate = get().tasks.length;
    const nextColor = pickColorForNewTask({ color, category }, rotate);
    const st = clampSubtasks(subtasks);
    const task: Task = {
      id,
      title: trimmed,
      ...(description !== undefined && description !== ''
        ? { description }
        : {}),
      ...(st !== undefined ? { subtasks: st } : {}),
      ...(category !== undefined ? { category } : {}),
      durationMinutes: Math.max(MIN_TASK_DURATION_MINUTES, Math.round(durationMinutes)),
      color: nextColor,
      badgeSides: 6,
      badgeAccent: nextColor,
      status: 'backlog',
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ tasks: [...s.tasks, task] }));
  },

  addTasks: (inputs) => {
    if (inputs.length === 0) return;
    const startLen = get().tasks.length;
    const newTasks: Task[] = [];
    let offset = 0;
    for (const input of inputs) {
      const trimmed = input.title.trim();
      if (!trimmed) continue;
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `task-${Date.now()}-${offset}-${Math.random().toString(16).slice(2)}`;
      offset += 1;
      const nextColor = pickColorForNewTask(
        { color: input.color, category: input.category },
        startLen + newTasks.length,
      );
      const st = clampSubtasks(input.subtasks);
      const task: Task = {
        id,
        title: trimmed,
        ...(input.description !== undefined && input.description !== ''
          ? { description: input.description }
          : {}),
        ...(st !== undefined ? { subtasks: st } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        durationMinutes: Math.max(MIN_TASK_DURATION_MINUTES, Math.round(input.durationMinutes)),
        color: nextColor,
        badgeSides: 6,
        badgeAccent: nextColor,
        status: 'backlog',
        createdAt: new Date().toISOString(),
      };
      newTasks.push(task);
    }
    if (newTasks.length === 0) return;
    set((s) => ({ tasks: [...s.tasks, ...newTasks] }));
  },

  updateTaskTitle: (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, title: trimmed } : t)),
    }));
  },

  updateTaskDescription: (id, description) => {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        if (description === '')
          return { ...t, description: undefined };
        return { ...t, description };
      }),
    }));
  },

  updateTaskCategory: (id, category) => {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        if (category === null) {
          const idx = s.tasks.findIndex((x) => x.id === id);
          const nextColor = PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
          const next: Task = { ...t };
          delete next.category;
          return { ...next, color: nextColor, badgeAccent: nextColor };
        }
        const col = colorForTaskCategory(category) ?? PALETTE[0];
        return { ...t, category, color: col, badgeAccent: col };
      }),
    }));
  },

  updateTaskBadge: (id, patch) => {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          ...(patch.sides !== undefined ? { badgeSides: clampBadgeSides(patch.sides) } : {}),
          ...(patch.accent !== undefined
            ? { badgeAccent: patch.accent, color: patch.accent }
            : {}),
        };
      }),
    }));
  },

  updateTaskDuration: (id, durationMinutes) => {
    const next = Math.max(MIN_TASK_DURATION_MINUTES, Math.round(durationMinutes));
    set((s) => {
      const task = s.tasks.find((t) => t.id === id);
      if (!task || task.durationMinutes === next) return s;

      const updatedTask: Task = { ...task, durationMinutes: next };
      const blockIdx = s.blocks.findIndex((b) => b.taskId === id);
      if (blockIdx === -1) {
        return { tasks: s.tasks.map((t) => (t.id === id ? updatedTask : t)) };
      }

      const tasks = s.tasks.map((t) => (t.id === id ? updatedTask : t));
      const map = taskMap(tasks);
      const blocks = [...s.blocks];
      const block = blocks[blockIdx]!;
      const date = block.scheduledDate;

      if (placementValidForDate(updatedTask, block.startMinuteOfDay, blocks, date, map, id)) {
        return { tasks, blocks };
      }

      const newStart = resolveDropStartForDate(
        updatedTask,
        block.startMinuteOfDay,
        blocks,
        date,
        map,
        {
          snapStep: 15,
          excludeTaskId: id,
        },
      );
      if (newStart === null) return s;

      blocks[blockIdx] = { taskId: id, startMinuteOfDay: newStart, scheduledDate: date };
      return { tasks, blocks };
    });
  },

  removeTask: (id) => {
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      blocks: s.blocks.filter((b) => b.taskId !== id),
      detailTaskId: s.detailTaskId === id ? null : s.detailTaskId,
    }));
  },

  dropOnSchedule: (taskId, scheduledDate, clientY, columnContentRect) => {
    const { rangeStart, rangeEnd } = getPlanningWindowBounds();
    if (scheduledDate < rangeStart || scheduledDate > rangeEnd) return;

    const { tasks, blocks } = get();
    const start = computeResolvedScheduleStart(
      taskId,
      scheduledDate,
      clientY,
      columnContentRect,
      tasks,
      blocks,
    );
    if (start === null) return;

    const nextBlocks = blocks.filter((b) => b.taskId !== taskId);
    nextBlocks.push({ taskId, startMinuteOfDay: start, scheduledDate });

    set({
      blocks: nextBlocks,
      tasks: reconcileTasks(tasks, nextBlocks),
    });
  },

  previewScheduleDrop: (taskId, scheduledDate, clientY, columnContentRect) => {
    const { rangeStart, rangeEnd } = getPlanningWindowBounds();
    if (scheduledDate < rangeStart || scheduledDate > rangeEnd) return null;

    const { tasks, blocks } = get();
    return computeResolvedScheduleStart(
      taskId,
      scheduledDate,
      clientY,
      columnContentRect,
      tasks,
      blocks,
    );
  },

  returnToBacklog: (taskId) => {
    set((s) => {
      const nextBlocks = s.blocks.filter((b) => b.taskId !== taskId);
      return {
        blocks: nextBlocks,
        tasks: reconcileTasks(s.tasks, nextBlocks),
      };
    });
  },

  reorderBacklog: (orderedBacklogIds) => {
    set((s) => {
      const merged = mergeTasksWithBacklogOrder(s.tasks, orderedBacklogIds);
      if (merged === null) return s;
      return { tasks: merged };
    });
  },
}));

const persistDebounced = debounce((tasks: Task[], blocks: ScheduledBlock[]) => {
  save({ tasks, blocks });
}, 250);

usePlannerStore.subscribe((state) => {
  persistDebounced(state.tasks, state.blocks);
});
