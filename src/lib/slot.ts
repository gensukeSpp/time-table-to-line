import { addHours, endOfDay, min, startOfDay, isSameDay, isSameMinute } from 'date-fns';

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

/**
 * Issue #29: 'month' ビュー（フルデイ追加）か 'week' ビュー（時間追加）かで
 * イベントの終了時刻を決める。
 * - fullDay=true（month）: 同日 endOfDay（23:59:59.999）→ フルデイイベント
 * - fullDay=false（week）: 従来どおり resolveSlotEnd（クリック時刻 +1h / 23:00 丸め）
 */
export function resolveEventEnd(slotStartTime: Date, fullDay: boolean): Date {
  return fullDay ? endOfDay(slotStartTime) : resolveSlotEnd(slotStartTime);
}

/**
 * Issue #29: フルデイイベント（start=0:00, end=当日 23:59）の判定。
 * react-big-calendar の allDayAccessor に渡し、'month' ビュー由来イベントを
 * 週ビューの `.rbc-row` に配置 + `.rbc-event-allday` クラス付与させる。
 *
 * date-fns 4.x には isStartOfDay / isEndOfDay が無いため、
 * startOfDay / endOfDay / isSameMinute / isSameDay で判定する。
 */
export function isFullDayEvent(start: Date, end: Date): boolean {
  return (
    isSameMinute(start, startOfDay(start)) &&
    isSameDay(start, end) &&
    isSameMinute(end, endOfDay(start))
  );
}
