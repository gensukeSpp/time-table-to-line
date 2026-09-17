import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { endOfDay, startOfDay } from 'date-fns';
import { resolveSlotEnd } from '../lib/slot';

const { mutateMock } = vi.hoisted(() => ({ mutateMock: vi.fn() }));

vi.mock('../hooks/useEventMutation', () => ({
  useCreateMutation: () => ({ mutate: mutateMock }),
}));
vi.mock('../hooks/useContextFamily', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../hooks/useContextFamily')>();
  return {
    ...mod,
    // TitleInput は onSubmit で eventsState.slice(-1)[0].id を参照する（既存ロジック）。
    // id のみ持つスタブを返し、作成ペイロード検証に集中させる。
    useEventsState: () => [{ id: 1 }],
  };
});

import { TitleInput } from '../components/organisms/InputTitleDialog';
import { AuthInfoProp } from '../lib/TimelineType';

const authInfo: AuthInfoProp = { type: 'auth', authId: 201, code: 1, group: '栃介', admin: false };

const renderWith = (slotStartTime: Date, isMonth: boolean) => {
  mutateMock.mockClear();
  render(
    <MantineProvider>
      <TitleInput authInfo={authInfo} slotStartTime={slotStartTime} isMonth={isMonth} closeDialog={() => {}} />
    </MantineProvider>
  );
};

const submit = () => {
  fireEvent.click(screen.getByRole('button', { name: '追加' }));
  return mutateMock.mock.calls[0][0];
};

describe('TitleInput (month / week branch)', () => {
  it('isMonth=true なら end_time が同日 endOfDay（23:59:59.999）になる', () => {
    const start = startOfDay(new Date(2026, 8, 16));
    renderWith(start, true);
    const payload = submit();
    expect(payload.start_time).toBe(start);
    expect(payload.end_time).toEqual(endOfDay(start));
  });

  it('isMonth=false なら従来どおり resolveSlotEnd（+1h）になる', () => {
    const start = startOfDay(new Date(2026, 8, 16));
    renderWith(start, false);
    const payload = submit();
    expect(payload.start_time).toBe(start);
    expect(payload.end_time).toEqual(resolveSlotEnd(start));
  });
});