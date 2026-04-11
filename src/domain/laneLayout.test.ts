import { describe, expect, it } from 'vitest';

import {
  BACKLOG_TICKET_MIN_HEIGHT_PX,
  laneCardHeightPx,
  TICKET_SUBTASKS_VISIBLE_MIN_PX,
  TICKET_TWO_ROW_LAYOUT_MIN_PX,
} from './laneLayout';

describe('laneCardHeightPx', () => {
  it('uses 15 min as the base row height (matches BACKLOG_TICKET_MIN_HEIGHT_PX)', () => {
    expect(laneCardHeightPx(15)).toBe(BACKLOG_TICKET_MIN_HEIGHT_PX);
  });

  it('doubles height for 30 minutes vs 15', () => {
    expect(laneCardHeightPx(30)).toBe(BACKLOG_TICKET_MIN_HEIGHT_PX * 2);
  });

  it('scales linearly for longer tasks', () => {
    expect(laneCardHeightPx(60)).toBe(BACKLOG_TICKET_MIN_HEIGHT_PX * 4);
    expect(laneCardHeightPx(90)).toBe(BACKLOG_TICKET_MIN_HEIGHT_PX * 6);
  });

  it('clamps sub-minimum duration for height calculation', () => {
    expect(laneCardHeightPx(5)).toBe(BACKLOG_TICKET_MIN_HEIGHT_PX);
  });
});

describe('TICKET_TWO_ROW_LAYOUT_MIN_PX', () => {
  it('matches @container ticket (min-height) for stacked ticket header in task-card.css', () => {
    expect(TICKET_TWO_ROW_LAYOUT_MIN_PX).toBe(52);
  });
});

describe('TICKET_SUBTASKS_VISIBLE_MIN_PX', () => {
  it('matches @container ticket (min-height) for .ph-card__subtasks-wrap in task-card.css', () => {
    expect(TICKET_SUBTASKS_VISIBLE_MIN_PX).toBe(72);
  });

  it('stays at or below 30-minute ticket content box so subtasks are not gated off by rounding', () => {
    const outer = laneCardHeightPx(30);
    const approxContentBox = outer - 22; /* top border 6 + vertical padding 16 on .ph-card--ticket */
    expect(TICKET_SUBTASKS_VISIBLE_MIN_PX).toBeLessThanOrEqual(approxContentBox);
  });
});

describe('BACKLOG_TICKET_MIN_HEIGHT_PX', () => {
  it('is the 15-minute ticket height (padding + badge row) used to derive lane scale', () => {
    expect(BACKLOG_TICKET_MIN_HEIGHT_PX).toBe(48);
  });
});
