import { describe, it, expect } from 'vitest';
import { normalizeProgressGroup, groupMilestoneEventsByProgress } from '../lib/milestoneEvents';
import { MilestoneEventProps } from '../lib/TimelineType';

const ev = (id: number, progress?: string | null): MilestoneEventProps => ({
  id, staff_id: 1001, group: 3, group_name: 'G', start: '2026-08-02T10:00:00.000Z',
  end: '2026-08-02T11:00:00.000Z', title: 'e' + id,
  progress: progress ?? null, milestone_id: 1, completed: false,
});

describe('milestoneEvents', () => {
  it('normalize: label / token / null → group', () => {
    expect(normalizeProgressGroup('これから')).toBe('これから');
    expect(normalizeProgressGroup('from now')).toBe('これから');
    expect(normalizeProgressGroup(null)).toBe('指定なし');
    expect(normalizeProgressGroup('')).toBe('指定なし');
    expect(normalizeProgressGroup('unknown')).toBe('指定なし');
  });

  it('groups by progress in fixed order and omits empty groups', () => {
    const groups = groupMilestoneEventsByProgress([
      ev(1, '完了'), ev(2, null), ev(3, 'これから'), ev(4, 'まだ'), ev(5, 'もうすぐ'),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['これから', 'まだ', 'もうすぐ', '完了', '指定なし']);
    expect(groups[0].events.map((e) => e.id)).toEqual([3]);
    expect(groups[4].events.map((e) => e.id)).toEqual([2]);
  });

  it('returns [] for empty input', () => {
    expect(groupMilestoneEventsByProgress([])).toEqual([]);
  });
});
