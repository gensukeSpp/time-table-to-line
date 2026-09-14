import { describe, expect, it } from 'vitest';
import { addDays, format } from 'date-fns';
import {
  getMilestoneClosedAt,
  formatClosedLabel,
} from './milestone';
import { MILESTONE_CLOSE_GRACE_DAYS } from './env';

const BASE = new Date('2026-08-20');
// 期待値は .env(VITE_MILESTONE_CLOSE_GRACE_DAYS) の実値から導出し、設定変更に追従できるようにする
const expectedAfterGrace = format(
  addDays(BASE, MILESTONE_CLOSE_GRACE_DAYS),
  'yyyy-MM-dd'
);
const expectedLabel = format(addDays(BASE, MILESTONE_CLOSE_GRACE_DAYS), 'MM/dd');

describe('getMilestoneClosedAt', () => {
  it('should return accomplished_date + grace days', () => {
    const d = getMilestoneClosedAt('2026-08-20');
    // タイムゾーン非依存のため日付文字列で比較
    expect(format(d!, 'yyyy-MM-dd')).toBe(expectedAfterGrace);
  });

  it('should use MILESTONE_CLOSE_GRACE_DAYS', () => {
    expect(MILESTONE_CLOSE_GRACE_DAYS).toBeGreaterThan(0);
  });

  it('should return null when accomplished_date is null', () => {
    expect(getMilestoneClosedAt(null)).toBeNull();
  });

  it('should return null when accomplished_date is undefined', () => {
    expect(getMilestoneClosedAt(undefined)).toBeNull();
  });
});

describe('formatClosedLabel', () => {
  it('should format MM/dd', () => {
    expect(formatClosedLabel('2026-08-20')).toBe(expectedLabel);
  });

  it('should return null when accomplished_date is null', () => {
    expect(formatClosedLabel(null)).toBeNull();
  });
});
