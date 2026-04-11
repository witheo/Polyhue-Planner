import { create } from 'zustand';

import { placementValid, resolveDropStart } from '../domain/schedule';
import type { ScheduledBlock, Task, TaskId } from '../domain/types';
import { MINUTES_IN_DAY } from '../domain/time';
import { debounce, load, save } from './persistence';

const PALETTE = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#D191FF', '#6C63FF'];

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

const initial = load();
const initialTasks = initial?.tasks?.length
  ? reconcileTasks(initial.tasks as Task[], (initial.blocks as ScheduledBlock[]) ?? [])
  : [];
const initialBlocks = (initial?.blocks as ScheduledBlock[]) ?? [];

type Store = {
  tasks: Task[];
  blocks: ScheduledBlock[];
  addTask: (input: { title: string; durationMinutes: number; color?: string }) => void;
  updateTaskDuration: (id: TaskId, durationMinutes: number) => void;
  removeTask: (id: TaskId) => void;
  /** Drop onto schedule lane using pointer Y and lane DOM rect (content box). */
  dropOnSchedule: (taskId: TaskId, clientY: number, laneContentRect: DOMRect) => void;
  returnToBacklog: (taskId: TaskId) => void;
};

export const usePlannerStore = create<Store>((set, get) => ({
  tasks: initialTasks,
  blocks: initialBlocks,

  addTask: ({ title, durationMinutes, color }) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const nextColor = color ?? PALETTE[get().tasks.length % PALETTE.length];
    const task: Task = {
      id,
      title: trimmed,
      durationMinutes: Math.max(5, Math.round(durationMinutes)),
      color: nextColor,
      status: 'backlog',
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ tasks: [...s.tasks, task] }));
  },

  updateTaskDuration: (id, durationMinutes) => {
    const next = Math.max(5, Math.round(durationMinutes));
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

      if (placementValid(updatedTask, block.startMinuteOfDay, blocks, map, id)) {
        return { tasks, blocks };
      }

      const newStart = resolveDropStart(updatedTask, block.startMinuteOfDay, blocks, map, {
        snapStep: 15,
        excludeTaskId: id,
      });
      if (newStart === null) return s;

      blocks[blockIdx] = { taskId: id, startMinuteOfDay: newStart };
      return { tasks, blocks };
    });
  },

  removeTask: (id) => {
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      blocks: s.blocks.filter((b) => b.taskId !== id),
    }));
  },

  dropOnSchedule: (taskId, clientY, laneContentRect) => {
    const { tasks, blocks } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const relativeY = clientY - laneContentRect.top;
    const clampedY = Math.max(0, Math.min(laneContentRect.height, relativeY));
    const rawStart = (clampedY / laneContentRect.height) * MINUTES_IN_DAY;

    const map = taskMap(tasks);
    const start = resolveDropStart(task, rawStart, blocks, map, {
      snapStep: 15,
      excludeTaskId: taskId,
    });
    if (start === null) return;

    const nextBlocks = blocks.filter((b) => b.taskId !== taskId);
    nextBlocks.push({ taskId, startMinuteOfDay: start });

    set({
      blocks: nextBlocks,
      tasks: reconcileTasks(tasks, nextBlocks),
    });
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
}));

const persistDebounced = debounce((tasks: Task[], blocks: ScheduledBlock[]) => {
  save({ tasks, blocks });
}, 250);

usePlannerStore.subscribe((state) => {
  persistDebounced(state.tasks, state.blocks);
});
