import { useState, useCallback, useRef, useEffect, CSSProperties } from 'react';
import { Calendar, View, SlotInfo } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { Box } from '@mantine/core';

import { useEventsState } from '../../hooks/useContextFamily';
import { useMouseEvents } from '../../hooks/useMouseHandle';
import { useAuthInfo } from '../../hooks/useAuthGuard';
import { useCallingEditForm } from '../../hooks/useCallingForm';
import localizer from '../../lib/Localization';
import { CalendarActionProps, TimelineEventProps } from '../../lib/TimelineType';
import { AddChildForm } from '../organisms/InputItem';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import cx from 'classnames';
import { topWidth } from '../sprinkles.responsive.css';
import { gridArea } from './CalendarView.css';

export const MyCalendar = (
  {
    onTimeChangeEvents,
    onSlotInfo
  }: CalendarActionProps) => {

  const auth = useAuthInfo();

  const stateAll = useEventsState();

  const state = auth.type === 'auth' && stateAll.length > 2 ? stateAll.filter((stateEvent) => {
    return stateEvent.staff_id === auth.authId;
  }) : undefined;

  /**
   * EventPropGetter — 自分のイベントのみ操作可能に
   */
  const eventPropGetter = (event: TimelineEventProps) => {
    const uncontrolStyle: CSSProperties = {
      opacity: '.7'
    }
    const controlStyle: CSSProperties = {
      pointerEvents: 'auto'
    }
    const myStaffId = auth.type === 'auth' ? auth.authId : undefined;
    if (myStaffId == null || event.staff_id !== myStaffId) {
      return { style: uncontrolStyle };
    } else {
      return { style: controlStyle };
    }
  }

  /**
   * onDragStart and prevent
   */


  /**
   * Drag and Drop
   */
  const DnDCalendar = withDragAndDrop(Calendar<TimelineEventProps>);
  const { onEventResize, onEventDrop, eventList, prevRef } = useMouseEvents();

  // Warning: Cannot update a component (`CalendarWrapper`) while rendering a different component (`MyCalendar`). 
  // To locate the bad setState() call inside `MyCalendar`,
  // https://stackoverflow.com/questions/75023532/warning-cannot-update-a-component-home-while-rendering-a-different-componen
  useEffect(() => {
    onTimeChangeEvents?.(eventList);
  }, [onTimeChangeEvents, eventList]);

  state?.map((evt, j) => {
    if (prevRef.current?.isDraggable === true && prevRef.current.id === evt.id) {
      delete state[j];
      prevRef.current = undefined;
    }
  });
  const newState = eventList ? state?.concat(eventList) : state;

  // Viewの切り替え調節
  const [displayDate, setDisplayDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('week');
  const onNavigate = useCallback((newDate: Date) => {
    setDisplayDate(newDate);
  }, [setDisplayDate]);
  const onView = useCallback((newView: View) => {
    setCurrentView(newView);
  }, []);

  /**
   * Slot and Dialog
   */
  const countRef = useRef<number | undefined>(undefined);

  const clickRef = useRef<number | undefined>(undefined);
  const [slotInfoState, setSlotInfoState] = useState<SlotInfo>();
  const onSelectSlot = useCallback((slotInfo: SlotInfo) => {
    window.clearTimeout(clickRef?.current);
    clickRef.current = window.setTimeout(() => {
      if (countRef.current === clickRef.current) {
        setSlotInfoState(slotInfo);
      }
    }, 250);
    // こっちが先になる
    countRef.current = clickRef.current;
  }, []);

  useEffect(() => {
    onSlotInfo?.(slotInfoState!);
  }, [onSelectSlot, slotInfoState, onSlotInfo]);

  /**
   * Edit form appear
   */
  const [selectEvent, setSelectEvent] = useState<TimelineEventProps>();
  const { handleSelectEvent, EditForm, modal } = useCallingEditForm({
    onShowFormView(targetEvent) {
      setSelectEvent(targetEvent);
    }
  });

  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    divRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectEvent]);

  return (
    <>
      <Box className={cx(gridArea, topWidth)} style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
        <p>マイタイムテーブル</p>
        <Box style={{ overflowX: 'hidden' }}>
          <DnDCalendar
            date={displayDate}
            view={currentView}
            localizer={localizer}
            events={newState}
            defaultView="week"
            allDayAccessor={() => false}
            startAccessor={(stateEvent: TimelineEventProps) => {
              return stateEvent.start_time;
            }}
            endAccessor={(stateEvent: TimelineEventProps) => {
              return stateEvent.end_time;
            }}
            onNavigate={onNavigate}
            eventPropGetter={eventPropGetter}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
            resizable
            onSelectEvent={handleSelectEvent}
            onSelectSlot={onSelectSlot}
            selectable
            onView={onView}
            onRangeChange={() => {
            }}
          />
        </Box>
      </Box>
      {modal.showModal &&
        <EditForm>
          {selectEvent &&
            <AddChildForm selectedEvent={selectEvent} ref={divRef}
              closeClick={modal.closeInputForm} />}
        </EditForm>}
    </>
  );
}
