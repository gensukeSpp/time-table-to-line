import { describe, it, expect } from 'vitest';
import { formatAccomplishedDate } from '../lib/milestone';

describe('formatAccomplishedDate', () => {
  it('formats yyyy/MM/dd', () => {
    expect(formatAccomplishedDate('2026-08-20')).toBe('2026/08/20');
  });

  it('returns 達成日なし for null / undefined', () => {
    expect(formatAccomplishedDate(null)).toBe('達成日なし');
    expect(formatAccomplishedDate(undefined)).toBe('達成日なし');
  });
});
