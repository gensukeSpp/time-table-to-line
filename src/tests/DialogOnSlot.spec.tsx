import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { endOfDay, setHours, startOfDay } from 'date-fns';
import type { SlotInfo } from 'react-big-calendar';

// pr-32-review 指摘2:
// DialogOnSlot → TitleInput の統合経路を検証する。
// - view='month' が TitleInput の payload（end_time = endOfDay）に到達すること
// - view='week' では従来どおり resolveSlotEnd（+1h）になること
// - close が onClose（親 state 反映）を呼ぶこと（指摘1）
const { mutateMock, onCloseMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  onCloseMock: vi.fn(),
}));

vi.mock('../hooks/useEventMutation', () => ({
  useCreateMutation: () => ({ mutate: mutateMock }),
}));
vi.mock('../hooks/useContextFamily', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../hooks/useContextFamily')>();
  return {
    ...mod,
    // TitleInput は onSubmit で eventsState.slice(-1)[0].id を参照する（既存ロジック）。
    useEventsState: () => [{ id: 1 }],
  };
});
vi.mock('../hooks/useAuthGuard', () => ({
  useAuthInfo: () => ({ type: 'auth', authId: 201, code: 1, group: '栃介', admin: false }),
}));

import { DialogOnSlot } from '../components/organisms/DialogOnSlot';

const makeSlotInfo = (start: Date, end: Date): SlotInfo => ({
  start,
  end,
  slots: [start],
  action: 'select',
});

const renderDialog = (slotInfo: SlotInfo, view: 'month' | 'week') =>
  render(
    <MantineProvider>
      <DialogOnSlot slotInfo={slotInfo} view={view} onClose={onCloseMock} />
    </MantineProvider>
  );

const submitTitle = (title: string) => {
  fireEvent.change(screen.getByPlaceholderText('やることを入力してください'), { target: { value: title } });
  fireEvent.click(screen.getByRole('button', { name: '追加' }));
  return mutateMock.mock.calls[0][0];
};

describe('DialogOnSlot (view → TitleInput payload / close → onClose)', () => {
  beforeEach(() => {
    mutateMock.mockClear();
    onCloseMock.mockClear();
  });

  it('view=month なら TitleInput の end_time が endOfDay になる（view 伝播）', () => {
    const start = startOfDay(new Date(2026, 8, 16));
    renderDialog(makeSlotInfo(start, setHours(start, 1)), 'month');
    const payload = submitTitle('month event');
    expect(payload.end_time).toEqual(endOfDay(start));
  });

  it('view=week なら end_time が +1h（resolveSlotEnd）になる', () => {
    const start = setHours(startOfDay(new Date(2026, 8, 16)), 9);
    renderDialog(makeSlotInfo(start, setHours(start, 10)), 'week');
    const payload = submitTitle('week event');
    expect(payload.end_time).toEqual(setHours(start, 10));
  });

  it('close ボタンで onClose が呼ばれる（親 state 反映）', () => {
    const start = startOfDay(new Date(2026, 8, 16));
    renderDialog(makeSlotInfo(start, setHours(start, 1)), 'week');
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
