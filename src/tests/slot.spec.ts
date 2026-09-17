import { describe, expect, it } from 'vitest';
import { addHours, endOfDay, setHours, startOfDay } from 'date-fns';
import { resolveSlotEnd, resolveEventEnd, isFullDayEvent } from '../lib/slot';

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

describe('resolveEventEnd', () => {
  it('fullDay=true なら endOfDay を返す（month ビューのフルデイ）', () => {
    const start = startOfDay(new Date(2026, 8, 16));
    expect(resolveEventEnd(start, true)).toEqual(endOfDay(start));
  });

  it('fullDay=false なら従来の resolveSlotEnd と同一', () => {
    const start = setHours(startOfDay(new Date()), 9);
    expect(resolveEventEnd(start, false)).toEqual(resolveSlotEnd(start));
  });

  it('fullDay=false で 23:00 は同日 endOfDay に丸まる（11PM 問題の挙動維持）', () => {
    const start = setHours(startOfDay(new Date()), 23);
    expect(resolveEventEnd(start, false)).toEqual(endOfDay(start));
  });
});

describe('isFullDayEvent', () => {
  it('フルデイ（0:00–当日 23:59）は true', () => {
    const start = startOfDay(new Date(2026, 8, 16));
    expect(isFullDayEvent(start, endOfDay(start))).toBe(true);
  });

  it('week 作成イベント（9:00–10:00）は false', () => {
    const start = setHours(startOfDay(new Date(2026, 8, 16)), 9);
    expect(isFullDayEvent(start, new Date(start.getTime() + 3600000))).toBe(false);
  });

  it('23:00–23:59 の week イベントは false（start が 0:00 でない）', () => {
    const start = setHours(startOfDay(new Date(2026, 8, 16)), 23);
    expect(isFullDayEvent(start, endOfDay(start))).toBe(false);
  });

  it('既存 date-only（0:00–0:00）は false（end が 23:59 でない）', () => {
    const start = startOfDay(new Date(2026, 8, 16));
    expect(isFullDayEvent(start, start)).toBe(false);
  });

  it('日跨ぎは false', () => {
    const start = startOfDay(new Date(2026, 8, 16));
    const end = startOfDay(new Date(2026, 8, 18));
    expect(isFullDayEvent(start, end)).toBe(false);
  });
});
