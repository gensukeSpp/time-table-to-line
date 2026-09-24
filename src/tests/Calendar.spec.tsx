import { act, render, waitFor } from '@testing-library/react';
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

  it('隣接する月ビューイベントに左右の EW アンカーをそれぞれ生成する', () => {
    const day = startOfDay(new Date(2026, 8, 16));
    const adjacentEvents: TimelineEventProps[] = [
      {
        id: 20,
        title: 'Left Full Day',
        start_time: day,
        end_time: endOfDay(day),
        staff_id: 1,
        group: 1,
        admin: false,
      },
      {
        id: 21,
        title: 'Right Full Day',
        start_time: startOfDay(new Date(2026, 8, 17)),
        end_time: endOfDay(new Date(2026, 8, 17)),
        staff_id: 1,
        group: 1,
        admin: false,
      },
    ];

    const { container } = render(
      <DnDCalendar
        localizer={localizer}
        date={day}
        view="month"
        events={adjacentEvents}
        startAccessor="start_time"
        endAccessor="end_time"
        allDayAccessor={() => true}
        draggableAccessor={() => true}
        resizableAccessor={() => true}
        resizable
      />
    );

    for (const title of ['Left Full Day', 'Right Full Day']) {
      const event = Array.from(container.querySelectorAll('.rbc-event')).find(
        (element) => element.textContent?.includes(title)
      );
      expect(event).toBeDefined();
      expect(event?.querySelectorAll('.rbc-addons-dnd-resize-ew-anchor')).toHaveLength(2);
    }
  });
});

// 以降に MyCalendar コンポーネントのテストを追記
import { vi, type Mock } from 'vitest';
import { endOfDay, setHours, startOfDay } from 'date-fns';
import { MantineProvider } from '@mantine/core';
import { MyCalendar } from '../components/pages/CalendarView';

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

describe('MyCalendar (CalendarView)', () => {
  // テストデータ（時刻が重複しないように修正）
  const mockEvents: TimelineEventProps[] = [
    { id: 1, title: 'My Event 1', start_time: setHours(startOfDay(new Date()), 9), end_time: setHours(startOfDay(new Date()), 10), staff_id: 1, group: 1, admin: false },
    { id: 2, title: 'Another User Event', start_time: setHours(startOfDay(new Date()), 11), end_time: setHours(startOfDay(new Date()), 12), staff_id: 2, group: 2, admin: false },
    { id: 3, title: 'My Event 2', start_time: setHours(startOfDay(new Date()), 13), end_time: new Date(), staff_id: 1, group: 1, admin: false },
  ];
  const mockAuthId = 1;
  const { Default, WithEventClick } = composeStories<typeof import('../stories/Calendar.stories')>(stories);
  type PlayCtx = Parameters<NonNullable<typeof WithEventClick.play>>[0];

  // 各テストの前にフックのデフォルトの戻り値を設定
  beforeEach(() => {
    (useAuthInfo as Mock).mockReturnValue({
      type: 'auth',
      authId: mockAuthId,
      code: 1,
      group: 'group 1',
    });
    (useSearchQuery as Mock).mockReturnValue({ data: mockAuthId.toString() });
    (useEventsState as Mock).mockReturnValue(mockEvents);
    (useMouseEvents as Mock).mockReturnValue({
      onEventResize: vi.fn(),
      onEventDrop: vi.fn(),
      eventList: [],
      // prevRef: { current: undefined }, pr-13-review
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
    console.log(eventTitles); // eslint-disable-line no-console
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

  // --- pr-32-review 指摘2: allDayAccessor の描画経路 ---
  // （slot 選択通知のライフサイクルは CalendarView.spec.tsx（Calendar mock）で検証）
  it('フルデイイベントは all-day バンドに描画され、時間イベントは載らない', () => {
    const day = new Date();
    // MyCalendar は stateAll.length > 2 のときのみフィルタ表示するため 3 件用意する
    const fullDayEvents: TimelineEventProps[] = [
      { id: 10, title: 'Full Day Event', start_time: startOfDay(day), end_time: endOfDay(day), staff_id: 1, group: 1, admin: false },
      { id: 11, title: 'Timed Event', start_time: setHours(startOfDay(day), 9), end_time: setHours(startOfDay(day), 10), staff_id: 1, group: 1, admin: false },
      { id: 12, title: 'Other User Event', start_time: setHours(startOfDay(day), 13), end_time: setHours(startOfDay(day), 14), staff_id: 2, group: 2, admin: false },
    ];
    (useEventsState as Mock).mockReturnValue(fullDayEvents);
    const { container } = render(<MantineProvider><MyCalendar onTimeChangeEvents={() => { }} onSlotInfo={() => { }} /></MantineProvider>);
    // allDayAccessor が true を返したイベントのみ all-day バンド（.rbc-allday-cell）に載る
    const alldayCell = container.querySelector('.rbc-allday-cell');
    expect(alldayCell).not.toBeNull();
    expect(alldayCell!.textContent).toContain('Full Day Event');
    expect(alldayCell!.textContent).not.toContain('Timed Event');
  });
});

