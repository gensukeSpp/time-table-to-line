import { useState, useCallback, useRef } from "react";
import { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop'

import { TimelineEventProps } from '../lib/TimelineType';

export const useMouseEvents = () => {
  const [eventList, setEventList] = useState<TimelineEventProps[]>([]);
  // How to access previous props or state with React Hooks
  // https://blog.logrocket.com/accessing-previous-props-state-react-hooks/
  const prevRef = useRef<TimelineEventProps | undefined>(undefined);

  const onEventResize = useCallback(
    ({ event: handleEvent, start, end }: EventInteractionArgs<TimelineEventProps>) => {
    setEventList(currentEvents => {
      const resizedEvent: TimelineEventProps =  {
        // スプレッドが先だったんですね…
        ...handleEvent,
        start: new Date(start),
        end: new Date(end),
        isDraggable: true
      }
      
      return [...currentEvents, resizedEvent]
    });
    prevRef.current = handleEvent;
    prevRef.current!.isDraggable = true;
  }, []);

  const onEventDrop = useCallback(({ event: handleEvent, start, end }: EventInteractionArgs<TimelineEventProps>) => {
    setEventList(currentEvents => {
      const movedEvent: TimelineEventProps =  {
        ...handleEvent,
        start: new Date(start),
        end: new Date(end),
        isDraggable: true
      }
      
      return [...currentEvents, movedEvent]
    });
    prevRef.current = handleEvent;
    prevRef.current!.isDraggable = true;
  }, []);

  return {onEventResize, onEventDrop, eventList, prevRef};
}
