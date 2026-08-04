import { describe, expect, it } from 'vitest';
import { toTimelineStackItems } from '../lib/TmelineData';
import type { TimelineEventProps } from '../lib/TimelineType';

describe('toTimelineStackItems', () => {
  const base: TimelineEventProps = {
    id: 1,
    group: 500,
    staff_id: 500,
    title: 'x',
    start_time: new Date('2026-08-04T00:00:00.000Z'),
    end_time: new Date('2026-08-04T01:00:00.000Z'),
    start: new Date('2026-08-04T00:00:00.000Z'),
    end: new Date('2026-08-04T01:00:00.000Z'),
  };

  it('start_time / end_time をミリ秒の number に変換する', () => {
    const [out] = toTimelineStackItems([base]);
    expect(out.start_time).toBe(base.start_time.getTime());
    expect(out.end_time).toBe(base.end_time.getTime());
    expect(typeof out.start_time).toBe('number');
    expect(typeof out.end_time).toBe('number');
  });

  it('他のフィールド（id / group / title 等）は維持する', () => {
    const [out] = toTimelineStackItems([base]);
    expect(out.id).toBe(1);
    expect(out.group).toBe(500);
    expect(out.title).toBe('x');
  });
});
