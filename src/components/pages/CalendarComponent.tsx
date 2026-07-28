import { useState, useCallback, useRef, useMemo, useEffect, CSSProperties } from 'react';
import { Calendar, Views, View, SlotInfo } from 'react-big-calendar'
import withDragAndDrop, { OnDragStartArgs } from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment';
import { Box } from '@mantine/core';

import { useEventsState } from '../../hooks/useContextFamily';
import { useMouseEvents } from '../../hooks/useMouseHandle';
import { useAuthInfo } from '../../hooks/useAuthGuard';
import { useCallingEditForm } from '../../hooks/useCallingForm';
import localizer from '../../lib/Localization';
import { CalendarActionProps, TimelineEventProps } from '../../lib/TimelineType';
import { useSearchQuery } from '../../resources/queries';
import { CustomEventWrapper, CustomEventCard } from '../molecules/WrapComponent';
import { AddChildForm } from '../organisms/InputItem';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import cx from 'classnames';
import { topWidth } from '../sprinkles.responsive.css';
import { gridArea } from './CalendarComponent.css';

export const MyCalendar = (
  {
    onTimeChangeEvents,
    onSlotInfo
  }: CalendarActionProps) => {

  const { authId } = useAuthInfo();
  // VSCode あてにならん
  console.log(`Auth info: ${typeof authId}`);

  const stateAll = useEventsState();
  console.log('Events are existing?: ', stateAll);

  const state = stateAll.length > 2 ? stateAll.filter((stateEvent) => {
    return stateEvent.staff_id === Number(authId);
  }) : undefined;
  // console.log(`Calendar state: ${JSON.stringify(state)}`);

  /**
   * EventPropGetter
   */
  const { data } = useSearchQuery('userID');
  const eventPropGetter = (event: TimelineEventProps) => {
    const uncontrolStyle: CSSProperties = {
      // pointerEvents: 'none',
      opacity: '.7'
    }
    const controlStyle: CSSProperties = {
      pointerEvents: 'auto'
    }
    if (event.staff_id.toString() != data) {
      return { style: uncontrolStyle };
    } else {
      return { style: controlStyle };
    }
  }

  /**
   * onDragStart and prevent
   */
  const [dragStart, setDragStart] = useState<boolean>();
  const onDragStart = useCallback((args: OnDragStartArgs<TimelineEventProps>) => {
    const { event, action } = args;
    // console.log('Auth info: ', typeof authId);
    console.log('Staff: ', event.staff_id);
    if (event.staff_id !== Number(authId)) {
      console.log('ちがうとこ通ります', action);
      setDragStart(false);
    } else {
      setDragStart(true);
    }
  }, []);

  /**
   * Drag and Drop
   */
  const DnDCalendar = withDragAndDrop(Calendar<TimelineEventProps>);
  const { onEventResize, onEventDrop, eventList, prevRef } = useMouseEvents();
  console.log(`Prev data: ${JSON.stringify(prevRef.current)}`);

  // Warning: Cannot update a component (`CalendarWrapper`) while rendering a different component (`MyCalendar`). 
  // To locate the bad setState() call inside `MyCalendar`,
  // https://stackoverflow.com/questions/75023532/warning-cannot-update-a-component-home-while-rendering-a-different-componen
  useEffect(() => {
    onTimeChangeEvents?.(eventList);
  }, [onTimeChangeEvents, eventList]);

  state?.map((evt, j) => {
    // if(prevRef){
    if (prevRef.current?.isDraggable === true && prevRef.current.id === evt.id) {
      console.log(`Exclude event id: ${prevRef.current?.id}, ${j}`);
      delete state[j];
      prevRef.current = undefined;
    }
    // }
  });
  // console.log(`Old state: ${JSON.stringify(state)}`);
  const newState = eventList ? state?.concat(eventList) : state;
  console.log(`Expect update events: ${JSON.stringify(eventList)}`)

  // Viewの切り替え調節、このまんま使える
  const [displayDate, setDisplayDate] = useState(new Date());
  const onNavigate = useCallback((newDate: Date) => {
    // const anotherDate: Date = new Date(newDate.setDate(newDate.getDay() - 3));
    console.log('Navigate date: ', newDate);
    setDisplayDate(newDate);
  }, [setDisplayDate]);
  const [returnView, setReturnView] = useState<View>();
  const onView = useCallback((newView: View) => {
    console.log('Navigate view: ', newView);
    setReturnView(newView);
  }, [setReturnView]);
  console.log(`What rbc date: ${displayDate}`);

  // console.log(`Calendar state: ${JSON.stringify(newState)}`);

  /**
   * Slot and Dialog
   */
  const countRef = useRef<number | undefined>();

  const clickRef = useRef<number | undefined>(undefined);
  const [slotInfoState, setSlotInfoState] = useState<SlotInfo>();
  const onSelectSlot = useCallback((slotInfo: SlotInfo) => {
    window.clearTimeout(clickRef?.current);
    clickRef.current = window.setTimeout(() => {
      if (countRef.current === clickRef.current) {
        setSlotInfoState(slotInfo);
        console.log('ここ通りました', slotInfo);
      }
    }, 250);
    // こっちが先になる
    countRef.current = clickRef.current;
    // console.log('今の状態 Slot: ', countRef.current, clickRef.current);
  }, []);

  useEffect(() => {
    onSlotInfo?.(slotInfoState!);
  }, [onSelectSlot, slotInfoState]);

  const [allDayEvent, setAllDayEvent] = useState<TimelineEventProps>();
  const allowAllDay = (event: TimelineEventProps) => {
    setAllDayEvent(event);
    console.log(allDayEvent);
    return true;
  }

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
    // console.log('Ref: ', divRef.current?.innerHTML);
    divRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectEvent]);

  /**
   * Wrapper component
   */
  const customComponents = useMemo(() => ({
    event: CustomEventCard,
    eventWrapper: CustomEventWrapper,
  }), []);

  return (
    <>
      {/* <TimesUpdateButton timeChangeEvents={eventList} /> */}
      <Box className={cx(gridArea, topWidth)} style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
        <p>マイタイムテーブル</p>
        {/* 【CSS】overflowの使い方解説！要素のはみ出し解決
        https://zero-plus.io/media/overflow/ */}
        <Box style={{ overflowX: 'hidden' }}>
          <DnDCalendar
            // allDayAccessor={allowAllDay}
            date={displayDate}
            localizer={localizer}
            events={newState}
            // ドラッグ・アンド・ドロップ、リサイズ後、weekに戻ります
            defaultView="week"
            // startAccessor="start"
            // endAccessor="end"
            startAccessor={(stateEvent: TimelineEventProps) => {
              return stateEvent.start_time.toDate();
            }}
            endAccessor={(stateEvent: TimelineEventProps) => {
              return stateEvent.end_time.toDate();
            }}
            onNavigate={onNavigate}
            // eventPropGetter={() => {return {'className': 'cn'}}}
            eventPropGetter={eventPropGetter}
            // onDragStart={onDragStart}
            onEventDrop={dragStart === false ? undefined : onEventDrop}
            onEventResize={dragStart === false ? undefined : onEventResize}
            resizable
            onSelectEvent={handleSelectEvent}
            // onDoubleClickEvent={handleSelectEvent}
            onSelectSlot={onSelectSlot}
            selectable
            onView={onView}
            onRangeChange={range => {
              console.log('Range: ', range);
            }}
          // components={customComponents}
          />
        </Box>
      </Box>
      {/* <DialogOnSlot slotInfo={slotInfoState} /> */}
      {modal.showModal &&
        <EditForm>
          {selectEvent &&
            <AddChildForm selectedEvent={selectEvent} ref={divRef}
              closeClick={modal.closeInputForm} />}
        </EditForm>}
    </>
  );
}
