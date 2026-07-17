import { describe, it, expect } from 'vitest';
import {
  calculateTimeRange,
  getCenterTime,
  ZOOM_LEVELS_IN_HOURS,
  calculateZoomedTimeRange,
} from '../lib/timelineZoomUtils';

describe('timelineZoomUtils', () => {
  describe('getCenterTime', () => {
    it('should correctly calculate the center time', () => {
      const start = new Date('2025-09-19T08:00:00').getTime();
      const end = new Date('2025-09-19T18:00:00').getTime();
      const expectedCenter = new Date('2025-09-19T13:00:00').getTime();
      expect(getCenterTime(start, end)).toBe(expectedCenter);
    });

    it('should handle zero values', () => {
        expect(getCenterTime(0, 100)).toBe(50);
    });
  });

  describe('calculateTimeRange', () => {
    it('should correctly calculate the time range for a given duration', () => {
      const centerTime = new Date('2025-09-19T12:00:00').getTime();
      const durationInHours = 6; // 6 hours

      const expectedStart = new Date('2025-09-19T09:00:00').getTime();
      const expectedEnd = new Date('2025-09-19T15:00:00').getTime();

      const { start, end } = calculateTimeRange(
        centerTime,
        durationInHours
      );

      expect(start).toBe(expectedStart);
      expect(end).toBe(expectedEnd);
    });

    it('should work with zoom levels defined in the constants', () => {
        const centerTime = new Date('2025-09-20T00:00:00').getTime();
        const durationInHours = ZOOM_LEVELS_IN_HOURS[4]; // 24 hours
        expect(durationInHours).toBe(24);

        const expectedStart = new Date('2025-09-19T12:00:00').getTime();
        const expectedEnd = new Date('2025-09-20T12:00:00').getTime();

        const { start, end } = calculateTimeRange(
            centerTime,
            durationInHours
          );

        expect(start).toBe(expectedStart);
        expect(end).toBe(expectedEnd);
    });
  });

  describe('calculateZoomedTimeRange', () => {
    const timelineWidth = 1000; // Example timeline width in pixels

    it('should zoom in (decrease duration) when dragging left', () => {
      const currentTimeRange = {
        start: new Date('2025-09-19T06:00:00').getTime(),
        end: new Date('2025-09-19T18:00:00').getTime(), // 12 hours duration
      };
      const dragDistance = -100; // Drag left

      const { start, end } = calculateZoomedTimeRange(
        currentTimeRange,
        dragDistance,
        timelineWidth
      );

      const newDuration = end - start;
      const oldDuration = currentTimeRange.end - currentTimeRange.start;

      expect(newDuration).toBeLessThan(oldDuration);
      // Center time should be preserved
      const oldCenter = getCenterTime(currentTimeRange.start, currentTimeRange.end);
      const newCenter = getCenterTime(start, end);
      expect(newCenter).toBe(oldCenter);
    });

    it('should zoom out (increase duration) when dragging right', () => {
      const currentTimeRange = {
        start: new Date('2025-09-19T06:00:00').getTime(),
        end: new Date('2025-09-19T18:00:00').getTime(), // 12 hours duration
      };
      const dragDistance = 100; // Drag right

      const { start, end } = calculateZoomedTimeRange(
        currentTimeRange,
        dragDistance,
        timelineWidth
      );

      const newDuration = end - start;
      const oldDuration = currentTimeRange.end - currentTimeRange.start;

      expect(newDuration).toBeGreaterThan(oldDuration);
      // Center time should be preserved
      const oldCenter = getCenterTime(currentTimeRange.start, currentTimeRange.end);
      const newCenter = getCenterTime(start, end);
      expect(newCenter).toBe(oldCenter);
    });

    it('should not zoom beyond the minimum limit', () => {
        const currentTimeRange = {
            start: new Date('2025-09-19T11:30:00').getTime(),
            end: new Date('2025-09-19T12:30:00').getTime(), // 1 hour duration (minimum)
        };
        const dragDistance = -200; // Strong drag left

        const { start, end } = calculateZoomedTimeRange(
            currentTimeRange,
            dragDistance,
            timelineWidth
        );

        const newDuration = (end - start) / (60 * 60 * 1000);
        expect(newDuration).toBe(ZOOM_LEVELS_IN_HOURS[0]); // Should be clamped to 1 hour
    });

    it('should not zoom beyond the maximum limit', () => {
        const currentTimeRange = {
            start: new Date('2025-09-15T00:00:00').getTime(),
            end: new Date('2025-09-22T00:00:00').getTime(), // 7 days duration (maximum)
        };
        const dragDistance = 200; // Strong drag right

        const { start, end } = calculateZoomedTimeRange(
            currentTimeRange,
            dragDistance,
            timelineWidth
        );

        const newDuration = (end - start) / (60 * 60 * 1000);
        const maxDurationInHours = ZOOM_LEVELS_IN_HOURS[ZOOM_LEVELS_IN_HOURS.length - 1];
        expect(newDuration).toBe(maxDurationInHours); // Should be clamped to 1 week
    });
  });
});