import { describe, expect, it } from 'vitest';
import { endOfDay, startOfDay, setHours } from 'date-fns';

import {
  DEFAULT_EVENT_COLOR,
  MONTH_FULLDAY_COLOR,
  PROGRESS_COLORS,
  progressToColor,
  isMonthAllday,
  resolveEventColor,
} from '../lib/progressColor';

describe('progressToColor', () => {
  it('null / undefined / 空文字はデフォルト色を返す', () => {
    expect(progressToColor(undefined)).toBe(DEFAULT_EVENT_COLOR);
    expect(progressToColor(null)).toBe(DEFAULT_EVENT_COLOR);
    expect(progressToColor('')).toBe(DEFAULT_EVENT_COLOR);
  });

  it('日本語ラベル 4 段階をそれぞれの色に変換する', () => {
    expect(progressToColor('これから')).toBe(PROGRESS_COLORS['これから']);
    expect(progressToColor('まだ')).toBe(PROGRESS_COLORS['まだ']);
    expect(progressToColor('もうすぐ')).toBe(PROGRESS_COLORS['もうすぐ']);
    expect(progressToColor('完了')).toBe(PROGRESS_COLORS['完了']);
  });

  it('英字トークン（options.value）も同じ色に正規化される', () => {
    expect(progressToColor('from now')).toBe(PROGRESS_COLORS['これから']);
    expect(progressToColor('still')).toBe(PROGRESS_COLORS['まだ']);
    expect(progressToColor('almost')).toBe(PROGRESS_COLORS['もうすぐ']);
    expect(progressToColor('complete')).toBe(PROGRESS_COLORS['完了']);
  });

  it('未知の文字列はデフォルト色にフォールバックする', () => {
    expect(progressToColor('unknown')).toBe(DEFAULT_EVENT_COLOR);
  });
});

describe('isMonthAllday', () => {
  const day = new Date(2026, 8, 16);

  it('同一日フルデイは true', () => {
    expect(isMonthAllday(startOfDay(day), endOfDay(day))).toBe(true);
  });

  it('日跨ぎ（マルチデイ）は true', () => {
    expect(isMonthAllday(startOfDay(day), startOfDay(new Date(2026, 8, 18)))).toBe(true);
  });

  it('単日時間イベントは false', () => {
    expect(isMonthAllday(setHours(startOfDay(day), 9), setHours(startOfDay(day), 10))).toBe(false);
  });
});

describe('resolveEventColor', () => {
  const day = new Date(2026, 8, 16);
  const base = (over: { progress?: string | null } = {}) => ({
    start_time: startOfDay(day),
    end_time: endOfDay(day),
    ...over,
  });

  it('week: null 進捗は undefined（default に委譲）', () => {
    expect(resolveEventColor(base({ progress: null }), 'week')).toBeUndefined();
    expect(resolveEventColor(base({ progress: undefined }), 'week')).toBeUndefined();
  });

  it('week: 進捗に応じた色を返す（ラベル / 英字）', () => {
    expect(resolveEventColor(base({ progress: '完了' }), 'week')).toBe('#d81b60');
    expect(resolveEventColor(base({ progress: 'almost' }), 'week')).toBe('#8e24aa');
  });

  it('month: フルデイは進捗に関わらず teal（進捗配色を出さない）', () => {
    expect(resolveEventColor(base({ progress: '完了' }), 'month')).toBe(MONTH_FULLDAY_COLOR);
    expect(resolveEventColor(base({ progress: null }), 'month')).toBe(MONTH_FULLDAY_COLOR);
  });

  it('month: 単日時間イベントは undefined（進捗配色を出さない）', () => {
    const timed = {
      start_time: setHours(startOfDay(day), 9),
      end_time: setHours(startOfDay(day), 10),
      progress: '完了',
    };
    expect(resolveEventColor(timed, 'month')).toBeUndefined();
  });
});