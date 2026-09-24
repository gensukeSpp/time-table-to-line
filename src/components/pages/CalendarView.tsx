import { useState, useCallback, useRef, useEffect } from 'react';
import { Calendar, View, SlotInfo } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { Box } from '@mantine/core';

import { useEventsState } from '../../hooks/useContextFamily';
import { useMouseEvents } from '../../hooks/useMouseHandle';
import { useAuthInfo } from '../../hooks/useAuthGuard';
import { useCallingEditForm } from '../../hooks/useCallingForm';
import localizer from '../../lib/Localization';
import { CalendarActionProps, TimelineEventProps } from '../../lib/TimelineType';
import { isFullDayEvent, shouldBlockMonthDnd } from '../../lib/slot';
import { resolveEventColor } from '../../lib/progressColor';
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
   * Drag and Drop
   */
  const DnDCalendar = withDragAndDrop(Calendar<TimelineEventProps>);
  const { onEventResize, onEventDrop, eventList } = useMouseEvents();

  // Warning: Cannot update a component (`CalendarWrapper`) while rendering a different component (`MyCalendar`). 
  // To locate the bad setState() call inside `MyCalendar`,
  // https://stackoverflow.com/questions/75023532/warning-cannot-update-a-component-home-while-rendering-a-different-componen
  useEffect(() => {
    onTimeChangeEvents?.(eventList);
  }, [onTimeChangeEvents, eventList]);

  // ドラッグ/リサイズ済みイベント (eventList) と同名 id の元イベントを除外して再構築する。
  // これにより元イベントと移動後イベントの二重表示を防ぐ（prevRef による破壊的 delete を廃止）。
  const resentEventIds = new Set(eventList.map(evt => evt.id));
  const newState = eventList.length > 0
    ? state?.filter(evt => !resentEventIds.has(evt.id)).concat(eventList)
    : state;

  // Viewの切り替え調節
  const [displayDate, setDisplayDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('week');
  const onNavigate = useCallback((newDate: Date) => {
    setDisplayDate(newDate);
  }, [setDisplayDate]);
  const onView = useCallback((newView: View) => {
    setCurrentView(newView);
  }, []);

  // Issue #30: 'month' ビューの時間イベントへの DnD（移動・リサイズ）を無効化。
  // closure で currentView を参照するため、ビュー切替で作り直される（再レンダー1回）。
  const draggableAccessor = useCallback(
    (event: TimelineEventProps) => !shouldBlockMonthDnd(event, currentView),
    [currentView]
  );
  const resizableAccessor = useCallback(
    (event: TimelineEventProps) => !shouldBlockMonthDnd(event, currentView),
    [currentView]
  );

  // Issue #35: 進捗による配色。week は progress 色（null は default #3174ad）、
  // month は #3174ad / #00695c のみ（進捗配色は出さない）。
  // inline style は CSS（.rbc-event-allday 等）より優先され、ビュー毎に制御できる。
  const eventPropGetter = useCallback(
    (stateEvent: TimelineEventProps) => {
      const backgroundColor = resolveEventColor(stateEvent, currentView);
      return backgroundColor ? { style: { backgroundColor } } : {};
    },
    [currentView]
  );

  /**
   * Slot and Dialog
   */
  const countRef = useRef<number | undefined>(undefined);

  const clickRef = useRef<number | undefined>(undefined);
  // スロット選択時に「slotInfo と選択時点の view」を一組で保存する（pr-32-review 指摘1）。
  // 親への通知は新しい選択があったときだけ。ビュー切替では再通知しない。
  const [slotSelection, setSlotSelection] = useState<{ slotInfo: SlotInfo; view: View }>();
  const onSelectSlot = useCallback((slotInfo: SlotInfo) => {
    window.clearTimeout(clickRef?.current);
    clickRef.current = window.setTimeout(() => {
      if (countRef.current === clickRef.current) {
        setSlotSelection({ slotInfo, view: currentView });
      }
    }, 250);
    // こっちが先になる
    countRef.current = clickRef.current;
  }, [currentView]);

  // 新しいスロット選択があったときだけ親へ通知する。
  // currentView を依存に含めないためビュー切替で再通知されず、
  // 未選択（undefined）のときは通知しない。
  useEffect(() => {
    if (slotSelection === undefined) return;
    onSlotInfo?.(slotSelection.slotInfo, slotSelection.view);
  }, [slotSelection, onSlotInfo]);

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
            allDayAccessor={(stateEvent: TimelineEventProps) => isFullDayEvent(stateEvent.start_time, stateEvent.end_time)}
            startAccessor={(stateEvent: TimelineEventProps) => {
              return stateEvent.start_time;
            }}
            endAccessor={(stateEvent: TimelineEventProps) => {
              return stateEvent.end_time;
            }}
            onNavigate={onNavigate}
            eventPropGetter={eventPropGetter}
            draggableAccessor={draggableAccessor}
            resizableAccessor={resizableAccessor}
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
