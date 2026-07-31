import { ReactNode } from 'react';
import { addHours } from 'date-fns';

import { TimelineEventProps } from '../../lib/TimelineType';
import { useEventsQuery } from '../../resources/queries';
import { EventsStateContext, TimelineEventPropsList } from '../../hooks/useContextFamily';

export const EventsContextProvider = ({ children }: { children: ReactNode }) => {
  const initialData: TimelineEventProps = {
    id: 0,
    staff_id: 1000,
    group: 7,
    title: 'Learn cool stuff',
    start_time: new Date(),
    end_time: addHours(new Date(), 1),
    start: new Date(),
    end: new Date(new Date().setHours(new Date().getHours() + 1))
  }

  const { data } = useEventsQuery({ forTimeline: true });
  const state: TimelineEventPropsList = [initialData].concat(data ?? []);

  return (
    <EventsStateContext.Provider value={state}>
      {children}
    </EventsStateContext.Provider>
  );
}