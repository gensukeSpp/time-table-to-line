import { useState, useCallback } from 'react';

import { SlotInfo, View } from 'react-big-calendar';
import { Box, Tabs } from '@mantine/core';

import { TimelineEventProps } from '../../lib/TimelineType';
import { flexXmandatory } from './CalendarView.css';
import { TimesUpdateButton } from '../molecules/TimeUpdateButton';
import { MyCalendar } from './CalendarView';
import { GroupHorizonTimeline } from "../pages/TimelinePage";
import { DialogOnSlot } from '../organisms/DialogOnSlot';

import { tabMenu, tabButton } from './CalendarPage.css';

export const CalendarWrapper = () => {
  // React コンポーネント間でデータ・イベントを受け渡す方法
  // :子コンポーネントから親コンポーネントにデータを受け渡す方法
  // https://www.freecodecamp.org/japanese/news/pass-data-between-components-in-react/
  const [movedEvents, setMovedEvents] = useState<TimelineEventProps[]>([]);
  const [slotPicker, setSlotPicker] = useState<{ slotInfo?: SlotInfo; view?: View }>({});

  // スロットクリック時の現在ビューを、ダイアログ（DialogOnSlot → TitleInput）へ届ける。
  // インライン無名関数だと毎レンダー新参照になり、CalendarView 側 useEffect の依存
  // （onSlotInfo）が変わって再実行 → setSlotPicker が新オブジェクトを返して
  // 「Maximum update depth exceeded」の無限ループになるため、useCallback で安定化する。
  const handleSlot = useCallback((childSlotInfo: SlotInfo, view: View) => {
    setSlotPicker({ slotInfo: childSlotInfo, view });
  }, []);

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
            onSlotInfo={handleSlot}
          />
          <TimesUpdateButton timeChangeEvents={movedEvents} />
          <DialogOnSlot slotInfo={slotPicker.slotInfo} view={slotPicker.view} />
        </Box>
      </Tabs.Panel>
      <Tabs.Panel value='tab2'>
        <GroupHorizonTimeline />
      </Tabs.Panel>
    </Tabs>
  );
}
