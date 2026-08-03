import { addHours, endOfDay, min } from 'date-fns';

/**
 * 11PM 問題対策: スロット開始時刻からイベント終了時刻を求める。
 *
 * react-big-calendar は end が「ちょうど 0:00 翌日（日跨ぎ）」のイベントを
 * all-day / multi-day バンドに描画する。23:00 スロットのように end が日付を
 * 跨ぐ場合は同日 endOfDay（23:59:59.999）に丸めることで、
 * 通常の時間列（23:00 列）に表示させ、allDay 扱いを防ぐ。
 */
export function resolveSlotEnd(slotStartTime: Date): Date {
  return min([addHours(slotStartTime, 1), endOfDay(slotStartTime)]);
}
