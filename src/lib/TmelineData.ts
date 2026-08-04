import { TimelineGroupBase } from 'react-calendar-timeline';

import { GroupUserProps, TimelineEventProps } from '../lib/TimelineType';
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
export const toTimelineStackItems = (items: TimelineEventProps[]) =>
  items.map((item) => ({
    ...item,
    start_time: item.start_time.getTime(),
    end_time: item.end_time.getTime(),
  }));
