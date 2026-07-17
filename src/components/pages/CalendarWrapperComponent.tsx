import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SlotInfo } from 'react-big-calendar';
import { chakra } from '@chakra-ui/system';
import * as Tabs from "@radix-ui/react-tabs";

import { TimelineEventProps } from '../../lib/TimelineType';
import { TimesUpdateButton } from '../molecules/TimeUpdateButtonComponent';
import { MyCalendar } from './CalendarComponent';
import { MyHorizonTimeline } from "../pages/TimelineComponent";
import { DialogOnSlot } from '../organisms/DialogOnSlotComponent';

import { tabMenu, tabButton } from './CalendarComponentWrapper.css';
import { flexXmandatory } from './CalendarComponent.css';
// import { eventData } from '../../lib/SampleState';

export const CalendarWrapper = () => {
  // React コンポーネント間でデータ・イベントを受け渡す方法
  // :子コンポーネントから親コンポーネントにデータを受け渡す方法
  // https://www.freecodecamp.org/japanese/news/pass-data-between-components-in-react/
  const [movedEvents, setMovedEvents] = useState<TimelineEventProps[]>([]);
  const [slotInfo, setSlotInfo] = useState<SlotInfo>();

  return (
    <Tabs.Root defaultValue='tab1'>
      <Tabs.List className={tabMenu}>
        <Tabs.Trigger value='tab1' className={tabButton}>タイムテーブル</Tabs.Trigger>
        <Tabs.Trigger value='tab2' className={tabButton}>タイムライン</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="tab1">
        <chakra.div className={flexXmandatory}>
          {/* <button>
            <Link to="/timeline">タイムライン</Link>
          </button> */}
          <MyCalendar
            onTimeChangeEvents={childData => setMovedEvents(childData)}
            onSlotInfo={childSlotInfo => setSlotInfo(childSlotInfo)}
          />
          <TimesUpdateButton timeChangeEvents={movedEvents} />
          <DialogOnSlot slotInfo={slotInfo} />
        </chakra.div>
      </Tabs.Content>
      <Tabs.Content value='tab2'>
        <MyHorizonTimeline />
      </Tabs.Content>
    </Tabs.Root>
  );
}
