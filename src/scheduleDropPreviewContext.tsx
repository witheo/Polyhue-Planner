import { createContext, useContext } from 'react';

import type { TaskId } from './domain/types';

export type ScheduleDropPreview = {
  taskId: TaskId;
  startMinuteOfDay: number;
} | null;

export const ScheduleDropPreviewContext = createContext<ScheduleDropPreview>(null);

export function useScheduleDropPreview(): ScheduleDropPreview {
  return useContext(ScheduleDropPreviewContext);
}
