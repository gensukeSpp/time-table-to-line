import { act, render, waitFor, within } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import { expect } from 'vitest';

import { Calendar } from "react-big-calendar";
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'

import { TimelineEventProps } from "../lib/TimelineType";
import localizer from "../lib/Localization";
import { exEvents } from "../lib/SampleState";
import * as stories from '../stories/Calendar.stories';

const DnDCalendar = withDragAndDrop(Calendar<TimelineEventProps>);
describe('Calendar', () => {
  it('通常のレンダー', () => {
    const screen = render(
      <DnDCalendar
        localizer={localizer}
        events={exEvents}
        defaultView='day'
      />);
    const buttonElements = screen.getAllByRole('button');
    const expectElms = buttonElements.filter(value => {
      if (value.className == 'rbc-event') {
        return value;
      }
    });
    // console.log('Role button: ', buttonElements);
    expect(expectElms.length).toBe(3);
  });
});

// 以降に MyCalendar コンポーネントのテストを追記
import { vi, type Mock } from 'vitest';
import { setHours, startOfDay } from 'date-fns';
import { MantineProvider } from '@mantine/core';
import { MyCalendar } from '../components/pages/CalendarComponent';

// Hooksをモック
vi.mock('../hooks/useAuthGuard', () => ({
  useAuthInfo: vi.fn(),
}));
vi.mock('../hooks/useContextFamily', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../hooks/useContextFamily')>();
  return { ...mod, useEventsState: vi.fn() };
});
vi.mock('../resources/queries', () => ({
  useSearchQuery: vi.fn(),
}));
vi.mock('../hooks/useMouseHandle', () => ({
  useMouseEvents: vi.fn(),
}));
vi.mock('../hooks/useCallingForm', () => ({
  useCallingEditForm: vi.fn(),
}));

// モックするフックをインポート
import { useAuthInfo } from '../hooks/useAuthGuard';
import { useEventsState } from '../hooks/useContextFamily';
import { useSearchQuery } from '../resources/queries';
import { useMouseEvents } from '../hooks/useMouseHandle';
import { useCallingEditForm } from '../hooks/useCallingForm';

describe('MyCalendar (CalendarComponent)', () => {
  // テストデータ（時刻が重複しないように修正）
  const mockEvents: TimelineEventProps[] = [
    { id: 1, title: 'My Event 1', start_time: setHours(startOfDay(new Date()), 9), end_time: setHours(startOfDay(new Date()), 10), staff_id: 1, group: 1 },
    { id: 2, title: 'Another User Event', start_time: setHours(startOfDay(new Date()), 11), end_time: setHours(startOfDay(new Date()), 12), staff_id: 2, group: 2 },
    { id: 3, title: 'My Event 2', start_time: setHours(startOfDay(new Date()), 13), end_time: new Date(), staff_id: 1, group: 1 },
  ];
  const mockAuthId = 1;
  const { Default, WithEventClick } = composeStories<typeof import('../stories/Calendar.stories')>(stories);
  type PlayCtx = Parameters<NonNullable<typeof WithEventClick.play>>[0];

  // 各テストの前にフックのデフォルトの戻り値を設定
  beforeEach(() => {
    (useAuthInfo as Mock).mockReturnValue({ authId: mockAuthId });
    (useSearchQuery as Mock).mockReturnValue({ data: mockAuthId.toString() });
    (useEventsState as Mock).mockReturnValue(mockEvents);
    (useMouseEvents as Mock).mockReturnValue({
      onEventResize: vi.fn(),
      onEventDrop: vi.fn(),
      eventList: [],
      prevRef: { current: undefined },
    });
    (useCallingEditForm as Mock).mockReturnValue({
      handleSelectEvent: vi.fn(),
      EditForm: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      modal: { showModal: false, closeInputForm: vi.fn() },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('通常のレンダー from story', () => {
    const screen = render(<Default />);
    const buttonElements = screen.getAllByRole('button');
    const expectElms = buttonElements.filter(value => {
      if (value.className == 'rbc-event') {
        return value;
      }
    });
    // console.log('Role button: ', buttonElements);
    expect(expectElms.length).toBe(2);
  });
  // TODO: このテストは Storybook composeStories と vi.mock の干渉により pending
  // 別タスクでテスト設定を整理する際に修正する
  it.skip('イベントクリックで編集フォームが表示されることのテスト', async () => {
    const { container, getByText, getAllByTestId } = render(<WithEventClick />);
    await waitFor(() => {
      expect(getByText(/'My Event 1'/i, { exact: false })).toBeInTheDocument();
      expect(getByText(/'My Event 2'/i, { exact: false })).toBeInTheDocument();
      expect(getByText(/'Another User Event'/i, { exact: false })).toBeInTheDocument();
    });
    await act(() => {
      WithEventClick.play?.({ canvasElement: container } as PlayCtx);
      expect(getAllByTestId('edit-form'));
    });
  });

  // テストをasyncに変更
  it('自身のAuthIdに紐づくイベントのみをフィルタして表示すること', async () => {
    // useEventsStateがテストデータを返すように設定
    (useEventsState as Mock).mockReturnValue(mockEvents);

    const { container } = render(<MantineProvider><MyCalendar onTimeChangeEvents={() => { }} onSlotInfo={() => { }} /></MantineProvider>);

    // rbc-eventクラスを持つ要素が2つ表示されるのを待つ
    // findBy* クエリは要素が見つかるまで最大1000ms待機します
    const renderedEvents = await waitFor(() => {
      const elements = container.querySelectorAll('.rbc-event');
      if (elements.length !== 2) {
        throw new Error('Expected 2 events to be rendered');
      }
      return elements;
    });

    // User 1 のイベントは2つなので、表示されるイベントも2つであるべき
    expect(renderedEvents.length).toBe(2);

    // 表示されているイベントのタイトルが正しいことを確認
    const eventTitles = Array.from(renderedEvents).map(el => el.textContent);
    console.log(eventTitles);
    expect(eventTitles[0]).toContain('My Event 1');
    expect(eventTitles[1]).toContain('My Event 2');
    expect(eventTitles).not.toContain('Another User Event');
  });

  it('表示すべきイベントがない場合でも、クラッシュせずに正常にレンダリングされること', () => {
    // useEventsStateが空の配列を返すように設定
    (useEventsState as Mock).mockReturnValue([]);

    const { container } = render(<MantineProvider><MyCalendar onTimeChangeEvents={() => { }} onSlotInfo={() => { }} /></MantineProvider>);

    // イベントがないので、rbc-eventクラスを持つ要素は存在しないはず
    const renderedEvents = container.querySelectorAll('.rbc-event');
    expect(renderedEvents.length).toBe(0);
  });
});

