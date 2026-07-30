import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SlotInfo } from 'react-big-calendar';
import { Box, Tabs } from '@mantine/core';

import { TimelineEventProps } from '../../lib/TimelineType';
import { flexXmandatory } from './CalendarView.css';
import { TimesUpdateButton } from '../molecules/TimeUpdateButton';
import { MyCalendar } from './CalendarView';
import { MyHorizonTimeline } from "../pages/TimelinePage";
import { DialogOnSlot } from '../organisms/DialogOnSlot';

import { tabMenu, tabButton } from './CalendarPage.css';

export const CalendarWrapper = () => {
  // React コンポーネント間でデータ・イベントを受け渡す方法
  // :子コンポーネントから親コンポーネントにデータを受け渡す方法
  // https://www.freecodecamp.org/japanese/news/pass-data-between-components-in-react/
  const [movedEvents, setMovedEvents] = useState<TimelineEventProps[]>([]);
  const [slotInfo, setSlotInfo] = useState<SlotInfo>();

  return (
    <Tabs defaultValue='tab1'>
      <Tabs.List className={tabMenu}>
        <Tabs.Tab value='tab1' className={tabButton}>タイムテーブル</Tabs.Tab>
        <Tabs.Tab value='tab2' className={tabButton}>タイムライン</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="tab1">
        <Box className={flexXmandatory}>
          <MyCalendar
            onTimeChangeEvents={childData => setMovedEvents(childData)}
            onSlotInfo={childSlotInfo => setSlotInfo(childSlotInfo)}
          />
          <TimesUpdateButton timeChangeEvents={movedEvents} />
          <DialogOnSlot slotInfo={slotInfo} />
        </Box>
      </Tabs.Panel>
      <Tabs.Panel value='tab2'>
        <MyHorizonTimeline />
      </Tabs.Panel>
    </Tabs>
  );
}
