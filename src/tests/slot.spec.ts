import { describe, expect, it } from 'vitest';
import { addHours, endOfDay, setHours, startOfDay } from 'date-fns';
import { resolveSlotEnd } from '../lib/slot';

describe('resolveSlotEnd', () => {
  it('通常スロット（例: 9:00）は start + 1h を返す', () => {
    const start = setHours(startOfDay(new Date()), 9);
    expect(resolveSlotEnd(start)).toEqual(addHours(start, 1));
  });

  it('23:00 スロットは日跨ぎせずに同日 endOfDay に丸める', () => {
    const start = setHours(startOfDay(new Date()), 23);
    expect(resolveSlotEnd(start)).toEqual(endOfDay(start));
  });

  it('22:00 スロットは日跨ぎしないため start + 1h のまま', () => {
    const start = setHours(startOfDay(new Date()), 22);
    expect(resolveSlotEnd(start)).toEqual(addHours(start, 1));
  });

  it('endOfDay を超えず、かつ翌日 0:00 より前の値になる', () => {
    // どの開始時刻でも end は同日内（翌日 0:00 より前）
    const start = setHours(startOfDay(new Date()), 23);
    const end = resolveSlotEnd(start);
    expect(end.getTime()).toBeLessThan(addHours(start, 1).getTime());
    expect(end).toEqual(endOfDay(start));
  });
});
