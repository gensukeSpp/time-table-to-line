import { ReactNode } from 'react';
import { addHours } from 'date-fns';

import { TimelineEventProps } from '../../lib/TimelineType';
import { useEventsQueryForTL } from '../../resources/queries';
import { EventsStateContext, TimelineEventPropsList } from '../../hooks/useContextFamily';

export const EventsContextProvider = ({ children }: { children: ReactNode }) => {
  // const [events, dispatch] = useReducer(timelineEventsReducer, [
  const initialData: TimelineEventProps = {
    id: 0,
    staff_id: 1000,
    group: 7,
    title: 'Learn cool stuff',
    // moment.utc("2019-02-21 09:00").local().format();  //"2019-02-21T18:00:00+09:00"
    start_time: new Date(),
    end_time: addHours(new Date(), 1),
    start: new Date(),
    end: new Date(new Date().setHours(new Date().getHours() + 1))
  }

  const { data, isPending } = useEventsQueryForTL();
  const state: TimelineEventPropsList = [initialData].concat(data!);

  // if(isPending) return <div>Loading...</div>; // <- 取得中は children をマウントさせない
  return (
    <EventsStateContext.Provider value={state}>
      {/* <EventsDispatchContext.Provider value={dispatch}> */}
      {children}
      {/* </EventsDispatchContext.Provider> */}
    </EventsStateContext.Provider>
  );
}