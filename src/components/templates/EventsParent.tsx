import { ReactNode } from 'react';
import moment from 'moment';

import { TimelineEventProps } from '../../lib/TimelineType';
import { useEventsQueryForTL } from '../../resources/queries';
import { EventsStateContext, TimelineEventPropsList } from '../../hooks/useContextFamily';
import { fetchEventsDataForTT } from '../../resources/fetch';

export const EventsContextProvider = ({ children }: { children: ReactNode }) => {
  // const [events, dispatch] = useReducer(timelineEventsReducer, [
  const initialData: TimelineEventProps = {
    id: 0,
    staff_id: 1000,
    group: 7,
    title: 'Learn cool stuff',
    // moment.utc("2019-02-21 09:00").local().format();  //"2019-02-21T18:00:00+09:00"
    start_time: moment(),
    end_time: moment().add(1, 'hours'),
    start: new Date(),
    end: new Date(new Date().setHours(new Date().getHours() + 1))
  }

  // const authContext = useAuthContext();
  // const token = authContext.type === 'token' ? authContext.accessToken : undefined;
  // useEffect(() => {
  //   const f = async () => {
  //     console.log('Passed');
  //     const fetchmono = await fetchEventsDataForTT(token!);
  //     console.log(`fetch json: ${fetchmono}`);
  //   }
  //   f();
  // }, []);

  const { data, isPending } = useEventsQueryForTL();
  // const { data } = useUserEventQuery();
  // console.log(`Parent json: ${JSON.stringify(data)}`);
  // const toString = Object.prototype.toString;
  // toString.call(moment); // [object Date]
  // if(isPending)
  //   return <p>Waiting...</p> // <- 出番はあるのか?
  // console.log('End type is moment?: ', moment.isMoment(data?.slice(-1)[0].end_time));
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
