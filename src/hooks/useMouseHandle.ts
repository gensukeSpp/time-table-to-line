import { useState, useCallback, useRef } from "react";
import { withDragAndDropProps, EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop'

import { PickDate, TimelineEventProps } from '../lib/TimelineType';

export const useMouseEvents = () => {
  const [eventList, setEventList] = useState<TimelineEventProps[]>([]);
  // How to access previous props or state with React Hooks
  // https://blog.logrocket.com/accessing-previous-props-state-react-hooks/
  const prevRef = useRef<TimelineEventProps | undefined>(undefined);
  
  // const onEventResize: withDragAndDropProps<TimelineEventProps>['onEventResize'] = data => {
  const onEventResize = useCallback(
    ({ event: handleEvent, start, end }: EventInteractionArgs<TimelineEventProps>) => {
    // const { event: handleEvent, start, end } = data;

    setEventList(currentEvents => {
      // const target = currentEvents.find((evt) => evt.id === handleEvent.id);
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
    
  // }
  }, []);

  // const onEventDrop: withDragAndDropProps<TimelineEventProps>['onEventDrop'] = data => {
  const onEventDrop = useCallback(({ event: handleEvent, start, end }: EventInteractionArgs<TimelineEventProps>) => {
    // const { event: handleEvent, start, end } = data;

    setEventList(currentEvents => {
      // const target = currentEvents.find((evt) => evt.id === handleEvent.id);
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
    
    // }
  }, []);

  return {onEventResize, onEventDrop, eventList, prevRef};
}

const useMouseEvent = () => {
  const [eventDate, setEventDate] = useState<PickDate>({
    id: '',
    start: new Date(),
    end: new Date()
  });
  
  const onEventResize: withDragAndDropProps<TimelineEventProps>['onEventResize'] = data => {
      const { event: handleEvent, start, end } = data;

      setEventDate({...eventDate, id: handleEvent.id, start: new Date(start), end: new Date(end)});
    }

  const onEventDrop: withDragAndDropProps<TimelineEventProps>['onEventDrop'] = data => {
      const { event: handleEvent, start, end } = data;
  
      setEventDate({...eventDate, id: handleEvent.id, start: new Date(start), end: new Date(end)});
    }

  return {onEventResize, onEventDrop, eventDate};
}
