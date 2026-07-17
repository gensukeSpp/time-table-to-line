import { TimelineGroupBase } from 'react-calendar-timeline-v3';

import { GroupUserProps, TimelineEventProps } from '../lib/TimelineType';
import { TimelineEventPropsList } from '../hooks/useContextFamily';
import { exEvents, exItems } from './SampleState';

// const groupQuery: GroupUserProps[] | undefined = useGroupUsersQuery().data?.data;

const sampleGroups: TimelineGroupBase[] = [
  { id: 501, title: "group 1" },
  { id: 500, title: "group 2" },
];

export const getGroup = (groupQueries?: GroupUserProps[]): TimelineGroupBase[] => {
  const result = groupQueries ? groupQueries.map((groupUser, k) => {
    // console.log(`ここは通ってないはず: ${k}`);
    return { id: groupUser.staff_id, title: groupUser.family_kana };
  }) : sampleGroups;
  return result;
}

export const getItems = (eventContextQueries: TimelineEventPropsList) => {
  const contextState = eventContextQueries.length > 1 ? eventContextQueries.map((eventContextData: TimelineEventProps) => {
    // console.log(`Context module staff: ${eventContextData.staff_id}`);
    eventContextData.group = eventContextData.staff_id;
    return eventContextData
  }) : exEvents;
  return contextState;
}
