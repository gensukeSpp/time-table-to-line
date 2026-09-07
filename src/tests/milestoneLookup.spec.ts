import { describe, it, expect } from 'vitest';
import {
  buildMilestoneColorMap,
  buildMilestoneStatusMap,
  computeItemDecorations,
} from '../lib/milestoneLookup';
import { MilestoneProps } from '../lib/TimelineType';

const milestones: MilestoneProps[] = [
  { id: 1, staff_id: 1000, title: 'open1', color: '#9c27b0', status: 'open', created_at: '2026-01-01', guideline_end_date: null },
  { id: 2, staff_id: 1000, title: 'waiting1', color: '#009688', status: 'waiting', created_at: '2026-01-02', guideline_end_date: null },
  { id: 3, staff_id: 1000, title: 'closed1', color: '#795548', status: 'closed', created_at: '2026-01-03', guideline_end_date: null },
];

describe('milestoneLookup', () => {
  it('builds color map id -> color', () => {
    const map = buildMilestoneColorMap(milestones);
    expect(map.get(1)).toBe('#9c27b0');
    expect(map.get(99)).toBeUndefined();
  });

  it('colors an event belonging to a milestone', () => {
    const colors = buildMilestoneColorMap(milestones);
    const statuses = buildMilestoneStatusMap(milestones);
    expect(computeItemDecorations(colors, statuses, 1)).toEqual({ backgroundColor: '#9c27b0' });
  });

  it('applies opacity 0.7 only when the milestone is waiting', () => {
    const colors = buildMilestoneColorMap(milestones);
    const statuses = buildMilestoneStatusMap(milestones);
    expect(computeItemDecorations(colors, statuses, 2)).toEqual({ backgroundColor: '#009688', opacity: 0.7 });
  });

  it('returns empty decoration for unassigned (undefined / null) events', () => {
    const colors = buildMilestoneColorMap(milestones);
    const statuses = buildMilestoneStatusMap(milestones);
    expect(computeItemDecorations(colors, statuses, undefined)).toEqual({});
    expect(computeItemDecorations(colors, statuses, null)).toEqual({});
  });

  it('returns empty decoration for a milestone not present in the map (closed is absent from /milestone/all)', () => {
    const colors = buildMilestoneColorMap(milestones);
    const statuses = buildMilestoneStatusMap(milestones);
    expect(computeItemDecorations(colors, statuses, 99)).toEqual({});
  });
});