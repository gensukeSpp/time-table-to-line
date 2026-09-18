import { describe, expect, it, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { act, render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { endOfDay, setHours, startOfDay } from 'date-fns';
import type { SlotInfo, View } from 'react-big-calendar';

import type { TimelineEventProps } from '../lib/TimelineType';

// pr-32-review 指摘1・2:
// RBC 本体の slot 選択（Selection）は座標計算（document.elementFromPoint /
// boundingRect）に依存し jsdom で動かないため、Calendar をスタブに置き換えて
// MyCalendar のロジック（debounce・view 保存・通知ライフサイクル・allDayAccessor）を
// 直接検証する。実 RBC の描画（.rbc-allday-cell 配置）は Calendar.spec.tsx で検証する。
const stubRegistry = vi.hoisted(() => ({
  props: null as Record<string, unknown> | null,
}));

vi.mock('react-big-calendar', async (importOriginal) => {
  const React = await import('react');
  const mod = await importOriginal<typeof import('react-big-calendar')>();
  // 型引数付き呼び出し Calendar<TimelineEventProps> を成立させるためのダミー型パラメータ
  const CalendarStub = function CalendarStub<_T = unknown>(props: Record<string, unknown>) {
    stubRegistry.props = props;
    return React.createElement('div', { 'data-testid': 'rbc-stub' });
  };
  return { ...mod, Calendar: CalendarStub };
});

// DnD HOC は identity にする（Selection の座標計算を回避）
vi.mock('react-big-calendar/lib/addons/dragAndDrop', () => ({
  default: (Component: unknown) => Component,
}));

vi.mock('../hooks/useAuthGuard', () => ({
  useAuthInfo: vi.fn(),
}));
vi.mock('../hooks/useContextFamily', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../hooks/useContextFamily')>();
  return { ...mod, useEventsState: vi.fn() };
});
vi.mock('../hooks/useMouseHandle', () => ({
  useMouseEvents: vi.fn(),
}));
vi.mock('../hooks/useCallingForm', () => ({
  useCallingEditForm: vi.fn(),
}));

import { MyCalendar } from '../components/pages/CalendarView';
import { useAuthInfo } from '../hooks/useAuthGuard';
import { useEventsState } from '../hooks/useContextFamily';
import { useMouseEvents } from '../hooks/useMouseHandle';
import { useCallingEditForm } from '../hooks/useCallingForm';

const makeSlotInfo = (start: Date, end: Date): SlotInfo => ({
  start,
  end,
  slots: [start],
  action: 'select',
});

const fireSelectSlot = (slotInfo: SlotInfo) => {
  (stubRegistry.props!.onSelectSlot as (s: SlotInfo) => void)(slotInfo);
};

const fireView = (view: View) => {
  (stubRegistry.props!.onView as (v: View) => void)(view);
};

describe('MyCalendar slot selection lifecycle (pr-32-review)', () => {
  const onSlotInfoMock = vi.fn();

  const renderCalendar = () =>
    render(
      <MantineProvider>
        <MyCalendar onTimeChangeEvents={() => { }} onSlotInfo={onSlotInfoMock} />
      </MantineProvider>
    );

  beforeEach(() => {
    stubRegistry.props = null;
    onSlotInfoMock.mockClear();
    (useAuthInfo as Mock).mockReturnValue({ type: 'auth', authId: 1, code: 1, group: 'group 1' });
    (useEventsState as Mock).mockReturnValue([]);
    (useMouseEvents as Mock).mockReturnValue({
      onEventResize: vi.fn(),
      onEventDrop: vi.fn(),
      eventList: [],
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

  it('初回マウント時（slot 未選択）は onSlotInfo を呼ばない', () => {
    renderCalendar();
    expect(onSlotInfoMock).not.toHaveBeenCalled();
  });

  it('slot 選択で onSlotInfo が選択時点の view 付きで 1 回呼ばれる', () => {
    vi.useFakeTimers();
    try {
      renderCalendar();
      const slotInfo = makeSlotInfo(setHours(startOfDay(new Date()), 9), setHours(startOfDay(new Date()), 10));
      act(() => { fireSelectSlot(slotInfo); });
      // 250ms の debounce を進める
      act(() => { vi.advanceTimersByTime(300); });
      expect(onSlotInfoMock).toHaveBeenCalledTimes(1);
      expect(onSlotInfoMock).toHaveBeenCalledWith(slotInfo, 'week');
    } finally {
      vi.useRealTimers();
    }
  });

  it('view 切替後も onSlotInfo は再通知されない（過去の選択の再送信抑止）', () => {
    vi.useFakeTimers();
    try {
      renderCalendar();
      const slotInfo = makeSlotInfo(setHours(startOfDay(new Date()), 9), setHours(startOfDay(new Date()), 10));
      act(() => { fireSelectSlot(slotInfo); });
      act(() => { vi.advanceTimersByTime(300); });
      expect(onSlotInfoMock).toHaveBeenCalledTimes(1);
      // toolbar で view を Month → Week に切り替えても再通知されない
      act(() => { fireView('month'); });
      act(() => { fireView('week'); });
      expect(onSlotInfoMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('month ビューで slot 選択すると view=month で通知される', () => {
    vi.useFakeTimers();
    try {
      renderCalendar();
      act(() => { fireView('month'); });
      const slotInfo = makeSlotInfo(startOfDay(new Date()), endOfDay(new Date()));
      act(() => { fireSelectSlot(slotInfo); });
      act(() => { vi.advanceTimersByTime(300); });
      expect(onSlotInfoMock).toHaveBeenCalledTimes(1);
      expect(onSlotInfoMock).toHaveBeenCalledWith(slotInfo, 'month');
    } finally {
      vi.useRealTimers();
    }
  });

  it('allDayAccessor はフルデイイベントに true、通常イベントに false を返す', () => {
    renderCalendar();
    const allDayAccessor = stubRegistry.props!.allDayAccessor as (e: TimelineEventProps) => boolean;
    const day = new Date(2026, 8, 16);
    expect(allDayAccessor({ start_time: startOfDay(day), end_time: endOfDay(day) } as TimelineEventProps)).toBe(true);
    expect(allDayAccessor({ start_time: setHours(startOfDay(day), 9), end_time: setHours(startOfDay(day), 10) } as TimelineEventProps)).toBe(false);
  });

  it('アクセサは month ビューで時間イベントの DnD を無効化する', () => {
    renderCalendar();
    const day = new Date(2026, 8, 16);
    const timed = {
      start_time: setHours(startOfDay(day), 9),
      end_time: setHours(startOfDay(day), 10),
    } as TimelineEventProps;
    const fullday = {
      start_time: startOfDay(day),
      end_time: endOfDay(day),
    } as TimelineEventProps;
    // フルデイを month で伸長した後の日跨ぎ（マルチデイ）イベント
    const multiDay = {
      start_time: startOfDay(day),
      end_time: startOfDay(new Date(2026, 8, 18)),
    } as TimelineEventProps;

    // 既定 view は week → 時間イベントも操作可
    let props = stubRegistry.props as {
      draggableAccessor: (e: TimelineEventProps) => boolean;
      resizableAccessor: (e: TimelineEventProps) => boolean;
    };
    expect(props.draggableAccessor(timed)).toBe(true);
    expect(props.resizableAccessor(timed)).toBe(true);

    // month に切替 → 時間イベント(単日)だけ操作不可、フルデイ・日跨ぎは可
    act(() => { fireView('month'); });
    props = stubRegistry.props as {
      draggableAccessor: (e: TimelineEventProps) => boolean;
      resizableAccessor: (e: TimelineEventProps) => boolean;
    };
    expect(props.draggableAccessor(timed)).toBe(false);
    expect(props.resizableAccessor(timed)).toBe(false);
    expect(props.draggableAccessor(fullday)).toBe(true);
    expect(props.resizableAccessor(fullday)).toBe(true);
    expect(props.draggableAccessor(multiDay)).toBe(true);
    expect(props.resizableAccessor(multiDay)).toBe(true);
  });
});
