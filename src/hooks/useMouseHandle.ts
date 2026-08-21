import { useState, useCallback } from "react";
import { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop'

import { TimelineEventProps } from '../lib/TimelineType';

export const useMouseEvents = () => {
  const [eventList, setEventList] = useState<TimelineEventProps[]>([]);

  // DnD ドロップ時に受け取った新しい日時 (start / end) を、カレンダー描画で
  // アクセサが読む start_time / end_time にも反映する（CalendarView.tsx の
  // startAccessor / endAccessor が start_time / end_time を参照するため）。
  // 同一 id の既存エントリは置き換えて、複数回ドラッグ時の二重積みを防ぐ。
  const applyChange = useCallback(
    (handleEvent: TimelineEventProps, start: Date | string, end: Date | string) => {
      setEventList(currentEvents => {
        const changedEvent: TimelineEventProps = {
          ...handleEvent,
          start_time: new Date(start),
          end_time: new Date(end),
          start: new Date(start),
          end: new Date(end),
          isDraggable: true,
        };
        const others = currentEvents.filter(e => e.id !== handleEvent.id);
        return [...others, changedEvent];
      });
    },
    []
  );

  const onEventResize = useCallback(
    ({ event: handleEvent, start, end }: EventInteractionArgs<TimelineEventProps>) => {
      applyChange(handleEvent, start, end);
    },
    [applyChange]
  );

  const onEventDrop = useCallback(
    ({ event: handleEvent, start, end }: EventInteractionArgs<TimelineEventProps>) => {
      applyChange(handleEvent, start, end);
    },
    [applyChange]
  );

  return { onEventResize, onEventDrop, eventList };
};
