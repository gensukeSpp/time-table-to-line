import { TimelineGroupBase } from 'react-calendar-timeline';

import { GroupUserProps, TimelineEventProps, TimelineStackItem } from '../lib/TimelineType';
import { TimelineEventPropsList } from '../hooks/useContextFamily';
import { exEvents } from './SampleState';

const sampleGroups: TimelineGroupBase[] = [
  { id: 501, title: "group 1" },
  { id: 500, title: "group 2" },
];

export const getGroup = (groupQueries?: GroupUserProps[]): TimelineGroupBase[] => {
  const result = groupQueries ? groupQueries.map((groupUser) => {
    return { id: groupUser.staff_id, title: groupUser.family_kana };
  }) : sampleGroups;
  return result;
}

export const getItems = (eventContextQueries: TimelineEventPropsList) => {
  const contextState = eventContextQueries && eventContextQueries.length > 0
    ? eventContextQueries.map((eventContextData: TimelineEventProps) => ({
        ...eventContextData,
        group: eventContextData.staff_id,
      }))
    : exEvents;
  return contextState;
}

// react-calendar-timeline の stackItems は native Date では動作しない
// （ミリ秒の number が必須）。Timeline へ渡す直前に start_time/end_time を
// .getTime() の数値へ変換する（アプリ全体の Date は維持する）。
// 同時に、Invalid Date / NaN / Infinity など非有限の時刻を除外して
// 描画ジオメトリが壊れるのを防ぐ（Issue#11 Issue 2 の防御）。
const toFiniteMs = (d: Date): number | null => {
  const ms = d instanceof Date ? d.getTime() : Number.NaN;
  return Number.isFinite(ms) ? ms : null;
};

export const toTimelineStackItems = (items: TimelineEventProps[]): TimelineStackItem[] => {
  const result: TimelineStackItem[] = [];
  for (const item of items) {
    const start = toFiniteMs(item.start_time);
    const end = toFiniteMs(item.end_time);
    if (start === null || end === null) {
      // 異常な時刻を持つアイテムは除外し、残りの描画を守る
      continue;
    }
    result.push({ ...item, start_time: start, end_time: end });
  }
  return result;
};
