import { describe, expect, it } from 'vitest';
import { format } from 'date-fns';
import {
  getMilestoneClosedAt,
  formatClosedLabel,
  MILESTONE_CLOSE_GRACE_DAYS,
} from './milestone';

describe('getMilestoneClosedAt', () => {
  it('should return accomplished_date + grace days', () => {
    const d = getMilestoneClosedAt('2026-08-20');
    // タイムゾーン非依存のため日付文字列で比較
    expect(format(d!, 'yyyy-MM-dd')).toBe('2026-08-22');
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
    expect(formatClosedLabel('2026-08-20')).toBe('08/22');
  });

  it('should return null when accomplished_date is null', () => {
    expect(formatClosedLabel(null)).toBeNull();
  });
});