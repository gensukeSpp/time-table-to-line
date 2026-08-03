import { describe, expect, it } from 'vitest';
import { setHours, setMinutes, startOfDay } from 'date-fns';
import { SlotInfo } from 'react-big-calendar';
import { normalizeSlotInfo } from '../lib/slot';

describe('normalizeSlotInfo', () => {
  it('end > start の通常スロットはそのまま返す', () => {
    const start = setHours(startOfDay(new Date()), 9);
    const end = setHours(startOfDay(new Date()), 10);
    const result = normalizeSlotInfo({ start, end } as SlotInfo);
    expect(result.start).toBe(start);
    expect(result.end).toBe(end);
  });

  it('23:00 スロットの逆走 end（同刻 or 前刻）を start + 1h に補正する', () => {
    const start = setHours(startOfDay(new Date()), 23);
    const badEnd = startOfDay(new Date()); // 同日 00:00 / end <= start
    const result = normalizeSlotInfo({ start, end: badEnd } as SlotInfo);
    expect(result.end.getTime()).toBe(start.getTime() + 60 * 60 * 1000); // 1 時間後
    expect(result.end).not.toBe(badEnd);
  });

  it('end が start より前の時刻でも start + 1h に補正する', () => {
    const start = setHours(startOfDay(new Date()), 23);
    const before = setMinutes(startOfDay(new Date()), 30); // 00:30（逆走）
    const result = normalizeSlotInfo({ start, end: before } as SlotInfo);
    expect(result.end.getTime()).toBe(start.getTime() + 60 * 60 * 1000);
  });
});
