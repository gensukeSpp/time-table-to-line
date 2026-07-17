// src/lib/timelineZoomUtils.ts

/**
 * タイムラインのズームレベルを時間単位で定義します。
 * (例: 1時間、3時間、6時間、... 1週間)
 */
export const ZOOM_LEVELS_IN_HOURS: readonly number[] = [
  1,
  3,
  6,
  12,
  24, // 1 day
  24 * 3, // 3 days
  24 * 7, // 1 week
];

/**
 * 指定された中心時刻と期間（時間）に基づいて、
 * タイムラインの表示開始・終了時刻を計算します。
 *
 * @param centerTime 中心の時刻 (ミリ秒)
 * @param durationInHours 表示期間 (時間)
 * @returns 計算された表示範囲 { start: number, end: number }
 */
export const calculateTimeRange = (
  centerTime: number,
  durationInHours: number
): { start: number; end: number } => {
  const durationInMs = durationInHours * 60 * 60 * 1000;
  const halfDuration = durationInMs / 2;

  const visibleTimeStart = centerTime - halfDuration;
  const visibleTimeEnd = centerTime + halfDuration;

  return { start: visibleTimeStart, end: visibleTimeEnd };
};

/**
 * 現在の表示範囲から中心時刻を計算します。
 * @param visibleTimeStart 表示開始時刻 (ミリ秒)
 * @param visibleTimeEnd 表示終了時刻 (ミリ秒)
 * @returns 中心時刻 (ミリ秒)
 */
export const getCenterTime = (
  visibleTimeStart: number,
  visibleTimeEnd: number
): number => {
  return visibleTimeStart + (visibleTimeEnd - visibleTimeStart) / 2;
}

/**
 * ドラッグ距離に基づいて新しい時間範囲を計算し、ズームをシミュレートします。
 *
 * @param currentTimeRange 現在の表示時間範囲 { start, end }
 * @param dragDistance ピクセル単位の水平ドラッグ距離。正の値は右、負の値は左。
 * @param timelineWidth ピクセル単位のタイムライン表示領域の総幅。
 * @param sensitivity ズーム感度を調整する乗数。
 * @returns 新しい時間範囲 { start: number, end: number }
 */
export const calculateZoomedTimeRange = (
  currentTimeRange: { start: number; end: number },
  dragDistance: number,
  timelineWidth: number,
  sensitivity: number = 2
): { start: number; end: number } => {
  const { start, end } = currentTimeRange;
  const currentDuration = end - start;
  const centerTime = getCenterTime(start, end);

  // ズーム係数は、タイムラインの幅に対するドラッグ距離に比例します。
  const zoomFactor = 1 + (dragDistance * sensitivity) / timelineWidth;

  const newDuration = currentDuration * zoomFactor;

  // 最小・最大のズーム範囲を制限
  const minDuration = ZOOM_LEVELS_IN_HOURS[0] * 60 * 60 * 1000; // 1 hour
  const maxDuration =
    ZOOM_LEVELS_IN_HOURS[ZOOM_LEVELS_IN_HOURS.length - 1] * 60 * 60 * 1000; // 1 week

  const clampedDuration = Math.max(
    minDuration,
    Math.min(newDuration, maxDuration)
  );

  return calculateTimeRange(centerTime, clampedDuration / (60 * 60 * 1000));
};
