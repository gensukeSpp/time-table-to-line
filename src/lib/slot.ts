import { isBefore } from 'date-fns';
import { SlotInfo } from 'react-big-calendar';

/**
 * 11PM 問題対策: 23:00 等の末端スロット選択で react-big-calendar が
 * 逆走する end（end <= start）を返すのを正規化する。
 * 単一スロット選択は常に「start から 1 時間」として扱う。
 */
export function normalizeSlotInfo(slotInfo: SlotInfo): SlotInfo {
  const start = slotInfo.start;
  const end = slotInfo.end;
  if (!end || isBefore(end, start) || end.getTime() === start.getTime()) {
    return { ...slotInfo, end: new Date(start.getTime() + 60 * 60 * 1000) };
  }
  return { ...slotInfo, start, end };
}
