import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';

import { EventDetailOverlay } from '../components/organisms/EventDetailOverlay';
import { TimelineEventProps } from '../lib/TimelineType';
import { AuthStateContext } from '../hooks/useContextFamily';

const authToken = 'valid-token';
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, retry: false } },
});

const event: TimelineEventProps = {
  id: 1,
  group: 2,
  staff_id: 500,
  admin: false,
  title: 'other event',
  summary: '内容サマリー',
  progress: 'almost',
  start_time: new Date(),
  end_time: new Date(new Date().getTime() + 3600000),
  start: new Date(),
  end: new Date(new Date().getTime() + 3600000),
};

const renderOverlay = (onClose: () => void) =>
  render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <AuthStateContext.Provider value={{ type: 'token', accessToken: authToken }}>
          <EventDetailOverlay event={event} position={{ top: 10, left: 10 }} readOnly onClose={onClose} />
        </AuthStateContext.Provider>
      </QueryClientProvider>
    </MantineProvider>
  );

describe('EventDetailOverlay (閉じる UX)', () => {
  it('オーバーレイ外をクリックすると onClose が呼ばれる', () => {
    const onClose = vi.fn();
    renderOverlay(onClose);

    // オーバーレイ内クリックでは閉じない
    fireEvent.mouseDown(screen.getByText('other event'));
    expect(onClose).not.toHaveBeenCalled();

    // 外側（document 直下）クリックで閉じる
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape キーで onClose が呼ばれる', () => {
    const onClose = vi.fn();
    renderOverlay(onClose);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('その他のキーでは閉じない', () => {
    const onClose = vi.fn();
    renderOverlay(onClose);

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
