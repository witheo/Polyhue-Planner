import { describe, expect, it } from 'vitest';

import { LANE_MIN_CARD_HEIGHT_PX, laneCardHeightPx } from './laneLayout';

describe('laneCardHeightPx', () => {
  it('uses shared floor for 15-minute tasks', () => {
    expect(laneCardHeightPx(15)).toBe(LANE_MIN_CARD_HEIGHT_PX);
  });

  it('scales one px per minute above the floor', () => {
    expect(laneCardHeightPx(60)).toBe(60);
    expect(laneCardHeightPx(90)).toBe(90);
  });

  it('clamps sub-15 stored values to minimum duration for height', () => {
    expect(laneCardHeightPx(5)).toBe(LANE_MIN_CARD_HEIGHT_PX);
  });
});
