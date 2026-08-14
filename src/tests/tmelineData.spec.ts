import { describe, expect, it } from 'vitest';
import { toTimelineStackItems } from '../lib/TmelineData';
import type { TimelineEventProps } from '../lib/TimelineType';

describe('toTimelineStackItems', () => {
  const base: TimelineEventProps = {
    id: 1,
    group: 500,
    staff_id: 500,
    admin: false,
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

  it('Invalid Date / NaN の時刻を持つアイテムは除外する（描画ジオメトリ保護）', () => {
    const invalidStart: TimelineEventProps = {
      ...base,
      id: 2,
      start_time: new Date('not-a-date'),
    };
    const invalidEnd: TimelineEventProps = {
      ...base,
      id: 3,
      end_time: new Date('not-a-date'),
    };
    const out = toTimelineStackItems([base, invalidStart, invalidEnd]);
    // 正常な base だけが残り、NaN を含まない
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(1);
    expect(Number.isFinite(out[0].start_time)).toBe(true);
    expect(Number.isFinite(out[0].end_time)).toBe(true);
  });

  it('start_time / end_time は常に有限の number を返す', () => {
    for (const item of toTimelineStackItems([base])) {
      expect(Number.isFinite(item.start_time)).toBe(true);
      expect(Number.isFinite(item.end_time)).toBe(true);
    }
  });
});
